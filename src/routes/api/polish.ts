import { createFileRoute } from "@tanstack/react-router";
import { AIModelType, AI_MODEL_CONFIGS } from "@/config/ai";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";

export const Route = createFileRoute("/api/polish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { apiKey, model, content, modelType, apiEndpoint, customInstructions } = body as {
            apiKey: string;
            model: string;
            content: string;
            modelType: AIModelType;
            apiEndpoint?: string;
            customInstructions?: string;
          };

          const modelConfig = AI_MODEL_CONFIGS[modelType as AIModelType];
          if (!modelConfig) {
            throw new Error("Invalid model type");
          }

          let systemPrompt = `你是一个专业的简历优化助手。请帮助优化以下 Markdown 格式的文本，使其更加专业和有吸引力。

              优化原则：
              1. 使用更专业的词汇和表达方式
              2. 突出关键成就和技能
              3. 保持简洁清晰
              4. 使用主动语气
              5. 保持原有信息的完整性
              6. 严格保留原有的 Markdown 格式结构（列表项保持为列表项，加粗保持加粗等）

              请直接返回优化后的 Markdown 文本，不要包含任何解释或其他内容。`;

          if (customInstructions?.trim()) {
            systemPrompt += `\n\n用户额外要求：\n${customInstructions.trim()}`;
          }

          if (modelType === "gemini") {
            const geminiModel = model || "gemini-flash-latest";
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: geminiModel,
              systemInstruction: systemPrompt,
              generationConfig: {
                temperature: 0.4,
              },
            });

            const encoder = new TextEncoder();

            const stream = new ReadableStream({
              async start(controller) {
                try {
                  const result = await modelInstance.generateContentStream(content);
                  for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                      controller.enqueue(encoder.encode(chunkText));
                    }
                  }
                } catch (error) {
                  controller.error(error);
                  return;
                }
                controller.close();
              },
            });

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive"
              }
            });
          }

          const requestUrl = modelConfig.url(apiEndpoint);
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: modelConfig.headers(apiKey),
            body: JSON.stringify({
              model: modelConfig.requiresModelId ? model : modelConfig.defaultModel,
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content
                }
              ],
              stream: true
            })
          });

          // 检查上游 API 响应状态码
          if (!response.ok) {
            let errorDetail = `HTTP ${response.status}`;
            try {
              const errorBody = await response.text();
              const errorJson = JSON.parse(errorBody);
              errorDetail = errorJson.error?.message || errorJson.message || errorBody;
            } catch {
              // 响应体不是 JSON，使用状态码
            }
            return Response.json(
              {
                error: `API 请求失败 (${response.status})`,
                detail: errorDetail,
                url: requestUrl.replace(/\/api_key=.*/, "/***"),
                hint: "请检查 API Key、Endpoint 地址和模型名称是否正确"
              },
              { status: 502 }
            );
          }

          // 检查 Content-Type 是否为 SSE 流
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("text/event-stream") && !contentType.includes("application/octet-stream") && !contentType.includes("text/plain")) {
            // 上游返回了非流式响应，可能是错误信息
            try {
              const body = await response.text();
              return Response.json(
                {
                  error: "API 返回了非预期的响应格式",
                  detail: body.substring(0, 500),
                  hint: "请检查 Endpoint 是否支持流式输出 (stream: true)"
                },
                { status: 502 }
              );
            } catch {
              // 忽略读取失败
            }
          }

          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              if (!response.body) {
                controller.enqueue(encoder.encode("\n[错误] API 未返回响应体，请检查接口配置"));
                controller.close();
                return;
              }

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let hasContent = false;
              const errorBuffer: string[] = [];

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    // 流结束但没有任何内容，发送错误提示
                    if (!hasContent && errorBuffer.length > 0) {
                      controller.enqueue(encoder.encode(
                        `\n[错误] 未能解析 API 响应。原始数据片段：${errorBuffer.slice(0, 3).join(" | ")}`
                      ));
                    } else if (!hasContent) {
                      controller.enqueue(encoder.encode(
                        "\n[错误] API 返回了空内容，请检查模型名称和 API Key 是否有效"
                      ));
                    }
                    controller.close();
                    break;
                  }

                  const chunk = decoder.decode(value);
                  const lines = chunk.split("\n").filter((line) => line.trim() !== "");

                  for (const line of lines) {
                    if (line.includes("[DONE]")) continue;
                    if (!line.startsWith("data:")) continue;

                    try {
                      const data = JSON.parse(line.slice(5));

                      // 检查是否是错误响应
                      if (data.error) {
                        controller.enqueue(encoder.encode(
                          `\n[错误] ${data.error.message || JSON.stringify(data.error)}`
                        ));
                        controller.close();
                        return;
                      }

                      const deltaContent = data.choices?.[0]?.delta?.content;
                      if (deltaContent) {
                        hasContent = true;
                        controller.enqueue(encoder.encode(deltaContent));
                      }
                    } catch (e) {
                      // 记录无法解析的数据片段用于调试
                      const rawLine = line.slice(0, 200);
                      if (rawLine.length > 10) {
                        errorBuffer.push(rawLine);
                      }
                    }
                  }
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : "未知错误";
                controller.enqueue(encoder.encode(
                  `\n[错误] 流式读取中断: ${message}`
                ));
                controller.close();
              }
            }
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive"
            }
          });
        } catch (error) {
          console.error("Polish error:", error);
          return Response.json(
            { error: formatGeminiErrorMessage(error) },
            { status: 500 }
          );
        }
      }
    }
  }
});
