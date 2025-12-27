import { useTokenTrackingStore, type AIProvider } from '../stores/tokenTrackingStore';
import { Cpu, Cloud, Zap } from 'lucide-react';

interface Props {
    showTokenUsage?: boolean;
}

export default function ModelSelector({ showTokenUsage = true }: Props) {
    const {
        importProvider,
        enrichmentProvider,
        qaProvider,
        sessionUsage,
        setImportProvider,
        setEnrichmentProvider,
        setQAProvider,
        getEstimatedCost,
        resetSession
    } = useTokenTrackingStore();

    const ProviderButton = ({
        provider,
        selected,
        onClick
    }: {
        provider: AIProvider;
        selected: boolean;
        onClick: () => void;
    }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${selected
                ? provider === 'ollama'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-bg-tertiary text-text-muted border border-transparent hover:border-border-color'
                }`}
        >
            {provider === 'ollama' ? <Cpu size={12} /> : <Cloud size={12} />}
            {provider === 'ollama' ? 'Local' : 'Gemini'}
        </button>
    );

    const totalTokens = sessionUsage.ollama.totalTokens + sessionUsage.gemini.totalTokens;
    const estimatedCost = getEstimatedCost();

    return (
        <div className="bg-bg-secondary border border-border-color rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm flex items-center gap-2">
                    <Zap size={14} className="text-accent-color" />
                    AI Model Selection
                </span>
                {showTokenUsage && (
                    <button
                        onClick={resetSession}
                        className="text-xs text-text-muted hover:text-text-primary transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {/* Import Provider */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-text-muted">Import</span>
                    </div>
                    <div className="flex gap-2">
                        <ProviderButton
                            provider="ollama"
                            selected={importProvider === 'ollama'}
                            onClick={() => setImportProvider('ollama')}
                        />
                        <ProviderButton
                            provider="gemini"
                            selected={importProvider === 'gemini'}
                            onClick={() => setImportProvider('gemini')}
                        />
                    </div>
                </div>

                {/* Enrichment Provider */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-text-muted">Enrichment</span>
                    </div>
                    <div className="flex gap-2">
                        <ProviderButton
                            provider="ollama"
                            selected={enrichmentProvider === 'ollama'}
                            onClick={() => setEnrichmentProvider('ollama')}
                        />
                        <ProviderButton
                            provider="gemini"
                            selected={enrichmentProvider === 'gemini'}
                            onClick={() => setEnrichmentProvider('gemini')}
                        />
                    </div>
                </div>

                {/* QA Provider */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-text-muted">QA / Review</span>
                    </div>
                    <div className="flex gap-2">
                        <ProviderButton
                            provider="ollama"
                            selected={qaProvider === 'ollama'}
                            onClick={() => setQAProvider('ollama')}
                        />
                        <ProviderButton
                            provider="gemini"
                            selected={qaProvider === 'gemini'}
                            onClick={() => setQAProvider('gemini')}
                        />
                    </div>
                </div>
            </div>

            {/* Token Usage */}
            {showTokenUsage && totalTokens > 0 && (
                <div className="mt-3 pt-3 border-t border-border-color">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Session Tokens</span>
                        <span className="font-mono">{totalTokens.toLocaleString()}</span>
                    </div>
                    {estimatedCost > 0 && (
                        <div className="flex justify-between text-xs mt-1">
                            <span className="text-text-muted">Est. Cost</span>
                            <span className="font-mono text-yellow-500">${estimatedCost.toFixed(4)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
