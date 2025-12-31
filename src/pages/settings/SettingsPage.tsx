import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useProjectStore } from "../../stores/projectStore";
import { OllamaService, type OllamaModel } from "../../services/llm/ollama";
import { GeminiService } from "../../services/llm/gemini";
import {
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function SettingsPage() {
  const {
    geminiKey,
    setGeminiKey,
    geminiModels,
    setGeminiModels,
    selectedGeminiModel,
    setSelectedGeminiModel,
    ollamaUrl,
    setOllamaUrl,
    selectedModel,
    setSelectedModel,
    setOllamaModels,
  } = useSettingsStore();

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [pullModelName, setPullModelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pullStatus, setPullStatus] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "checking"
  >("checking");

  useEffect(() => {
    checkConnection();
  }, [ollamaUrl]);

  const checkConnection = async () => {
    setConnectionStatus("checking");
    try {
      const tags = await OllamaService.getTags();
      setModels(tags);
      setOllamaModels(tags.map((t) => t.name)); // Value sync to store
      setConnectionStatus("connected");
    } catch {
      setConnectionStatus("error");
      setModels([]);
      setOllamaModels([]);
    }
  };

  // ... (rest of component) ...

  <datalist id="ollama-library">
    <option value="llama3" />
    <option value="llama2" />
    <option value="mistral" />
    <option value="mixtral" />
    <option value="gemma" />
    <option value="phi3" />
    <option value="neural-chat" />
    <option value="starling-lm" />
    <option value="codellama" />
    <option value="dolphin-mixtral" />
    <option value="qwen" />
    <option value="orca-mini" />
    <option value="vicuna" />
    <option value="llava" />
    <option value="nomic-embed-text" />
  </datalist>;

  const handlePullModel = async () => {
    if (!pullModelName) return;
    setLoading(true);
    setPullStatus("Starting pull...");
    try {
      await OllamaService.pullModel(pullModelName, (status) => {
        setPullStatus(status);
      });
      setPullStatus("Model installed successfully!");
      setPullModelName("");
      checkConnection(); // Refresh list
    } catch {
      setPullStatus("Error pulling model.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGeminiModels = async () => {
    if (!geminiKey) return;
    try {
      const models = await GeminiService.listModels(geminiKey);
      if (models.length > 0) {
        setGeminiModels(models);
        if (!selectedGeminiModel) setSelectedGeminiModel(models[0]);
      }
    } catch (error) {
      console.error("Failed to fetch Gemini models", error);
    }
  };

  // Auto-fetch if key exists and no models loaded
  useEffect(() => {
    if (geminiKey && geminiModels.length === 0) {
      handleFetchGeminiModels();
    }
  }, [geminiKey]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="border-b border-border-color pb-4">
        <h1 className="text-3xl font-serif font-bold text-accent-color">
          Configuration
        </h1>
        <p className="text-text-secondary">
          Manage your AI connections and project preferences.
        </p>
      </header>

      {/* Gemini Section */}
      <section className="bg-bg-secondary p-6 rounded-lg shadow-sm border border-border-color">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Google Gemini Setup
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API Key"
                className="flex-1 px-3 py-2 bg-bg-primary border border-border-color rounded-md"
              />
              {/* We auto-save to store on change, but button provides feedback/action */}
            </div>
            <p className="text-xs text-text-muted">
              Required for hosted inference.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">
              Selected Gemini Model
            </label>
            <div className="flex gap-2">
              <select
                value={selectedGeminiModel || ""}
                onChange={(e) => setSelectedGeminiModel(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-primary border border-border-color rounded-md"
              >
                <option value="" disabled>
                  Select a model...
                </option>
                {geminiModels.length > 0 ? (
                  geminiModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                ) : (
                  <option value="gemini-1.5-flash">
                    Default (gemini-1.5-flash)
                  </option>
                )}
              </select>
              <button
                onClick={handleFetchGeminiModels}
                className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-md hover:opacity-80 flex items-center gap-2 border border-border-color"
                title="Refresh Model List"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Advanced Gemini Settings */}
          <details className="text-sm border border-border-color rounded-md bg-bg-primary overflow-hidden">
            <summary className="p-3 font-semibold cursor-pointer hover:bg-bg-tertiary select-none">
              Advanced Generation Settings
            </summary>
            <div className="p-4 space-y-4 border-t border-border-color">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-text-muted">
                      Temperature
                    </label>
                    <span className="text-xs">
                      {useSettingsStore((s) => s.geminiTemperature)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={useSettingsStore((s) => s.geminiTemperature)}
                    onChange={(e) =>
                      useSettingsStore
                        .getState()
                        .setGeminiConfig({
                          temperature: parseFloat(e.target.value),
                        })
                    }
                    className="w-full accent-accent-color"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-text-muted">
                      Top P
                    </label>
                    <span className="text-xs">
                      {useSettingsStore((s) => s.geminiTopP)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={useSettingsStore((s) => s.geminiTopP)}
                    onChange={(e) =>
                      useSettingsStore
                        .getState()
                        .setGeminiConfig({
                          topP: parseFloat(e.target.value),
                        })
                    }
                    className="w-full accent-accent-color"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-text-muted">
                      Top K
                    </label>
                    <span className="text-xs">
                      {useSettingsStore((s) => s.geminiTopK)}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={useSettingsStore((s) => s.geminiTopK)}
                    onChange={(e) =>
                      useSettingsStore
                        .getState()
                        .setGeminiConfig({
                          topK: parseInt(e.target.value) || 0,
                        })
                    }
                    className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-text-muted">
                      Max Output Tokens
                    </label>
                    <span className="text-xs">
                      {useSettingsStore((s) => s.geminiMaxOutputTokens)}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={useSettingsStore((s) => s.geminiMaxOutputTokens)}
                    onChange={(e) =>
                      useSettingsStore
                        .getState()
                        .setGeminiConfig({
                          maxOutputTokens:
                            parseInt(e.target.value) || 2048,
                        })
                    }
                    className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Cloud Backup Section */}
      <section className="bg-bg-secondary p-6 rounded-lg shadow-sm border border-border-color">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Cloud Backup
          </h2>
        </header>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-bg-primary rounded-md border border-border-color">
            <div>
              <div className="font-bold flex items-center gap-2">
                <span className="text-accent-color">Real-Time Cloud Sync</span>
                <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-sm text-text-muted mt-1">
                Your changes are automatically saved to Firebase in real-time.
              </p>
            </div>
            <button
              onClick={() => useProjectStore.getState().syncToCloud()}
              disabled={useProjectStore((s) => s.isSyncing)}
              className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-md hover:opacity-90 flex items-center gap-2 text-sm border border-border-color disabled:opacity-50"
            >
              {useProjectStore((s) => s.isSyncing) ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} /> Force Resync
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Ollama Section with Datalist */}
      <section className="bg-bg-secondary p-6 rounded-lg shadow-sm border border-border-color">
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Local Ollama Setup
          </h2>
          <div className="flex items-center gap-2 text-sm">
            {connectionStatus === "connected" && (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle size={14} /> Online
              </span>
            )}
            {connectionStatus === "error" && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> Offline
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Ollama URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-primary border border-border-color rounded-md"
              />
              <button
                onClick={checkConnection}
                className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-md hover:opacity-80 flex items-center gap-2 border border-border-color"
              >
                <RefreshCw size={18} /> Test
              </button>
            </div>
          </div>

          <hr className="border-border-color" />

          {/* Model Manager */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Installed Models</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-md"
              disabled={connectionStatus !== "connected"}
            >
              {models.length === 0 && (
                <option>No models found or offline</option>
              )}
              {models.map((m) => (
                <option key={m.digest} value={m.name}>
                  {m.name} ({m.details.parameter_size})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-semibold">Install New Model</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search available library (e.g. llama3)"
                value={pullModelName}
                onChange={(e) => setPullModelName(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-primary border border-border-color rounded-md"
                list="ollama-library"
              />
              <datalist id="ollama-library">
                <option value="llama3:8b" />
                <option value="llama3:70b" />
                <option value="llama2:7b" />
                <option value="llama2:13b" />
                <option value="llama2:70b" />
                <option value="gemma:2b" />
                <option value="gemma:7b" />
                <option value="gemma2:9b" />
                <option value="gemma2:27b" />
                <option value="mistral:7b" />
                <option value="mixtral:8x7b" />
                <option value="mixtral:8x22b" />
                <option value="phi3:3.8b" />
                <option value="phi3:14b" />
                <option value="neural-chat:7b" />
                <option value="starling-lm:7b" />
                <option value="codellama:7b" />
                <option value="codellama:34b" />
                <option value="codellama:70b" />
                <option value="dolphin-mixtral:8x7b" />
                <option value="qwen:0.5b" />
                <option value="qwen:4b" />
                <option value="qwen:7b" />
                <option value="qwen:14b" />
                <option value="qwen:32b" />
                <option value="qwen:72b" />
                <option value="qwen:110b" />
                <option value="deepseek-coder:6.7b" />
                <option value="deepseek-coder:33b" />
                <option value="deepseek-llm:7b" />
                <option value="deepseek-llm:67b" />
                <option value="orca-mini:3b" />
                <option value="vicuna:7b" />
                <option value="vicuna:13b" />
                <option value="llava:7b" />
                <option value="llava:13b" />
                <option value="llava:34b" />
                <option value="nomic-embed-text" />
              </datalist>
              <button
                onClick={handlePullModel}
                disabled={loading || connectionStatus !== "connected"}
                className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-md hover:bg-opacity-80 flex items-center gap-2 border border-border-color disabled:opacity-50"
              >
                <Download size={18} /> {loading ? "Pulling..." : "Pull"}
              </button>
            </div>
            {pullStatus && (
              <p className="text-sm text-accent-color font-mono mt-1">
                {pullStatus}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
