/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { OutlinerService } from "../../services/ai/outliner";
import EnrichmentPanel from "../../components/EnrichmentPanel";
import RecommendationPanel from "../../components/RecommendationPanel";
import OutlineQAPanel from "../../components/OutlineQAPanel";
import {
  Plus,
  Wand2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Users,
  Target,
  AlertTriangle,
  Zap,
  Trash2,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import type { Scene, Chapter } from "../../types";

const genId = () => Math.random().toString(36).substring(2, 9);

// Color mapping for acts
const actColors: Record<string, string> = {
  setup: "bg-blue-500/20 text-blue-400",
  rising: "bg-green-500/20 text-green-400",
  climax: "bg-red-500/20 text-red-400",
  falling: "bg-orange-500/20 text-orange-400",
  resolution: "bg-purple-500/20 text-purple-400",
};

const pacingColors: Record<string, string> = {
  slow: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  fast: "bg-red-500/20 text-red-400",
};

export default function OutlinePage() {
  const { project, chapters, addChapter, updateChapter, deleteChapter, deleteScene, updateScene } =
    useProjectStore();
  const [expandedChapters, setExpandedChapters] = useState<
    Record<string, boolean>
  >({});
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>(
    {},
  );
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingChapterId, setGeneratingChapterId] = useState<string | null>(
    null,
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "warning" | "error" | "info" | "delete";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "warning",
  });

  const toggleExpand = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSceneExpand = (id: string) => {
    setExpandedScenes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateOutline = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const newChaptersData =
        await OutlinerService.generateInitialChapters(project);
      let order = chapters.length + 1;
      for (const ch of newChaptersData) {
        const newChapter: Chapter = {
          id: genId(),
          projectId: project.id,
          title: ch.title,
          order: order++,
          summary: ch.summary,
          scenes: [],
          act: ch.act,
          primaryPov: ch.primaryPov,
          chapterGoal: ch.chapterGoal,
          chapterForeshadowing: ch.chapterForeshadowing,
          theme: ch.theme,
          openingHook: ch.openingHook,
          closingImage: ch.closingImage,
        };
        addChapter(newChapter);
      }
    } catch {
      alert("Error generating outline.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScenes = async (chapter: Chapter) => {
    if (!project) return;
    setGeneratingChapterId(chapter.id);
    try {
      const scenesData = await OutlinerService.expandChapterToScenes(
        chapter,
        project,
      );
      const newScenes: Scene[] = scenesData.map((s) => ({
        id: genId(),
        title: s.title,
        summary: s.summary,
        beatSheet: [],
        content: "",
        status: "drafting",
        pov: s.pov,
        goals: s.goals,
        stakes: s.stakes,
        conflict: s.conflict,
        outcome: s.outcome,
        foreshadowing: s.foreshadowing,
        mood: s.mood,
        location: s.location,
        tensionLevel: s.tensionLevel,
        pacing: s.pacing,
        charactersPresent: s.charactersPresent,
        plotFunction: s.plotFunction,
      }));
      updateChapter(chapter.id, { scenes: [...chapter.scenes, ...newScenes] });
      setExpandedChapters((prev) => ({ ...prev, [chapter.id]: true }));
    } catch (e) {
      console.error(e);
      alert("Failed to generate scenes.");
    } finally {
      setGeneratingChapterId(null);
    }
  };

  // Reusable Input Component
  const Field = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    className = "",
  }: any) => (
    <div className={className}>
      <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm focus:border-accent-color focus:outline-none resize-none h-20"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === "select" ? (
        <select
          className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm focus:border-accent-color focus:outline-none"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {placeholder}
        </select>
      ) : (
        <input
          type={type}
          className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm focus:border-accent-color focus:outline-none"
          value={value || ""}
          onChange={(e) =>
            onChange(
              type === "number"
                ? parseInt(e.target.value) || 0
                : e.target.value,
            )
          }
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <header className="flex justify-between items-center border-b border-border-color pb-4 mb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-accent-color">
            Outline
          </h1>
          <p className="text-text-secondary">Structure your narrative arc.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateOutline}
            disabled={loading}
            className="bg-bg-tertiary text-text-primary px-4 py-2 rounded-md hover:text-accent-color flex items-center gap-2 border border-border-color"
          >
            <Wand2 size={18} />{" "}
            {loading ? "Dreaming..." : "Auto-Generate Chapters"}
          </button>
        </div>
      </header>

      {/* AI Panels */}
      <OutlineQAPanel />
      <RecommendationPanel />
      <EnrichmentPanel />

      <div className="flex-1 overflow-y-auto space-y-4 pb-20">
        {chapters.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border-color rounded-lg">
            <p className="text-text-muted mb-4">No chapters defined.</p>
            <button
              onClick={handleGenerateOutline}
              className="text-accent-color font-bold flex items-center justify-center gap-2 mx-auto"
            >
              <Wand2 size={16} /> Let Tehk create an outline
            </button>
          </div>
        )}

        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="bg-bg-secondary border border-border-color rounded-lg overflow-hidden transition-all duration-200"
          >
            {/* Chapter Header */}
            <div
              className="p-4 flex items-center gap-4 hover:bg-bg-tertiary transition-colors cursor-pointer group"
              onClick={() => toggleExpand(chapter.id)}
            >
              <button className="text-text-muted hover:text-accent-color transition-colors">
                {expandedChapters[chapter.id] ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold font-serif text-lg group-hover:text-accent-color transition-colors">
                    Ch {chapter.order}: {chapter.title}
                  </h3>
                  {chapter.act && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${actColors[chapter.act] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {chapter.act}
                    </span>
                  )}
                  {chapter.primaryPov && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-color/20 text-accent-color font-bold">
                      POV: {chapter.primaryPov}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary line-clamp-2">
                  {chapter.summary}
                </p>
              </div>
              <div className="flex items-center gap-2 pr-4">
                <div className="text-xs font-bold text-text-muted px-2 py-1 bg-bg-primary rounded">
                  {chapter.scenes.length} Scenes
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmModal({
                      isOpen: true,
                      title: "Delete Chapter",
                      message: `Delete Chapter ${chapter.order}: "${chapter.title}"? This will delete all scenes within it and renumber subsequent chapters.`,
                      type: "delete",
                      onConfirm: () => deleteChapter(chapter.id),
                    });
                  }}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Chapter"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Expanded Chapter View */}
            {expandedChapters[chapter.id] && (
              <div className="border-t border-border-color">
                {/* Chapter Metadata Panel */}
                <div className="p-4 bg-bg-primary/50 border-b border-border-color">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase text-text-muted">
                      Chapter Metadata
                    </h4>
                    <button
                      onClick={() =>
                        setEditingChapter(
                          editingChapter === chapter.id ? null : chapter.id,
                        )
                      }
                      className="text-xs text-accent-color hover:underline"
                    >
                      {editingChapter === chapter.id
                        ? "Collapse"
                        : "Edit Details"}
                    </button>
                  </div>

                  {editingChapter === chapter.id ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Field
                        label="Act"
                        value={chapter.act}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { act: v as any })
                        }
                        type="select"
                        placeholder={
                          <>
                            <option value="">Select Act</option>
                            <option value="setup">Setup</option>
                            <option value="rising">Rising Action</option>
                            <option value="climax">Climax</option>
                            <option value="falling">Falling Action</option>
                            <option value="resolution">Resolution</option>
                          </>
                        }
                      />
                      <Field
                        label="Primary POV"
                        value={chapter.primaryPov}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { primaryPov: v })
                        }
                        placeholder="e.g. Jon"
                      />
                      <Field
                        label="Theme"
                        value={chapter.theme}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { theme: v })
                        }
                        placeholder="Central theme"
                      />
                      <Field
                        label="Chapter Goal"
                        value={chapter.chapterGoal}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { chapterGoal: v })
                        }
                        placeholder="What must happen"
                        className="col-span-2"
                      />
                      <Field
                        label="Time Context"
                        value={chapter.timeContext}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { timeContext: v })
                        }
                        placeholder="e.g. Day 3, One year later"
                      />
                      <Field
                        label="Opening Hook"
                        value={chapter.openingHook}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { openingHook: v })
                        }
                        placeholder="How chapter begins"
                        type="textarea"
                      />
                      <Field
                        label="Closing Image"
                        value={chapter.closingImage}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { closingImage: v })
                        }
                        placeholder="How chapter ends"
                        type="textarea"
                      />
                      <Field
                        label="Foreshadowing"
                        value={chapter.chapterForeshadowing}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { chapterForeshadowing: v })
                        }
                        placeholder="Hints planted"
                        type="textarea"
                      />
                      <Field
                        label="Summary"
                        value={chapter.summary}
                        onChange={(v: string) =>
                          updateChapter(chapter.id, { summary: v })
                        }
                        placeholder="Chapter summary"
                        type="textarea"
                        className="col-span-3"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      {chapter.theme && (
                        <div>
                          <span className="text-text-muted">Theme:</span>{" "}
                          {chapter.theme}
                        </div>
                      )}
                      {chapter.chapterGoal && (
                        <div className="col-span-2">
                          <span className="text-text-muted">Goal:</span>{" "}
                          {chapter.chapterGoal}
                        </div>
                      )}
                      {chapter.timeContext && (
                        <div>
                          <span className="text-text-muted">Time:</span>{" "}
                          {chapter.timeContext}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scenes List */}
                <div className="px-4 pb-4 bg-bg-primary/30">
                  <div className="space-y-3 pt-4">
                    {chapter.scenes.map((scene, idx) => {
                      const isExpanded = expandedScenes[scene.id];
                      return (
                        <div
                          key={scene.id}
                          className={`rounded-lg border transition-all ml-6 overflow-hidden ${isExpanded ? "border-accent-color bg-bg-primary shadow-lg" : "border-border-color bg-bg-primary hover:border-text-muted"}`}
                        >
                          {/* Scene Header */}
                          <div
                            className="flex gap-4 p-3 cursor-pointer"
                            onClick={() => toggleSceneExpand(scene.id)}
                          >
                            <div className="pt-1">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isExpanded ? "bg-accent-color text-white" : "bg-accent-color/10 text-accent-color"}`}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm">
                                  {scene.title}
                                </h4>
                                {scene.pov && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-color/20 text-accent-color">
                                    {scene.pov}
                                  </span>
                                )}
                                {scene.pacing && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${pacingColors[scene.pacing] || ""}`}
                                  >
                                    {scene.pacing}
                                  </span>
                                )}
                                {scene.tensionLevel && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                    ⚡{scene.tensionLevel}/10
                                  </span>
                                )}
                              </div>
                              {!isExpanded && (
                                <p className="text-xs text-text-secondary line-clamp-1 mt-1">
                                  {scene.summary}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-text-muted">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Delete Scene",
                                    message: `Delete "${scene.title}"?`,
                                    type: "delete",
                                    onConfirm: () => deleteScene(chapter.id, scene.id),
                                  });
                                }}
                                className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete Scene"
                              >
                                <Trash2 size={14} />
                              </button>
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </div>
                          </div>

                          {/* Expanded Scene Editor */}
                          {isExpanded && (
                            <div className="p-4 pt-0 border-t border-border-color/50 space-y-4">
                              {/* Core Narrative */}
                              <div className="grid grid-cols-3 gap-3 pt-4">
                                <Field
                                  label="POV Character"
                                  value={scene.pov}
                                  onChange={(v: string) =>
                                    updateScene(scene.id, { pov: v })
                                  }
                                  placeholder="Who sees this?"
                                />
                                <Field
                                  label="Location"
                                  value={scene.location}
                                  onChange={(v: string) =>
                                    updateScene(scene.id, { location: v })
                                  }
                                  placeholder="Where?"
                                />
                                <Field
                                  label="Mood"
                                  value={scene.mood}
                                  onChange={(v: string) =>
                                    updateScene(scene.id, { mood: v })
                                  }
                                  placeholder="e.g. tense, hopeful"
                                />
                              </div>

                              {/* Goals, Stakes, Conflict */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col">
                                  <label className="text-[10px] font-bold uppercase text-text-muted mb-1 flex items-center gap-1">
                                    <Target size={12} /> Goal
                                  </label>
                                  <input
                                    className="flex-1 p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.goals || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        goals: e.target.value,
                                      })
                                    }
                                    placeholder="What do they want?"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[10px] font-bold uppercase text-text-muted mb-1 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Stakes
                                  </label>
                                  <input
                                    className="flex-1 p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.stakes || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        stakes: e.target.value,
                                      })
                                    }
                                    placeholder="If they fail..."
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[10px] font-bold uppercase text-text-muted mb-1 flex items-center gap-1">
                                    <Zap size={12} /> Conflict
                                  </label>
                                  <input
                                    className="flex-1 p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.conflict || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        conflict: e.target.value,
                                      })
                                    }
                                    placeholder="The obstacle"
                                  />
                                </div>
                              </div>

                              {/* Pacing & Tension */}
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                                    Pacing
                                  </label>
                                  <select
                                    className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.pacing || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        pacing: e.target.value as any,
                                      })
                                    }
                                  >
                                    <option value="">-</option>
                                    <option value="slow">Slow</option>
                                    <option value="medium">Medium</option>
                                    <option value="fast">Fast</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                                    Tension (1-10)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.tensionLevel || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        tensionLevel:
                                          parseInt(e.target.value) || undefined,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                                    Outcome
                                  </label>
                                  <input
                                    className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.outcome || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        outcome: e.target.value,
                                      })
                                    }
                                    placeholder="win/loss/pivot"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                                    Plot Function
                                  </label>
                                  <input
                                    className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                    value={scene.plotFunction || ""}
                                    onChange={(e) =>
                                      updateScene(scene.id, {
                                        plotFunction: e.target.value,
                                      })
                                    }
                                    placeholder="introduce/reveal"
                                  />
                                </div>
                              </div>

                              {/* Summary & Foreshadowing */}
                              <div className="grid grid-cols-2 gap-3">
                                <Field
                                  label="Summary"
                                  value={scene.summary}
                                  onChange={(v: string) =>
                                    updateScene(scene.id, { summary: v })
                                  }
                                  placeholder="What happens"
                                  type="textarea"
                                />
                                <Field
                                  label="Foreshadowing"
                                  value={scene.foreshadowing}
                                  onChange={(v: string) =>
                                    updateScene(scene.id, { foreshadowing: v })
                                  }
                                  placeholder="Hints for later"
                                  type="textarea"
                                />
                              </div>

                              {/* Characters */}
                              <div>
                                <label className="text-[10px] font-bold uppercase text-text-muted block mb-1 flex items-center gap-1">
                                  <Users size={12} /> Characters Present
                                </label>
                                <input
                                  className="w-full p-2 bg-bg-secondary border border-border-color rounded text-sm"
                                  value={(scene.charactersPresent || []).join(
                                    ", ",
                                  )}
                                  onChange={(e) =>
                                    updateScene(scene.id, {
                                      charactersPresent: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="Comma-separated names"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Action Footer */}
                    <div className="ml-6 flex gap-4 pt-2">
                      <button className="text-xs text-text-muted hover:text-accent-color flex items-center gap-1">
                        <Plus size={14} /> Add Scene Manually
                      </button>
                      <button
                        onClick={() => handleGenerateScenes(chapter)}
                        disabled={generatingChapterId === chapter.id}
                        className="text-xs text-accent-color font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {generatingChapterId === chapter.id ? (
                          <span className="animate-pulse">Generating...</span>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            {chapter.scenes.length === 0
                              ? "Generate Scenelist"
                              : "Add More Scenes (AI)"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
      />
    </div >
  );
}
