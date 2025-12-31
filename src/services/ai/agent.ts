import { GeminiService } from "../llm/gemini";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTokenTrackingStore } from "../../stores/tokenTrackingStore";

export type AIProvider = "ollama" | "gemini";

export interface AgentRequest {
  systemPrompt?: string;
  userPrompt: string;
  provider?: AIProvider;
  model?: string;
  roleId?: string;
  operation?: "import" | "enrichment" | "qa" | "review" | "other"; // For provider preference lookup
}

export interface AgentResponse {
  text: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  provider: AIProvider;
}

export const AgentService = {
  // Legacy method for backwards compatibility
  generateText: async (request: AgentRequest): Promise<string> => {
    const result = await AgentService.generate(request);
    return result.text;
  },

  // New method that returns token usage
  generate: async (request: AgentRequest): Promise<AgentResponse> => {
    const { ollamaUrl, selectedModel, geminiKey } = useSettingsStore.getState();
    const tokenStore = useTokenTrackingStore.getState();

    let provider = request.provider;
    let model = request.model;

    // Use operation-specific provider preference if no explicit provider
    if (!provider && request.operation) {
      if (request.operation === "import") provider = tokenStore.importProvider;
      else if (request.operation === "enrichment")
        provider = tokenStore.enrichmentProvider;
      else if (request.operation === "qa") provider = tokenStore.qaProvider;
    }

    // If roleId provided, check for overrides
    if (request.roleId) {
      const { useRoleStore } = await import("../../stores/roleStore");
      const role = useRoleStore
        .getState()
        .roles.find((r) => r.id === request.roleId);
      if (role?.modelConfig) {
        provider = role.modelConfig.provider;
        if (role.modelConfig.model) model = role.modelConfig.model;
      }
    }

    // Default to Ollama
    if (!provider) {
      provider = "ollama";
    }

    const finalPrompt = request.systemPrompt
      ? `SYSTEM: ${request.systemPrompt} \n\nUSER: ${request.userPrompt} `
      : request.userPrompt;

    // Estimate prompt tokens (rough: 1 token ≈ 4 chars)
    const estimatedPromptTokens = Math.ceil(finalPrompt.length / 4);

    if (provider === "ollama") {
      try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model || selectedModel,
            prompt: finalPrompt,
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Ollama error (${response.status}): ${errorText}`);
          throw new Error(`Ollama returned ${response.status}`);
        }

        const data = await response.json();

        // Ollama returns token counts in response
        const promptTokens = data.prompt_eval_count || estimatedPromptTokens;
        const completionTokens =
          data.eval_count || Math.ceil(data.response.length / 4);
        const totalTokens = promptTokens + completionTokens;

        // Track usage
        tokenStore.addUsage("ollama", {
          promptTokens,
          completionTokens,
          totalTokens,
        });

        return {
          text: data.response,
          tokensUsed: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens,
          },
          provider: "ollama",
        };
      } catch (e) {
        console.warn("Ollama failed, trying Gemini fallback...", e);
        if (geminiKey) {
          provider = "gemini";
          // Fall through to Gemini
        } else {
          throw new Error(
            `Ollama failed and no Gemini API key configured. Error: ${(e as Error).message}`,
          );
        }
      }
    }

    // Gemini
    const result = await GeminiService.generate(finalPrompt, model);
    const completionTokens = Math.ceil(result.length / 4);
    const totalTokens = estimatedPromptTokens + completionTokens;

    // Track usage
    tokenStore.addUsage("gemini", {
      promptTokens: estimatedPromptTokens,
      completionTokens,
      totalTokens,
    });

    return {
      text: result,
      tokensUsed: {
        prompt: estimatedPromptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
      provider: "gemini",
    };
  },
};
