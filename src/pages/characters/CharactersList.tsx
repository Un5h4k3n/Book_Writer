import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, User as UserIcon, Merge, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Character } from '../../types';
import { EnrichmentService } from '../../services/import/enrichmentService';

export default function CharactersList() {
  const { characters, addCharacter, updateCharacter, deleteCharacter, project } = useProjectStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleCreate = () => {
    const newChar: Character = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: project.id,
      name: 'New Character',
      archetype: 'Unknown',
      role: 'supporting',
      shortDescription: '',
      attributes: {}
    };
    addCharacter(newChar);
    navigate(`/characters/${newChar.id}`);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedIds.length < 2) {
        setSelectedIds(prev => [...prev, id]);
      } else {
        // Replace the second one or do nothing? Let's just allow max 2 for merge
        // Or allow multiselect but disable merge? 
        // Better UX: Allow selecting more, but only enable merge if exactly 2.
        setSelectedIds(prev => [...prev, id]);
      }
    }
  };

  const handleMerge = async () => {
    if (selectedIds.length !== 2) return;
    setIsMerging(true);
    const [idA, idB] = selectedIds;
    const charA = characters.find(c => c.id === idA);
    const charB = characters.find(c => c.id === idB);

    if (charA && charB) {
      try {
        const merged = await EnrichmentService.mergeEntities(charA, charB, 'character');
        // Update A with merged result
        updateCharacter(idA, merged);
        // Delete B
        deleteCharacter(idB);
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
          <h1 className="text-3xl font-serif font-bold text-accent-color">Characters</h1>
          <p className="text-text-secondary">Cast of "{project.title}"</p>
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
            <Plus size={18} /> Add Character
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map(char => {
          const isSelected = selectedIds.includes(char.id);
          return (
            <div
              key={char.id}
              onClick={() => navigate(`/characters/${char.id}`)}
              className={`group bg-bg-secondary p-5 rounded-lg border shadow-sm transition-all cursor-pointer relative ${isSelected ? 'border-accent-color ring-1 ring-accent-color' : 'border-border-color hover:border-accent-color hover:shadow-md'}`}
            >
              <div className="absolute top-4 right-4 z-10" onClick={(e) => toggleSelection(e, char.id)}>
                {isSelected ? <CheckSquare className="text-accent-color fill-accent-color/10" /> : <Square className="text-text-muted hover:text-accent-color" />}
              </div>

              <div className="flex justify-between items-start mb-2">
                <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center text-accent-color">
                  <UserIcon size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted border border-border-color px-2 py-1 rounded-full mr-8">
                  {char.role}
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-accent-color transition-colors">{char.name}</h3>
              <p className="text-xs text-text-muted uppercase mb-3">{char.archetype}</p>
              <p className="text-sm text-text-secondary line-clamp-2">
                {char.shortDescription || "No description yet."}
              </p>

              {/* Attribute Tags Preview */}
              <div className="mt-4 flex flex-wrap gap-1">
                {Object.keys(char.attributes || {}).slice(0, 3).map(key => (
                  <span key={key} className="text-[10px] bg-bg-primary px-2 py-1 rounded-sm text-text-muted">
                    {key}
                  </span>
                ))}
                {Object.keys(char.attributes || {}).length > 3 && <span className="text-[10px] text-text-muted px-1">...</span>}
              </div>
            </div>
          )
        })}

        {characters.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-border-color rounded-lg">
            <p className="mb-2">No characters yet.</p>
            <button onClick={handleCreate} className="text-accent-color hover:underline">Create your protagonist.</button>
          </div>
        )}
      </div>
    </div >
  );
}
