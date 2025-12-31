import {
  useTokenTrackingStore,
} from "../stores/tokenTrackingStore";
import { Zap } from "lucide-react";

interface Props {
  showTokenUsage?: boolean;
}

function ProviderButton({
  provider,
  selected,
  onClick,
}: {
  provider: "ollama" | "gemini";
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${selected
          ? "bg-accent-color text-white"
          : "bg-bg-tertiary text-text-muted hover:bg-bg-hover"
        }`}
    >
      <Zap size={12} className={selected ? "fill-current" : ""} />
      {provider === "ollama" ? "Ollama" : "Gemini"}
    </button>
  );
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
    resetSession,
  } = useTokenTrackingStore();


  const totalTokens =
    sessionUsage.ollama.totalTokens + sessionUsage.gemini.totalTokens;
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
              selected={importProvider === "ollama"}
              onClick={() => setImportProvider("ollama")}
            />
            <ProviderButton
              provider="gemini"
              selected={importProvider === "gemini"}
              onClick={() => setImportProvider("gemini")}
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
              selected={enrichmentProvider === "ollama"}
              onClick={() => setEnrichmentProvider("ollama")}
            />
            <ProviderButton
              provider="gemini"
              selected={enrichmentProvider === "gemini"}
              onClick={() => setEnrichmentProvider("gemini")}
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
              selected={qaProvider === "ollama"}
              onClick={() => setQAProvider("ollama")}
            />
            <ProviderButton
              provider="gemini"
              selected={qaProvider === "gemini"}
              onClick={() => setQAProvider("gemini")}
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
              <span className="font-mono text-yellow-500">
                ${estimatedCost.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
