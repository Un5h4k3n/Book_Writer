/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useRoleStore } from "../../stores/roleStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { Save, RotateCcw, Plus, Edit3 } from "lucide-react";

export default function RolesPage() {
  const { roles, updateRole, resetDefaults } = useRoleStore();
  const { geminiModels, ollamaModels } = useSettingsStore(); // Need access to models
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0].id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideProvider, setOverrideProvider] = useState<
    "ollama" | "gemini" | "default"
  >("default");

  // Reset override provider state when entering edit mode
  useEffect(() => {
    if (editingId) {
      const role = roles.find((r) => r.id === editingId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverrideProvider(role?.modelConfig?.provider || "default");
    }
  }, [editingId, roles]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  return (
    <div className="h-full flex flex-col animate-fade-in gap-6">
      <header className="flex justify-between items-center border-b border-border-color pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-accent-color">
            Agent Roles
          </h1>
          <p className="text-text-secondary">
            Configure the personalities and directives for your AI team.
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-xs text-text-muted hover:text-red-500 flex items-center gap-1"
        >
          <RotateCcw size={14} /> Reset Defaults
        </button>
      </header>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Sidebar List */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-border-color">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`text-left p-3 rounded-md transition-colors border ${selectedRoleId === role.id
                ? "bg-accent-color text-white border-accent-color"
                : "bg-bg-secondary text-text-primary border-border-color hover:bg-bg-tertiary"
                }`}
            >
              <div className="font-bold font-serif">{role.name}</div>
              <div
                className={`text-xs truncate ${selectedRoleId === role.id ? "text-white/80" : "text-text-muted"}`}
              >
                {role.description}
              </div>
            </button>
          ))}
          <button className="p-3 border-2 border-dashed border-border-color rounded-md text-text-muted hover:text-accent-color hover:border-accent-color flex items-center justify-center gap-2 transition-all">
            <Plus size={16} /> Create Custom Role
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-bg-secondary rounded-lg border border-border-color p-6 overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold font-serif">
                {selectedRole.name}
              </h2>
              <p className="text-text-muted text-sm">
                {selectedRole.description}
              </p>
            </div>
            {editingId !== selectedRole.id && (
              <button
                onClick={() => setEditingId(selectedRole.id)}
                className="text-accent-color hover:text-accent-hover flex items-center gap-2"
              >
                <Edit3 size={18} /> Edit Prompt
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2 relative">
            <label className="text-sm font-bold uppercase tracking-wide text-text-muted">
              System Prompt
            </label>
            {editingId === selectedRole.id ? (
              <textarea
                className="flex-1 resize-none font-mono text-sm p-4 leading-relaxed bg-bg-primary"
                defaultValue={selectedRole.systemPrompt}
                id={`editor-${selectedRole.id}`}
              />
            ) : (
              <div className="flex-1 whitespace-pre-wrap font-mono text-sm p-4 bg-bg-primary rounded-md border border-border-color overflow-y-auto opacity-80">
                {selectedRole.systemPrompt}
              </div>
            )}

            {/* Model Override Section */}
            <div className="mt-4 pt-4 border-t border-border-color">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                  Model Override
                </h3>
                {editingId !== selectedRole.id && selectedRole.modelConfig && (
                  <span className="text-xs bg-bg-tertiary px-2 py-1 rounded">
                    Using:{" "}
                    <span className="text-accent-color font-bold">
                      {selectedRole.modelConfig.provider}
                    </span>
                    {selectedRole.modelConfig.model &&
                      ` (${selectedRole.modelConfig.model})`}
                  </span>
                )}
              </div>

              {editingId === selectedRole.id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      Provider
                    </label>
                    <select
                      id={`provider-${selectedRole.id}`}
                      defaultValue={
                        selectedRole.modelConfig?.provider || "default"
                      }
                      onChange={(e) =>
                        setOverrideProvider(e.target.value as any)
                      }
                      className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-md text-sm"
                    >
                      <option value="default">Use Global Default</option>
                      <option value="ollama">Local (Ollama)</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      Specific Model
                    </label>
                    <select
                      id={`model-${selectedRole.id}`}
                      defaultValue={selectedRole.modelConfig?.model || ""}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-md text-sm"
                      disabled={
                        overrideProvider === "default" &&
                        !selectedRole.modelConfig?.provider
                      }
                    >
                      <option value="">Default Model</option>
                      {(overrideProvider === "gemini" ||
                        (overrideProvider === "default" &&
                          selectedRole.modelConfig?.provider === "gemini")) &&
                        geminiModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      {(overrideProvider === "ollama" ||
                        (overrideProvider === "default" &&
                          selectedRole.modelConfig?.provider === "ollama")) &&
                        ollamaModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {editingId === selectedRole.id && (
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 rounded-md hover:bg-bg-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const promptVal = (
                    document.getElementById(
                      `editor-${selectedRole.id}`,
                    ) as HTMLTextAreaElement
                  ).value;
                  const providerVal = (
                    document.getElementById(
                      `provider-${selectedRole.id}`,
                    ) as HTMLSelectElement
                  ).value;
                  const modelVal = (
                    document.getElementById(
                      `model-${selectedRole.id}`,
                    ) as HTMLSelectElement
                  ).value; // Changed to Select

                  const config =
                    providerVal === "default"
                      ? undefined
                      : {
                        provider: providerVal as "ollama" | "gemini",
                        model: modelVal || undefined,
                      };

                  updateRole(selectedRole.id, {
                    systemPrompt: promptVal,
                    modelConfig: config,
                  });
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-hover flex items-center gap-2"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
