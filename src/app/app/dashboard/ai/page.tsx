import { useEffect, useState, Suspense } from "react";
import { Check, ExternalLink, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DeepSeekLogo from "@/components/ai/icon/IconDeepseek";
import IconDoubao from "@/components/ai/icon/IconDoubao";
import IconZhipu from "@/components/ai/icon/IconZhipu";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { cn } from "@/lib/utils";
import IconOpenAi from "@/components/ai/icon/IconOpenAi";
import { toast } from "sonner";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

const AISettingsContent = () => {
  const {
    requireGeminiConfig,
    setRequireGeminiConfig,
  } = useAIConfigStore();

  const {
    doubaoApiKey,
    doubaoModelId,
    deepseekApiKey,
    openaiApiKey,
    openaiModelId,
    openaiApiEndpoint,
    geminiApiKey,
    geminiModelId,
    zhipuApiKey,
    zhipuModelId,
    setDoubaoApiKey,
    setDoubaoModelId,
    setDeepseekApiKey,
    setOpenaiApiKey,
    setOpenaiModelId,
    setOpenaiApiEndpoint,
    setGeminiApiKey,
    setGeminiModelId,
    setZhipuApiKey,
    setZhipuModelId,
    selectedModel,
    setSelectedModel,
  } = useAIConfigStore();
  const [currentModel, setCurrentModel] = useState(selectedModel);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [connectionError, setConnectionError] = useState<Record<string, string>>({});

  const t = useTranslations();

  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  // 当从 PDF 导入跳转过来时，自动切换到需要的模型
  useEffect(() => {
    if (requireGeminiConfig) {
      setCurrentModel("gemini");
      // 清除标志，避免刷新页面时仍然显示提示
      setRequireGeminiConfig(false);
    }
  }, [requireGeminiConfig, setRequireGeminiConfig]);

  const handleApiKeyChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "doubao" | "deepseek" | "openai" | "gemini" | "zhipu"
  ) => {
    const newApiKey = e.target.value;
    if (type === "doubao") {
      setDoubaoApiKey(newApiKey);
    } else if (type === "deepseek") {
      setDeepseekApiKey(newApiKey);
    } else if (type === "gemini") {
      setGeminiApiKey(newApiKey);
    } else if (type === "zhipu") {
      setZhipuApiKey(newApiKey);
    } else {
      setOpenaiApiKey(newApiKey);
    }
  };

  const handleModelIdChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "doubao" | "deepseek" | "openai" | "gemini" | "zhipu"
  ) => {
    const newModelId = e.target.value;
    if (type === "doubao") {
      setDoubaoModelId(newModelId);
    } else if (type === "openai") {
      setOpenaiModelId(newModelId);
    } else if (type === "gemini") {
      setGeminiModelId(newModelId);
    } else if (type === "zhipu") {
      setZhipuModelId(newModelId);
    }
  };

  const handleApiEndpointChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "openai"
  ) => {
    const newApiEndpoint = e.target.value;
    if (type === "openai") {
      setOpenaiApiEndpoint(newApiEndpoint);
    }
  };

  const handleTestConnection = async (modelType: "doubao" | "deepseek" | "openai" | "gemini" | "zhipu") => {
    setConnectionStatus((prev) => ({ ...prev, [modelType]: "testing" }));
    setConnectionError((prev) => ({ ...prev, [modelType]: "" }));

    const requestBody: Record<string, unknown> = {
      modelType,
      apiKey:
        modelType === "doubao"
          ? doubaoApiKey
          : modelType === "openai"
            ? openaiApiKey
            : modelType === "gemini"
              ? geminiApiKey
              : modelType === "zhipu"
                ? zhipuApiKey
                : deepseekApiKey,
    };

    if (modelType === "doubao") {
      requestBody.modelId = doubaoModelId;
    } else if (modelType === "openai") {
      requestBody.modelId = openaiModelId;
      requestBody.apiEndpoint = openaiApiEndpoint;
    } else if (modelType === "gemini") {
      requestBody.modelId = geminiModelId;
    } else if (modelType === "zhipu") {
      requestBody.modelId = zhipuModelId;
    }

    try {
      const response = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus((prev) => ({ ...prev, [modelType]: "success" }));
        toast.success(t("dashboard.settings.ai.testConnection.success"));
      } else {
        setConnectionStatus((prev) => ({ ...prev, [modelType]: "error" }));
        setConnectionError((prev) => ({ ...prev, [modelType]: data.error || "Unknown error" }));
        toast.error(t("dashboard.settings.ai.testConnection.failed"), {
          description: data.error,
        });
      }
    } catch (error) {
      setConnectionStatus((prev) => ({ ...prev, [modelType]: "error" }));
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setConnectionError((prev) => ({ ...prev, [modelType]: errorMessage }));
      toast.error(t("dashboard.settings.ai.testConnection.failed"), {
        description: errorMessage,
      });
    }
  };

  const models = [
    {
      id: "deepseek",
      name: t("dashboard.settings.ai.deepseek.title"),
      description: t("dashboard.settings.ai.deepseek.description"),
      icon: DeepSeekLogo,
      link: "https://platform.deepseek.com",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      isConfigured: !!deepseekApiKey,
    },
    {
      id: "doubao",
      name: t("dashboard.settings.ai.doubao.title"),
      description: t("dashboard.settings.ai.doubao.description"),
      icon: IconDoubao,
      link: "https://console.volcengine.com/ark",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      isConfigured: !!(doubaoApiKey && doubaoModelId),
    },
    {
      id: "openai",
      name: t("dashboard.settings.ai.openai.title"),
      description: t("dashboard.settings.ai.openai.description"),
      icon: IconOpenAi,
      link: "https://platform.openai.com/api-keys",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      isConfigured: !!(openaiApiKey && openaiModelId && openaiApiEndpoint),
    },
    {
      id: "gemini",
      name: t("dashboard.settings.ai.gemini.title"),
      description: t("dashboard.settings.ai.gemini.description"),
      icon: Sparkles,
      link: "https://aistudio.google.com/app/apikey",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      isConfigured: !!(geminiApiKey && geminiModelId),
    },
    {
      id: "zhipu",
      name: t("dashboard.settings.ai.zhipu.title"),
      description: t("dashboard.settings.ai.zhipu.description"),
      icon: IconZhipu,
      link: "https://open.bigmodel.cn/api-keys",
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-950/50",
      isConfigured: !!(zhipuApiKey && zhipuModelId),
    },
  ];

  return (
    <div className="mx-auto py-4 px-4">
      {requireGeminiConfig && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">
            {t("dashboard.settings.ai.gemini.requiredTitle")}
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            {t("dashboard.settings.ai.gemini.requiredDescription")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-8">
        <div className="w-64 space-y-6">
          <div className="flex flex-col space-y-1">
            {models.map((model) => {
              const Icon = model.icon;
              const isChecked = selectedModel === model.id;
              const isViewing = currentModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    setCurrentModel(model.id as typeof currentModel);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left border",
                    "transition-all duration-200 cursor-pointer",
                    "hover:bg-primary/10 hover:border-primary/30",
                    isViewing
                      ? "bg-primary/10 border-primary/40"
                      : "border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0",
                      isViewing ? "text-primary" : "text-muted-foreground"
                    )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    <span
                      className={cn(
                        "font-medium text-sm",
                        isViewing && "text-primary"
                      )}
                    >
                      {model.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {model.isConfigured
                        ? t("common.configured")
                        : t("common.notConfigured")}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Select ${model.name}`}
                    onClick={() => {
                      setSelectedModel(
                        model.id as "doubao" | "deepseek" | "openai" | "gemini"
                      );
                      setCurrentModel(
                        model.id as "doubao" | "deepseek" | "openai" | "gemini"
                      );
                    }}
                    className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center border transition-all",
                      "shrink-0",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-transparent border-muted-foreground/40 text-transparent hover:border-primary/40"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-2xl">
          {models.map(
            (model) =>
              model.id === currentModel && (
                <div key={model.id} className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <div className={cn("shrink-0", model.color)}>
                        <model.icon className="h-6 w-6" />
                      </div>
                      {model.name}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      {model.description}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          {t(`dashboard.settings.ai.${model.id}.apiKey`)}
                        </Label>
                        <a
                          href={model.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          {t("dashboard.settings.ai.getApiKey")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Input
                        value={
                          model.id === "doubao"
                            ? doubaoApiKey
                            : model.id === "openai"
                            ? openaiApiKey
                            : model.id === "gemini"
                            ? geminiApiKey
                            : model.id === "zhipu"
                            ? zhipuApiKey
                            : deepseekApiKey
                        }
                        onChange={(e) =>
                          handleApiKeyChange(
                            e,
                            model.id as "doubao" | "deepseek" | "openai" | "gemini" | "zhipu"
                          )
                        }
                        type="password"
                        placeholder={t(
                          `dashboard.settings.ai.${model.id}.apiKey`
                        )}
                        className={cn(
                          "h-11",
                          "bg-white dark:bg-gray-900",
                          "border-gray-200 dark:border-gray-800",
                          "focus:ring-2 focus:ring-primary/20"
                        )}
                      />
                    </div>

                    {model.id === "doubao" && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {t("dashboard.settings.ai.doubao.modelId")}
                        </Label>
                        <Input
                          value={doubaoModelId}
                          onChange={(e) => handleModelIdChange(e, "doubao")}
                          placeholder={t(
                            "dashboard.settings.ai.doubao.modelId"
                          )}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {model.id === "openai" && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {t("dashboard.settings.ai.openai.modelId")}
                        </Label>
                        <Input
                          value={openaiModelId}
                          onChange={(e) => handleModelIdChange(e, "openai")}
                          placeholder={t(
                            "dashboard.settings.ai.openai.modelId"
                          )}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {model.id === "gemini" && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {t("dashboard.settings.ai.gemini.modelId")}
                        </Label>
                        <Input
                          value={geminiModelId}
                          onChange={(e) => handleModelIdChange(e, "gemini")}
                          placeholder={t("dashboard.settings.ai.gemini.modelId")}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {model.id === "zhipu" && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {t("dashboard.settings.ai.zhipu.modelId")}
                        </Label>
                        <Input
                          value={zhipuModelId}
                          onChange={(e) => handleModelIdChange(e, "zhipu")}
                          placeholder={t("dashboard.settings.ai.zhipu.modelId")}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {model.id === "openai" && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          {t("dashboard.settings.ai.openai.apiEndpoint")}
                        </Label>
                        <Input
                          value={openaiApiEndpoint}
                          onChange={(e) => handleApiEndpointChange(e, "openai")}
                          placeholder={t(
                            "dashboard.settings.ai.openai.apiEndpoint"
                          )}
                          className={cn(
                            "h-11",
                            "bg-white dark:bg-gray-900",
                            "border-gray-200 dark:border-gray-800",
                            "focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                      </div>
                    )}

                    {/* Test Connection Button */}
                    <div className="pt-4">
                      <Button
                        onClick={() => handleTestConnection(model.id as "doubao" | "deepseek" | "openai" | "gemini" | "zhipu")}
                        disabled={
                          connectionStatus[model.id] === "testing" ||
                          !(
                            model.id === "deepseek"
                              ? deepseekApiKey
                              : model.id === "doubao"
                                ? doubaoApiKey && doubaoModelId
                                : model.id === "gemini"
                                  ? geminiApiKey && geminiModelId
                                  : model.id === "zhipu"
                                    ? zhipuApiKey && zhipuModelId
                                    : openaiApiKey && openaiModelId && openaiApiEndpoint
                          )
                        }
                        variant="outline"
                        className={cn(
                          "w-full h-11",
                          connectionStatus[model.id] === "success" && "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950",
                          connectionStatus[model.id] === "error" && "border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        )}
                      >
                        {connectionStatus[model.id] === "testing" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("dashboard.settings.ai.testConnection.testing")}
                          </>
                        ) : connectionStatus[model.id] === "success" ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {t("dashboard.settings.ai.testConnection.success")}
                          </>
                        ) : connectionStatus[model.id] === "error" ? (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t("dashboard.settings.ai.testConnection.failed")}
                          </>
                        ) : (
                          t("dashboard.settings.ai.testConnection.button")
                        )}
                      </Button>
                      {connectionError[model.id] && (
                        <p className="text-xs text-red-500 mt-2">
                          {connectionError[model.id]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
};

const AISettingsPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <AISettingsContent />
    </Suspense>
  );
};

export const runtime = "edge";

export default AISettingsPage;
