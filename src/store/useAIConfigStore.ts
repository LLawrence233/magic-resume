import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AI_MODEL_CONFIGS, AIModelType } from "@/config/ai";

interface AIConfigState {
  selectedModel: AIModelType;
  doubaoApiKey: string;
  doubaoModelId: string;
  deepseekApiKey: string;
  deepseekModelId: string;
  openaiApiKey: string;
  openaiModelId: string;
  openaiApiEndpoint: string;
  geminiApiKey: string;
  geminiModelId: string;
  zhipuApiKey: string;
  zhipuModelId: string;
  requireGeminiConfig: boolean;
  setSelectedModel: (model: AIModelType) => void;
  setDoubaoApiKey: (apiKey: string) => void;
  setDoubaoModelId: (modelId: string) => void;
  setDeepseekApiKey: (apiKey: string) => void;
  setDeepseekModelId: (modelId: string) => void;
  setOpenaiApiKey: (apiKey: string) => void;
  setOpenaiModelId: (modelId: string) => void;
  setOpenaiApiEndpoint: (endpoint: string) => void;
  setGeminiApiKey: (apiKey: string) => void;
  setGeminiModelId: (modelId: string) => void;
  setZhipuApiKey: (apiKey: string) => void;
  setZhipuModelId: (modelId: string) => void;
  setRequireGeminiConfig: (require: boolean) => void;
  isConfigured: () => boolean;
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      selectedModel: "doubao",
      doubaoApiKey: "",
      doubaoModelId: "",
      deepseekApiKey: "",
      deepseekModelId: "",
      openaiApiKey: "",
      openaiModelId: "",
      openaiApiEndpoint: "",
      geminiApiKey: "",
      geminiModelId: "gemini-flash-latest",
      zhipuApiKey: "",
      zhipuModelId: "glm-4-flash",
      requireGeminiConfig: false,
      setSelectedModel: (model: AIModelType) => set({ selectedModel: model }),
      setDoubaoApiKey: (apiKey: string) => set({ doubaoApiKey: apiKey }),
      setDoubaoModelId: (modelId: string) => set({ doubaoModelId: modelId }),
      setDeepseekApiKey: (apiKey: string) => set({ deepseekApiKey: apiKey }),
      setDeepseekModelId: (modelId: string) => set({ deepseekModelId: modelId }),
      setOpenaiApiKey: (apiKey: string) => set({ openaiApiKey: apiKey }),
      setOpenaiModelId: (modelId: string) => set({ openaiModelId: modelId }),
      setOpenaiApiEndpoint: (endpoint: string) => set({ openaiApiEndpoint: endpoint }),
      setGeminiApiKey: (apiKey: string) => set({ geminiApiKey: apiKey }),
      setGeminiModelId: (modelId: string) => set({ geminiModelId: modelId }),
      setZhipuApiKey: (apiKey: string) => set({ zhipuApiKey: apiKey }),
      setZhipuModelId: (modelId: string) => set({ zhipuModelId: modelId }),
      setRequireGeminiConfig: (require: boolean) => set({ requireGeminiConfig: require }),
      isConfigured: () => {
        const state = get();
        const config = AI_MODEL_CONFIGS[state.selectedModel];
        return config.validate(state);
      }
    }),
    {
      name: "ai-config-storage"
    }
  )
);
