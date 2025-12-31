import { useState, useMemo } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  Plus,
  Globe,
  Merge,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  MapPin,
  Zap,
  Flag,
  Cpu,
  Scroll,

  Trash2,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import { useNavigate } from "react-router-dom";
import type { WorldItem, WorldCategory } from "../../types";
import { EnrichmentService } from "../../services/import/enrichmentService";

const CATEGORY_ORDER: WorldCategory[] = [
  "location",
  "faction",
  "supernatural",
  "technology",
  "history",
  "other",
];

const CATEGORY_ICONS: Record<WorldCategory, React.ElementType> = {
  location: MapPin,
  faction: Flag,
  supernatural: Zap,
  technology: Cpu,
  history: Scroll,
  other: Globe,
};

export default function WorldList() {
  const {
    worldItems,
    addWorldItem,
    updateWorldItem,
    deleteWorldItem,
    project,
  } = useProjectStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
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

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, WorldItem[]> = {};
    CATEGORY_ORDER.forEach((cat) => {
      groups[cat] = [];
    });
    // Ensure all categories exist, even if empty, or just filter out empty ones later?
    // Let's populate.
    worldItems.forEach((item) => {
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [worldItems]);

  if (!project)
    return (
      <div className="p-8 text-center text-text-muted">
        No active project found.
      </div>
    );

  const handleCreate = () => {
    const newItem: WorldItem = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: project.id,
      name: "New Item",
      category: "location", // Default to location
      shortDescription: "",
      attributes: {},
    };
    addWorldItem(newItem);
    navigate(`/world/${newItem.id}`);
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
      .map(id => worldItems.find(w => w.id === id))
      .filter((item): item is WorldItem => !!item);

    if (selectedItems.length >= 2) {
      try {
        const merged = await EnrichmentService.mergeEntities(
          selectedItems,
          "worldItem",
        );

        // Keep the first ID as the master
        const masterId = selectedIds[0];

        // Update master with merged result (keeping original ID)
        updateWorldItem(masterId, { ...merged, id: masterId });

        // Delete others
        const start = 1; // start deleting from the second item
        const idsToDelete = selectedIds.slice(start);
        idsToDelete.forEach(id => deleteWorldItem(id));

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
      title: "Delete Items",
      message: `Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`,
      type: "delete",
      onConfirm: () => {
        selectedIds.forEach((id) => deleteWorldItem(id));
        setSelectedIds([]);
      },
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="animate-fade-in space-y-6 h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-color pb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-bold text-accent-color">
            World Building
          </h1>
          <p className="text-text-secondary">
            Lore, Locations, and Rules of "{project.title}"
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
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
              className="flex-1 md:flex-none bg-accent-color text-white px-4 py-2 rounded-md hover:bg-accent-hover flex justify-center items-center gap-2 shadow-sm animate-pulse"
              disabled={isMerging}
            >
              <Merge size={18} className={isMerging ? "animate-spin" : ""} />
              {isMerging ? "Merging..." : "Merge Selected"}
            </button>
          )}
          <button
            onClick={handleCreate}
            className="flex-1 md:flex-none bg-bg-tertiary text-text-primary border border-border-color px-4 py-2 rounded-md hover:bg-bg-primary flex justify-center items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Add Element
          </button>
        </div>
      </header >

      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {CATEGORY_ORDER.map((category) => {
          const items = groupedItems[category];
          if (!items || items.length === 0) return null;

          const isCollapsed = collapsedCategories[category];
          const Icon = CATEGORY_ICONS[category] || Globe;

          return (
            <div key={category} className="mb-6">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 p-2 hover:bg-bg-secondary rounded transition-colors group mb-2 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight size={16} className="text-text-muted" />
                ) : (
                  <ChevronDown size={16} className="text-text-muted" />
                )}
                <div className="p-1.5 bg-bg-tertiary rounded text-accent-color">
                  <Icon size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex-1">
                  {category}
                </h2>
                <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-1 ml-2 md:ml-4 border-l border-border-color pl-2 md:pl-4">
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/world/${item.id}`)}
                        className={`group/item flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                            ${isSelected
                            ? "bg-accent-color/10 border-accent-color"
                            : "bg-bg-secondary border-transparent hover:border-border-color hover:bg-bg-primary"
                          }
                        `}
                      >
                        {/* Checkbox for Selection */}
                        <div
                          onClick={(e) => toggleSelection(e, item.id)}
                          className="flex-shrink-0 text-text-muted hover:text-accent-color transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-accent-color" />
                          ) : (
                            <Square size={18} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold font-serif text-base truncate">
                              {item.name}
                            </h3>
                            {/* Attributes Preview (Desktop only) */}
                            <div className="hidden md:flex gap-1">
                              {Object.keys(item.attributes).slice(0, 3).map(k => (
                                <span key={k} className="text-[10px] bg-bg-tertiary px-1.5 rounded text-text-muted truncate max-w-[80px]">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-text-secondary truncate">
                            {item.shortDescription || "No description provided."}
                          </p>
                        </div>

                        {/* Mobile Arrow / Action */}
                        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({
                                isOpen: true,
                                title: "Delete Item",
                                message: "Are you sure you want to delete this item?",
                                type: "delete",
                                onConfirm: () => deleteWorldItem(item.id),
                              });
                            }}
                            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                          <ChevronRight size={16} className="text-text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {worldItems.length === 0 && (
          <div className="py-12 text-center text-text-muted border-2 border-dashed border-border-color rounded-lg bg-bg-secondary/50">
            <Globe className="mx-auto mb-3 opacity-20" size={48} />
            <p className="mb-2 font-medium">The world is a blank canvas.</p>
            <button
              onClick={handleCreate}
              className="text-accent-color hover:underline font-bold"
            >
              Forge your first element.
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
