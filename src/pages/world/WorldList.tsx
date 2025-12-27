import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Globe, Merge, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorldItem } from '../../types';
import { EnrichmentService } from '../../services/import/enrichmentService';

export default function WorldList() {
    const { worldItems, addWorldItem, updateWorldItem, deleteWorldItem, project } = useProjectStore();
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isMerging, setIsMerging] = useState(false);

    const handleCreate = () => {
        const newItem: WorldItem = {
            id: Math.random().toString(36).substring(2, 9),
            projectId: project.id,
            name: 'New Location',
            category: 'location',
            shortDescription: '',
            attributes: {}
        };
        addWorldItem(newItem);
        navigate(`/world/${newItem.id}`);
    };

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            if (selectedIds.length < 2) {
                setSelectedIds(prev => [...prev, id]);
            } else {
                setSelectedIds(prev => [...prev, id]);
            }
        }
    };

    const handleMerge = async () => {
        if (selectedIds.length !== 2) return;
        setIsMerging(true);
        const [idA, idB] = selectedIds;
        const itemA = worldItems.find(w => w.id === idA);
        const itemB = worldItems.find(w => w.id === idB);

        if (itemA && itemB) {
            try {
                const merged = await EnrichmentService.mergeEntities(itemA, itemB, 'worldItem');
                // Update A with merged result
                updateWorldItem(idA, merged);
                // Delete B
                deleteWorldItem(idB);
                // Reset selection
                setSelectedIds([]);
            } catch (e) {
                console.error(e);
                alert('Merge failed.');
            }
        }
        setIsMerging(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <header className="flex justify-between items-center border-b border-border-color pb-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-accent-color">World Building</h1>
                    <p className="text-text-secondary">Lore, Locations, and Rules of "{project.title}"</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length === 2 && (
                        <button
                            onClick={handleMerge}
                            className="bg-accent-color text-white px-4 py-2 rounded-md hover:bg-accent-hover flex items-center gap-2 shadow-sm animate-pulse"
                            disabled={isMerging}
                        >
                            <Merge size={18} className={isMerging ? "animate-spin" : ""} />
                            {isMerging ? 'Merging...' : 'Merge Selected'}
                        </button>
                    )}
                    <button
                        onClick={handleCreate}
                        className="bg-bg-tertiary text-text-primary border border-border-color px-4 py-2 rounded-md hover:bg-bg-primary flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={18} /> Add Element
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {worldItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/world/${item.id}`)}
                            className={`group bg-bg-secondary p-5 rounded-lg border shadow-sm transition-all cursor-pointer relative ${isSelected ? 'border-accent-color ring-1 ring-accent-color' : 'border-border-color hover:border-accent-color hover:shadow-md'}`}
                        >
                            <div className="absolute top-4 right-4 z-10" onClick={(e) => toggleSelection(e, item.id)}>
                                {isSelected ? <CheckSquare className="text-accent-color fill-accent-color/10" /> : <Square className="text-text-muted hover:text-accent-color" />}
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center text-accent-color">
                                    <Globe size={24} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-text-muted border border-border-color px-2 py-1 rounded-full">
                                    {item.category}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-accent-color transition-colors">{item.name}</h3>
                            <p className="text-sm text-text-secondary line-clamp-2">
                                {item.shortDescription || "No description yet."}
                            </p>

                            {/* Attribute Tags Preview */}
                            <div className="mt-4 flex flex-wrap gap-1">
                                {Object.keys(item.attributes).slice(0, 3).map(key => (
                                    <span key={key} className="text-[10px] bg-bg-primary px-2 py-1 rounded-sm text-text-muted">
                                        {key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {worldItems.length === 0 && (
                    <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-border-color rounded-lg">
                        <p className="mb-2">The world is empty.</p>
                        <button onClick={handleCreate} className="text-accent-color hover:underline">Start building your universe.</button>
                    </div>
                )}
            </div>
        </div >
    );
}
