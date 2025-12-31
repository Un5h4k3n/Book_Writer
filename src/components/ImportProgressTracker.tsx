import { useImportJobStore } from "../stores/importJobStore";

export default function ImportProgressTracker() {
  const {
    progress,
    getPercentage,
    getEstimatedTimeRemaining,
    pause,
    resume,
    reset,
  } = useImportJobStore();

  if (progress.status === "idle") return null;

  const percentage = getPercentage();
  const timeRemaining = getEstimatedTimeRemaining();
  const isPaused = progress.status === "paused";
  const isComplete = progress.status === "complete";
  const hasErrors = progress.errors.length > 0;

  return (
    <div className="bg-bg-secondary border border-border-color rounded-lg p-4 mb-4 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          📥 {isComplete ? "Import Complete" : "Importing Outline"}
        </h3>
        {!isComplete && (
          <div className="flex gap-2">
            <button
              onClick={isPaused ? resume : pause}
              className="text-xs px-3 py-1 rounded bg-bg-tertiary border border-border-color hover:border-accent-color"
            >
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>
            <button
              onClick={reset}
              className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-text-secondary mb-1">
          <span>
            Chunk {progress.processedChunks} of {progress.totalChunks}
          </span>
          <span>{percentage}%</span>
        </div>
        <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isComplete ? "bg-green-500" : "bg-accent-color"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center mb-3">
        <div className="bg-bg-primary rounded p-2">
          <div className="text-2xl font-bold text-accent-color">
            {progress.extractedChapters}
          </div>
          <div className="text-xs text-text-muted">📚 Chapters</div>
        </div>
        <div className="bg-bg-primary rounded p-2">
          <div className="text-2xl font-bold text-accent-color">
            {progress.extractedCharacters}
          </div>
          <div className="text-xs text-text-muted">👤 Characters</div>
        </div>
        <div className="bg-bg-primary rounded p-2">
          <div className="text-2xl font-bold text-accent-color">
            {progress.extractedWorldItems}
          </div>
          <div className="text-xs text-text-muted">🌍 World Items</div>
        </div>
      </div>

      {/* Time Remaining */}
      {!isComplete && (
        <div className="text-center text-sm text-text-secondary">
          ⏱️ {isPaused ? "Paused" : timeRemaining}
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          <div className="font-bold mb-1">
            ⚠️ {progress.errors.length} Warning(s)
          </div>
          <div className="text-xs max-h-20 overflow-y-auto">
            {progress.errors.slice(-3).map((err, i) => (
              <div key={i}>• {err}</div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Message */}
      {isComplete && (
        <div className="text-center mt-3">
          <button
            onClick={reset}
            className="text-sm px-4 py-2 bg-accent-color text-white rounded hover:opacity-90"
          >
            ✓ Done - View Outline
          </button>
        </div>
      )}
    </div>
  );
}
