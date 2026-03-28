import { createFileRoute } from "@tanstack/react-router";
import { AIModelType, AI_MODEL_CONFIGS } from "@/config/ai";

interface TestConnectionRequest {
  modelType: AIModelType;
  apiKey: string;
  modelId?: string;
  apiEndpoint?: string;
}

export const Route = createFileRoute("/api/ai/test-connection")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as TestConnectionRequest;
          const { modelType, apiKey, modelId, apiEndpoint } = body;

          // Validate required fields
          if (!apiKey) {
            return Response.json(
              { success: false, error: "API Key is required" },
              { status: 400 }
            );
          }

          const modelConfig = AI_MODEL_CONFIGS[modelType];
          if (!modelConfig) {
            return Response.json(
              { success: false, error: "Invalid model type" },
              { status: 400 }
            );
          }

          // For models that require modelId
          if (modelConfig.requiresModelId && !modelId) {
            return Response.json(
              { success: false, error: "Model ID is required" },
              { status: 400 }
            );
          }

          // For OpenAI compatible, endpoint is required
          if (modelType === "openai" && !apiEndpoint) {
            return Response.json(
              { success: false, error: "API Endpoint is required" },
              { status: 400 }
            );
          }

          let testUrl: string;
          let testBody: Record<string, unknown>;
          let headers: Record<string, string>;

          switch (modelType) {
            case "gemini":
              // Gemini uses a different API structure - key in URL
              testUrl = `${modelConfig.url()}/models/${modelId}:generateContent?key=${apiKey}`;
              headers = { "Content-Type": "application/json" };
              testBody = {
                contents: [
                  {
                    parts: [{ text: "Hi" }],
                  },
                ],
                generationConfig: {
                  maxOutputTokens: 10,
                },
              };
              break;

            default:
              // OpenAI-compatible APIs (DeepSeek, Doubao, OpenAI)
              testUrl = modelConfig.url(apiEndpoint);
              headers = modelConfig.headers(apiKey);
              testBody = {
                model: modelConfig.requiresModelId
                  ? modelId
                  : modelConfig.defaultModel,
                messages: [
                  {
                    role: "user",
                    content: "Hi",
                  },
                ],
                max_tokens: 10,
              };
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

          try {
            const response = await fetch(testUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(testBody),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = `HTTP ${response.status}`;

              try {
                const errorJson = JSON.parse(errorText);
                errorMessage =
                  errorJson.error?.message ||
                  errorJson.message ||
                  errorMessage;
              } catch {
                // Use raw error text if JSON parsing fails
                if (errorText) {
                  errorMessage = errorText.slice(0, 200);
                }
              }

              return Response.json({
                success: false,
                error: errorMessage,
              });
            }

            // For successful responses, we don't need to parse the full content
            // Just confirm the API accepted our request
            return Response.json({
              success: true,
              message: "Connection successful",
            });
          } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError instanceof Error) {
              if (fetchError.name === "AbortError") {
                return Response.json({
                  success: false,
                  error: "Connection timeout (30s)",
                });
              }
              return Response.json({
                success: false,
                error: fetchError.message,
              });
            }

            return Response.json({
              success: false,
              error: "Unknown connection error",
            });
          }
        } catch (error) {
          console.error("AI test connection error:", error);
          return Response.json(
            { success: false, error: "Failed to test connection" },
            { status: 500 }
          );
        }
      },
    },
  },
});
