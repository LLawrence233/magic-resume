import { NextResponse } from "next/server";
import { AIModelType } from "@/config/ai";
import { AI_MODEL_CONFIGS } from "@/config/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, model, content, modelType, apiEndpoint } = body;

    const modelConfig = AI_MODEL_CONFIGS[modelType as AIModelType];
    if (!modelConfig) {
      throw new Error("Invalid model type");
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
            content: `你是一个专业的简历优化助手。请帮助优化以下文本，使其更加专业和有吸引力。

              优化原则：
              1. 使用更专业的词汇和表达方式
              2. 突出关键成就和技能
              3. 保持简洁清晰
              4. 使用主动语气
              5. 保持原有信息的完整性
              6. 保留我输入的格式

              请直接返回优化后的文本，不要包含任何解释或其他内容。`,
          },
          {
            role: "user",
            content,
          },
        ],
        stream: true,
      }),
    });

    // 检查上游 API 响应状态码
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        errorDetail = errorJson.error?.message || errorJson.message || errorBody;
      } catch {
        // ignore
      }
      return NextResponse.json(
        {
          error: `API 请求失败 (${response.status})`,
          detail: errorDetail,
          hint: "请检查 API Key、Endpoint 地址和模型名称是否正确",
        },
        { status: 502 }
      );
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
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.includes("[DONE]")) continue;
              if (!line.startsWith("data:")) continue;

              try {
                const data = JSON.parse(line.slice(5));
                if (data.error) {
                  controller.enqueue(encoder.encode(
                    `\n[错误] ${data.error.message || JSON.stringify(data.error)}`
                  ));
                  controller.close();
                  return;
                }
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  hasContent = true;
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                const rawLine = line.slice(0, 200);
                if (rawLine.length > 10) {
                  errorBuffer.push(rawLine);
                }
              }
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          controller.enqueue(encoder.encode(`\n[错误] 流式读取中断: ${message}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Polish error:", error);
    return NextResponse.json(
      { error: "Failed to polish content" },
      { status: 500 }
    );
  }
}

export const runtime = "edge";
