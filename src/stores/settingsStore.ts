import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  geminiKey: string;
  geminiModels: string[];
  selectedGeminiModel: string;
  geminiTemperature: number;
  geminiTopP: number;
  geminiTopK: number;
  geminiMaxOutputTokens: number;

  ollamaUrl: string;
  ollamaModels: string[]; // List of installed model names
  selectedModel: string;

  setGeminiKey: (key: string) => void;
  setGeminiModels: (models: string[]) => void;
  setSelectedGeminiModel: (model: string) => void;
  setGeminiConfig: (config: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }) => void;

  setOllamaUrl: (url: string) => void;
  setOllamaModels: (models: string[]) => void;
  setSelectedModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      geminiKey: "",
      geminiModels: [],
      selectedGeminiModel: "gemini-1.5-flash",
      geminiTemperature: 0.7,
      geminiTopP: 0.95,
      geminiTopK: 40,
      geminiMaxOutputTokens: 8192,



      ollamaUrl: "http://localhost:11434",
      ollamaModels: [],
      selectedModel: "llama3", // Default

      setGeminiKey: (key) => set({ geminiKey: key }),
      setGeminiModels: (models) => set({ geminiModels: models }),
      setSelectedGeminiModel: (model) => set({ selectedGeminiModel: model }),
      setGeminiConfig: (config) => set((state) => ({
        ...state,
        geminiTemperature: config.temperature ?? state.geminiTemperature,
        geminiTopP: config.topP ?? state.geminiTopP,
        geminiTopK: config.topK ?? state.geminiTopK,
        geminiMaxOutputTokens: config.maxOutputTokens ?? state.geminiMaxOutputTokens,
      })),

      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setOllamaModels: (models) => set({ ollamaModels: models }),
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: "book-writer-settings", // unique name
    },
  ),
);
