/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
// import { useImportJobStore } from "../../stores/importJobStore";
import { ImportAnalyzer } from "../../services/import/importAnalyzer";
import { DraftImporter } from "../../services/import/draftImporter";
import type { DraftMapping } from "../../services/import/draftImporter";
import ModelSelector from "../../components/ModelSelector";
import ImportProgressTracker from "../../components/ImportProgressTracker";
import { Upload, FileText, CheckCircle, Loader, ArrowRight, Play } from "lucide-react";
import type { Chapter, WorldCategory } from "../../types";
import type { ChangeEvent } from "react";

// Temporary ID generator since we removed uuid
const genId = () => Math.random().toString(36).substring(2, 9);

export default function ImportPage() {
  const { addChapter, addCharacter, addWorldItem, chapters, updateChapter } = useProjectStore();
  // const importProgress = useImportJobStore((s) => s.progress);
  const [mode, setMode] = useState<"overview" | "draft">("overview");
  const [fileContent, setFileContent] = useState<string | null>(null);
  // const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Smart Draft Import State
  const [mappings, setMappings] = useState<DraftMapping[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
      setFileName(file.name);
      setAnalysisDone(false); // Reset analysis on new file
      setMappings([]);
      setStatus("");
    };
    reader.readAsText(file);
  };

  const processOverview = async () => {
    if (!fileContent) return;
    setIsProcessing(true);
    setStatus("Starting import with local AI...");

    try {
      // Use new extractStructure with progress tracking
      const result = await ImportAnalyzer.extractStructure(fileContent);

      // 1. Add Chapters & Scenes with enrichment data
      let order = chapters.length + 1;
      for (const ch of result.chapters) {
        const newChapter: Chapter = {
          id: genId(),
          projectId: "default",
          title: ch.title,
          order: order++,
          summary: ch.summary,
          needsEnrichment: true, // Enable manual queueing
          // Map enrichment fields from import result
          act: ch.act as any,
          primaryPov: ch.primaryPov,
          chapterGoal: ch.chapterGoal,
          theme: ch.theme,
          timeContext: ch.timeContext,
          scenes: ch.scenes
            ? ch.scenes.map((s: any) => ({
              id: genId(),
              title: s.title,
              summary: s.summary,
              needsEnrichment: true, // Enable manual queueing
              // Map scene enrichment fields
              pov: s.pov,
              mood: s.mood,
              location: s.location,
              conflict: s.conflict,
              stakes: s.stakes,
              beatSheet: [],
              content: "",
              status: "drafting",
            }))
            : [],
        };
        addChapter(newChapter);
      }

      // 2. Add Characters with needsEnrichment flag
      if (result.characters) {
        for (const char of result.characters) {
          addCharacter({
            id: genId(),
            projectId: "default",
            name: char.name,
            role: ([
              "protagonist",
              "antagonist",
              "supporting",
              "minor",
            ].includes(char.role)
              ? char.role
              : "supporting") as any,
            shortDescription: char.description,
            needsEnrichment: true,
            attributes: {},
          });
        }
      }

      // 3. Add World Items with needsEnrichment flag
      const validCategories: WorldCategory[] = [
        "location",
        "supernatural",
        "faction",
        "technology",
        "history",
        "other",
      ];
      if (result.world) {
        for (const item of result.world) {
          // Map 'magic' to 'supernatural' for backwards compatibility
          let category = item.category as WorldCategory;
          if (category === ("magic" as any)) category = "supernatural";
          if (!validCategories.includes(category)) category = "other";

          addWorldItem({
            id: genId(),
            projectId: "default",
            name: item.name,
            category,
            shortDescription: item.description,
            needsEnrichment: true,
            attributes: {},
          });
        }
      }

      setStatus(
        `✓ Imported ${result.chapters.length} chapters, ${result.characters?.length || 0} characters, and ${result.world?.length || 0} world items.`,
      );
    } catch (e) {
      setStatus("Error processing overview.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (index: number, updates: Partial<DraftMapping>) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  // Phase 1: Analyze Draft
  const analyzeDraft = async () => {
    if (!fileContent) return;
    setIsProcessing(true);
    setStatus("Analyzing draft structure...");

    try {
      const results = DraftImporter.analyzeDraft(fileContent, chapters);

      // Ensure we handle "new" chapters correctly
      setMappings(results);
      setAnalysisDone(true);
      setStatus(`Found ${results.length} sections. Please review mappings below.`);
    } catch (e) {
      console.error(e);
      setStatus("Failed to analyze draft.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Phase 2: Execute Import
  const executeImport = async () => {
    setIsProcessing(true);

    try {
      let successCount = 0;
      let newOrder = chapters.length + 1;

      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];

        if (mapping.action === "ignore") continue;

        setStatus(`Processing section ${i + 1}/${mappings.length}: ${mapping.sourceSection}...`);

        // Allow break for UI update
        await new Promise(r => setTimeout(r, 100));

        // Process content (AI scene detection)
        // Note: processChapter does the heavy lifting
        const result = await DraftImporter.processChapter(mapping, (msg) => setStatus(msg));

        if (mapping.action === "overwrite" && mapping.targetChapterId !== "new") {
          const targetChapter = chapters.find(c => c.id === mapping.targetChapterId);
          if (targetChapter) {
            // Update existing chapter
            // We need to overwrite scenes. 
            // MVP: Replace all scenes with new parsed scenes from the content
            // Ideally we'd try to merge, but overwrite logic was requested/approved

            // Parse result.content back into scenes using the break marker
            const sceneContents = result.content.split("\n\n⁂\n\n");
            const newScenes = sceneContents.map((content, idx) => ({
              id: genId(),
              title: `Scene ${idx + 1}`,
              summary: "Imported scene",
              beatSheet: [],
              content: content.trim(),
              status: "done" as const
            }));

            updateChapter(targetChapter.id, {
              scenes: newScenes
            });
          }
        } else {
          // Create New Chapter
          const sceneContents = result.content.split("\n\n⁂\n\n");
          const newScenes = sceneContents.map((content, idx) => ({
            id: genId(),
            title: `Scene ${idx + 1}`,
            summary: "Imported scene",
            beatSheet: [],
            content: content.trim(),
            status: "done" as const
          }));

          addChapter({
            id: genId(),
            projectId: "default",
            title: result.title,
            order: newOrder++,
            summary: "Imported Chapter",
            scenes: newScenes
          });
        }
        successCount++;
      }

      setStatus(`Success! Processed ${successCount} chapters.`);
      // Optional: clear file state or redirect?
      // setFileContent(null);
    } catch (e) {
      console.error(e);
      setStatus("Error interacting with AI or Database.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center">
        <h1 className="text-3xl font-serif font-bold text-accent-color">
          Import Project Material
        </h1>
        <p className="text-text-secondary mt-2">
          Bring your existing work into the AI workflow.
        </p>
      </div>

      {/* Progress Tracker */}
      <ImportProgressTracker />

      {/* AI Model Settings */}
      <ModelSelector />

      {/* Mode Selection */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setMode("overview")}
          className={`px-6 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all w-48 ${mode === "overview" ? "border-accent-color bg-bg-secondary" : "border-border-color bg-bg-primary opacity-60"}`}
        >
          <FileText size={24} />
          <span className="font-bold">Overview / Outline</span>
          <span className="text-xs text-text-muted">
            Generate structure from summary
          </span>
        </button>
        <button
          onClick={() => setMode("draft")}
          className={`px-6 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all w-48 ${mode === "draft" ? "border-accent-color bg-bg-secondary" : "border-border-color bg-bg-primary opacity-60"}`}
        >
          <Upload size={24} />
          <span className="font-bold">Current Draft</span>
          <span className="text-xs text-text-muted">
            Import full text into Editor
          </span>
        </button>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-border-color rounded-xl p-8 text-center bg-bg-secondary/50">
        {!fileName ? (
          <label className="cursor-pointer flex flex-col items-center gap-4 hover:text-accent-color transition-colors">
            <Upload size={48} className="opacity-50" />
            <div>
              <span className="font-bold">Click to upload</span> or drag and
              drop
              <p className="text-xs text-text-muted mt-1">
                .txt, .md, .docx (text only)
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".txt,.md"
              onChange={handleFileUpload}
            />
          </label>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <FileText size={48} className="text-accent-color" />
            <div className="font-bold">{fileName}</div>
            {!isProcessing && status.includes("Success") ? (
              <div className="text-green-500 flex items-center gap-2">
                <CheckCircle size={16} /> {status}
              </div>
            ) : (
              <button
                onClick={() => {
                  setFileName(null);
                  setAnalysisDone(false);
                  setMappings([]);
                  setStatus("");
                }}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* REVIEW TABLE (Draft Mode) */}
      {mode === "draft" && analysisDone && mappings.length > 0 && (
        <div className="bg-bg-secondary border border-border-color rounded-xl overflow-hidden animate-fade-in">
          <div className="p-4 bg-bg-tertiary border-b border-border-color flex justify-between items-center">
            <h3 className="font-bold">Review Import Mappings</h3>
            <span className="text-xs text-text-muted">
              Please confirm where each section should go.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-primary/50 text-left border-b border-border-color">
                  <th className="p-3">Draft Section</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Chapter</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping, idx) => (
                  <tr key={idx} className="border-b border-border-color/50 hover:bg-bg-primary transition-colors">
                    <td className="p-3 font-medium">
                      {mapping.sourceSection}
                      <div className="text-xs text-text-muted font-normal mt-0.5">
                        {(mapping.content.length / 5).toFixed(0)} words
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={mapping.action}
                        onChange={(e) => updateMapping(idx, { action: e.target.value as any })}
                        className={`rounded px-2 py-1 text-xs font-bold uppercase
                                            ${mapping.action === "overwrite" ? "bg-red-500/20 text-red-500" :
                            mapping.action === "create" ? "bg-blue-500/20 text-blue-500" :
                              "bg-gray-500/20 text-gray-500"}
                                         `}
                      >
                        <option value="overwrite">Overwrite</option>
                        <option value="create">Create New</option>
                        <option value="ignore">Ignore</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {mapping.action !== "ignore" && (
                        <select
                          className="bg-bg-primary border border-border-color rounded px-2 py-1 w-full max-w-[200px]"
                          value={mapping.targetChapterId}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateMapping(idx, {
                              targetChapterId: val,
                              action: val === "new" ? "create" : "overwrite"
                            });
                          }}
                        >
                          <option value="new">+ Create New Chapter</option>
                          {chapters.map(ch => (
                            <option key={ch.id} value={ch.id}>
                              {ch.order}. {ch.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Area */}
      {fileName && !status.includes("Success") && (
        <div className="flex justify-center pb-8">
          {mode === "overview" ? (
            <button
              onClick={processOverview}
              disabled={isProcessing}
              className="bg-accent-color text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <Loader className="animate-spin" /> : "Process Overview"}
              {isProcessing ? "Processing..." : ""}
            </button>
          ) : (
            <div className="flex gap-4">
              {!analysisDone ? (
                <button
                  onClick={analyzeDraft}
                  disabled={isProcessing}
                  className="bg-accent-color text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <Loader className="animate-spin" /> : <ArrowRight />}
                  Analyze Draft
                </button>
              ) : (
                <button
                  onClick={executeImport}
                  disabled={isProcessing}
                  className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <Loader className="animate-spin" /> : <Play fill="currentColor" />}
                  Start Import
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Log */}
      {status && (
        <div className="bg-bg-secondary p-4 rounded text-center text-sm font-mono text-text-muted">
          {status}
        </div>
      )}
    </div>
  );
}
