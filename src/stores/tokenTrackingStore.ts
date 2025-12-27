import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'ollama' | 'gemini';

interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

interface TokenTrackingState {
    // Current session usage
    sessionUsage: {
        ollama: TokenUsage;
        gemini: TokenUsage;
    };

    // Provider preference for different operations
    importProvider: AIProvider;
    enrichmentProvider: AIProvider;
    qaProvider: AIProvider;

    // Actions
    addUsage: (provider: AIProvider, usage: Partial<TokenUsage>) => void;
    resetSession: () => void;
    setImportProvider: (provider: AIProvider) => void;
    setEnrichmentProvider: (provider: AIProvider) => void;
    setQAProvider: (provider: AIProvider) => void;

    // Getters
    getTotalTokens: () => number;
    getEstimatedCost: () => number;
}

const emptyUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

export const useTokenTrackingStore = create<TokenTrackingState>()(
    persist(
        (set, get) => ({
            sessionUsage: {
                ollama: { ...emptyUsage },
                gemini: { ...emptyUsage }
            },

            importProvider: 'ollama',      // Default to local
            enrichmentProvider: 'ollama',  // Default to local
            qaProvider: 'ollama',          // Default to local

            addUsage: (provider, usage) => set(state => ({
                sessionUsage: {
                    ...state.sessionUsage,
                    [provider]: {
                        promptTokens: state.sessionUsage[provider].promptTokens + (usage.promptTokens || 0),
                        completionTokens: state.sessionUsage[provider].completionTokens + (usage.completionTokens || 0),
                        totalTokens: state.sessionUsage[provider].totalTokens + (usage.totalTokens || 0)
                    }
                }
            })),

            resetSession: () => set({
                sessionUsage: {
                    ollama: { ...emptyUsage },
                    gemini: { ...emptyUsage }
                }
            }),

            setImportProvider: (provider) => set({ importProvider: provider }),
            setEnrichmentProvider: (provider) => set({ enrichmentProvider: provider }),
            setQAProvider: (provider) => set({ qaProvider: provider }),

            getTotalTokens: () => {
                const { sessionUsage } = get();
                return sessionUsage.ollama.totalTokens + sessionUsage.gemini.totalTokens;
            },

            getEstimatedCost: () => {
                // Gemini pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens (flash)
                const { sessionUsage } = get();
                const gemini = sessionUsage.gemini;
                const inputCost = (gemini.promptTokens / 1_000_000) * 0.075;
                const outputCost = (gemini.completionTokens / 1_000_000) * 0.30;
                return inputCost + outputCost;
            }
        }),
        { name: 'book-writer-token-tracking' }
    )
);
