import { useSettingsStore } from "../../stores/settingsStore";

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export const OllamaService = {
  getTags: async (): Promise<OllamaModel[]> => {
    const { ollamaUrl } = useSettingsStore.getState();
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`);
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error("Ollama connection error:", error);
      throw error;
    }
  },

  pullModel: async (
    modelName: string,
    onProgress: (status: string) => void,
  ) => {
    const { ollamaUrl } = useSettingsStore.getState();
    try {
      const response = await fetch(`${ollamaUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse NDJSON lines
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.status) onProgress(json.status);
          } catch {
            // ignore partial json
          }
        }
      }
    } catch (error) {
      console.error("Pull failed:", error);
      throw error;
    }
  },
};
