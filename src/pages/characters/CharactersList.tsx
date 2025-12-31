import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  Plus,
  User as UserIcon,
  Merge,
  CheckSquare,
  Square,

  Trash2,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import { useNavigate } from "react-router-dom";
import type { Character } from "../../types";
import { EnrichmentService } from "../../services/import/enrichmentService";

export default function CharactersList() {
  const {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    project,
  } = useProjectStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
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

  if (!project) return <div className="p-8 text-center text-text-muted">No active project found.</div>;

  const handleCreate = () => {
    const newChar: Character = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: project.id,
      name: "New Character",
      archetype: "Unknown",
      role: "supporting",
      shortDescription: "",
      attributes: {},
    };
    addCharacter(newChar);
    navigate(`/characters/${newChar.id}`);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) return;
    setIsMerging(true);

    // Get all selected items
    const selectedItems = selectedIds
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is Character => !!c);

    if (selectedItems.length >= 2) {
      try {
        const merged = await EnrichmentService.mergeEntities(
          selectedItems,
          "character",
        );

        // Keep the first ID as the master
        const masterId = selectedIds[0];

        // Update master with merged result (keeping original ID)
        updateCharacter(masterId, { ...merged, id: masterId });

        // Delete others
        const start = 1; // start deleting from the second item
        const idsToDelete = selectedIds.slice(start);
        idsToDelete.forEach(id => deleteCharacter(id));

        setSelectedIds([]);
      } catch (e) {
        console.error(e);
        alert("Merge failed.");
      }
    }
    setIsMerging(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Delete Characters",
      message: `Are you sure you want to delete ${selectedIds.length} characters? This cannot be undone.`,
      type: "delete",
      onConfirm: () => {
        selectedIds.forEach((id) => deleteCharacter(id));
        setSelectedIds([]);
      },
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex justify-between items-center border-b border-border-color pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-accent-color">
            Characters
          </h1>
          <p className="text-text-secondary">Cast of "{project.title}"</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-md hover:bg-red-500/20 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Trash2 size={18} />
              <span className="hidden md:inline">Delete ({selectedIds.length})</span>
            </button>
          )}
          {selectedIds.length >= 2 && (
            <button
              onClick={handleMerge}
              className="bg-accent-color text-white px-4 py-2 rounded-md hover:bg-accent-hover flex items-center gap-2 shadow-sm animate-pulse"
              disabled={isMerging}
            >
              <Merge size={18} className={isMerging ? "animate-spin" : ""} />
              {isMerging ? "Merging..." : "Merge Selected"}
            </button>
          )}
          <button
            onClick={handleCreate}
            className="bg-bg-tertiary text-text-primary border border-border-color px-4 py-2 rounded-md hover:bg-bg-primary flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Add Character
          </button>
        </div>
      </header >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => {
          const isSelected = selectedIds.includes(char.id);
          return (
            <div
              key={char.id}
              onClick={() => navigate(`/characters/${char.id}`)}
              className={`group bg-bg-secondary p-5 rounded-lg border shadow-sm transition-all cursor-pointer relative ${isSelected ? "border-accent-color ring-1 ring-accent-color" : "border-border-color hover:border-accent-color hover:shadow-md"}`}
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmModal({
                      isOpen: true,
                      title: "Delete Character",
                      message: "Are you sure you want to delete this character?",
                      type: "delete",
                      onConfirm: () => deleteCharacter(char.id),
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </div>
                <div
                  onClick={(e) => toggleSelection(e, char.id)}
                  className="cursor-pointer"
                >
                  {isSelected ? (
                    <CheckSquare className="text-accent-color fill-accent-color/10" />
                  ) : (
                    <Square className="text-text-muted hover:text-accent-color" />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-start mb-2">
                <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center text-accent-color">
                  <UserIcon size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted border border-border-color px-2 py-1 rounded-full mr-8">
                  {char.role}
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-accent-color transition-colors">
                {char.name}
              </h3>
              <p className="text-xs text-text-muted uppercase mb-3">
                {char.archetype}
              </p>
              <p className="text-sm text-text-secondary line-clamp-2">
                {char.shortDescription || "No description yet."}
              </p>

              {/* Attribute Tags Preview */}
              <div className="mt-4 flex flex-wrap gap-1">
                {Object.keys(char.attributes || {})
                  .slice(0, 3)
                  .map((key) => (
                    <span
                      key={key}
                      className="text-[10px] bg-bg-primary px-2 py-1 rounded-sm text-text-muted"
                    >
                      {key}
                    </span>
                  ))}
                {Object.keys(char.attributes || {}).length > 3 && (
                  <span className="text-[10px] text-text-muted px-1">...</span>
                )}
              </div>
            </div>
          );
        })}

        {characters.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-border-color rounded-lg">
            <p className="mb-2">No characters yet.</p>
            <button
              onClick={handleCreate}
              className="text-accent-color hover:underline"
            >
              Create your protagonist.
            </button>
          </div>
        )}
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
