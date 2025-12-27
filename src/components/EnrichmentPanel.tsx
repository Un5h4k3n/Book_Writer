import { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useEnrichmentQueueStore } from '../stores/enrichmentQueueStore';
import { EnrichmentService } from '../services/import/enrichmentService';
import { Sparkles, CheckCircle, AlertCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';

export default function EnrichmentPanel() {
    const { project, chapters, characters, worldItems, updateChapter, updateCharacter, updateWorldItem, deleteCharacter, deleteWorldItem, updateScene } = useProjectStore();
    const { queue, isProcessing, currentItem, processedCount, addBatch, clearQueue, setCurrentItem, markComplete, markError, startProcessing, stopProcessing } = useEnrichmentQueueStore();
    const [duplicateSuggestions, setDuplicateSuggestions] = useState<{ originalId: string; duplicateId: string; reason: string; type: 'character' | 'world' }[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Queue Processing Loop
    useEffect(() => {
        console.log('⚡ Effect triggered. isProcessing:', isProcessing, 'queue length:', queue.length);
        if (!isProcessing) return;

        const processNext = async () => {
            console.log('🔄 Processing next item...');
            const next = queue.find(item => item.status === 'pending');

            if (!next) {
                stopProcessing();
                return;
            }

            setCurrentItem(next);
            const projectContext = project
                ? `Title: ${project.title}, Genre: ${project.genre || 'General Fiction'}`
                : 'Unknown Project';

            try {
                if (next.type === 'chapter') {
                    const ch = chapters.find(c => c.id === next.id);
                    if (ch) {
                        console.log('🔧 Enriching chapter:', ch.title);
                        const enriched = await EnrichmentService.enrichChapter(ch, projectContext);
                        console.log('✅ Chapter enrichment result:', enriched);
                        updateChapter(ch.id, enriched);

                        // Also enrich scenes in the chapter
                        for (const scene of ch.scenes) {
                            if (!scene.goals || !scene.conflict || !scene.outcome) {
                                console.log('🎬 Enriching scene:', scene.title);
                                const chapterContext = `Chapter: ${ch.title}\nSummary: ${ch.summary}`;
                                const sceneEnriched = await EnrichmentService.enrichScene(scene, chapterContext);
                                console.log('✅ Scene enrichment result:', sceneEnriched);
                                updateScene(scene.id, sceneEnriched);
                            }
                        }
                    }
                } else if (next.type === 'character') {
                    const char = characters.find(c => c.id === next.id);
                    if (char) {
                        const enriched = await EnrichmentService.enrichCharacter(char, projectContext, characters);
                        if (enriched.mergeWithId) {
                            // Handle merge suggestion logic if needed, or just enrich
                            // For auto-enrich, we might ignore merge suggestions or log them
                            // For now, let's just update the character
                            delete enriched.mergeWithId;
                        }
                        updateCharacter(char.id, enriched);
                    }
                } else if (next.type === 'world') {
                    const item = worldItems.find(w => w.id === next.id);
                    if (item) {
                        const enriched = await EnrichmentService.enrichWorldItem(item, projectContext, worldItems);
                        if (enriched.mergeWithId) delete enriched.mergeWithId;
                        updateWorldItem(item.id, enriched);
                    }
                }

                markComplete(next.id);
            } catch (e) {
                console.error('Enrichment error:', e);
                markError(next.id, (e as Error).message);
            } finally {
                setCurrentItem(null);
            }
        };

        processNext();

    }, [isProcessing, queue, processedCount, project, chapters, characters, worldItems]);

    // Derived counts
    const pendingCount = queue.filter(item => item.status === 'pending').length;
    const errorCount = queue.filter(item => item.status === 'error').length;
    const completeCount = processedCount;

    // Derived incomplete lists
    const incompleteData = EnrichmentService.identifyIncompleteItems({ chapters, characters, worldItems, scenes: [] });
    const chaptersNeedingEnrichment = incompleteData.chapters;
    const charactersNeedingEnrichment = incompleteData.characters;
    const worldItemsNeedingEnrichment = incompleteData.worldItems;

    const processQueue = () => {
        console.log('🚀 Starting queue processing...');
        startProcessing();
    };

    const queueAllForEnrichment = () => {
        console.log('📝 Queueing items for enrichment...');
        console.log('Chapters needing enrichment:', chaptersNeedingEnrichment.length);
        console.log('Characters needing enrichment:', charactersNeedingEnrichment.length);
        console.log('World items needing enrichment:', worldItemsNeedingEnrichment.length);

        const items = [
            ...chaptersNeedingEnrichment.map(c => ({ id: c.id, type: 'chapter' as const, name: c.title })),
            ...charactersNeedingEnrichment.map(c => ({ id: c.id, type: 'character' as const, name: c.name })),
            ...worldItemsNeedingEnrichment.map(w => ({ id: w.id, type: 'world' as const, name: w.name }))
        ];
        console.log('Total items to queue:', items.length, items);

        if (items.length === 0) {
            alert('No items need enrichment. All your content appears complete!');
            return;
        }

        addBatch(items);
        alert(`Queued ${items.length} items for enrichment. Click "Start Processing Queue" to begin.`);
    };

    const queueMissingForEnrichment = () => {
        if (!project) return;
        const incomplete = EnrichmentService.identifyIncompleteItems({ chapters, scenes: [], characters, worldItems }); // Note: structure match? The service expects 'project' which usually has these arrays attached.
        // Actually, identifyIncompleteItems expects an object with those keys.
        // Let's call it correctly:
        const partialProject = { chapters, characters, worldItems };
        const missing = EnrichmentService.identifyIncompleteItems(partialProject);

        const items = [
            ...missing.chapters.map(c => ({ id: c.id, type: 'chapter' as const, name: c.title })),
            ...missing.characters.map(c => ({ id: c.id, type: 'character' as const, name: c.name })),
            ...missing.worldItems.map(w => ({ id: w.id, type: 'world' as const, name: w.name }))
        ];

        // Also scenes
        missing.scenes.forEach(s => {
            // Scene enrichment is usually triggered by chapter, but we can queue scene separately if we support it?
            // QueueStore supports 'chapter', 'character', 'world'. It doesn't seem to explicitly support 'scene' as a top level type in the UI list logic previously shown?
            // Looking at the previous code: processQueue handles 'chapter', 'character', 'world'.
            // Scenes are enriched nestedly in chapters.
            // If we queue the *Chapter* of the missing scene, it will re-enrich the scenes too.
            const ch = chapters.find(c => c.id === s.chapterId);
            if (ch && !items.find(i => i.id === ch.id)) {
                items.push({ id: ch.id, type: 'chapter', name: ch.title });
            }
        });

        addBatch(items);
    };

    const scanForDuplicates = async () => {
        console.log('🔍 Starting duplicate scan...');
        setIsScanning(true);
        setDuplicateSuggestions([]);

        // Scan Characters
        if (characters.length > 1) {
            const charDups = await EnrichmentService.detectDuplicates(characters);
            const formattedCharDups = charDups.map(d => ({ ...d, type: 'character' as const }));
            setDuplicateSuggestions(prev => [...prev, ...formattedCharDups]);
        }

        // Scan World Items
        if (worldItems.length > 1) {
            const worldDups = await EnrichmentService.detectDuplicates(worldItems);
            const formattedWorldDups = worldDups.map(d => ({ ...d, type: 'world' as const }));
            setDuplicateSuggestions(prev => [...prev, ...formattedWorldDups]);
        }

        setIsScanning(false);
    };

    const executeMerge = async (suggestion: { originalId: string; duplicateId: string; type: 'character' | 'world' }) => {
        console.log('Executing merge for:', suggestion);
        alert(`Starting merge of ${suggestion.type}: ${suggestion.originalId} ← ${suggestion.duplicateId}`);
        const origId = suggestion.originalId.trim();
        const dupId = suggestion.duplicateId.trim();

        // Find entities
        if (suggestion.type === 'character') {
            const original = characters.find(c => c.id === origId);
            const duplicate = characters.find(c => c.id === dupId);

            if (!original || !duplicate) {
                console.error('Character not found:', { original, duplicate, origId, dupId });
                alert('Could not find one of the characters to merge. Check console for details.');
                return;
            }

            try {
                const merged = await EnrichmentService.mergeEntities(original, duplicate, 'character');
                // Update original
                updateCharacter(original.id, merged);
                // Delete duplicate
                deleteCharacter(duplicate.id);
                // Remove from suggestions
                setDuplicateSuggestions(prev => prev.filter(s => s.duplicateId !== suggestion.duplicateId));
                alert(`✓ Successfully merged ${duplicate.name} into ${original.name}!`);
            } catch (e) {
                console.error('Merge execution failed:', e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert(`Merge failed: ${errorMessage}\n\nCheck console for details.`);
            }
        } else {
            const original = worldItems.find(w => w.id === origId);
            const duplicate = worldItems.find(w => w.id === dupId);

            if (!original || !duplicate) {
                console.error('World item not found:', { original, duplicate, origId, dupId });
                alert('Could not find world items to merge.');
                return;
            }

            try {
                const merged = await EnrichmentService.mergeEntities(original, duplicate, 'worldItem');
                updateWorldItem(original.id, merged);
                deleteWorldItem(duplicate.id);
                setDuplicateSuggestions(prev => prev.filter(s => s.duplicateId !== suggestion.duplicateId));
                alert(`✓ Successfully merged ${duplicate.name} into ${original.name}!`);
            } catch (e) {
                console.error('Merge execution failed:', e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert(`Merge failed: ${errorMessage}\n\nCheck console for details.`);
            }
        }
    };

    return (
        <div className="bg-bg-secondary border border-border-color rounded-lg overflow-hidden mb-4">
            {/* Header */}
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-bg-tertiary"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Sparkles size={18} className="text-accent-color" />
                    <span className="font-bold">AI Enrichment & Cleanup</span>
                </div>
            </div>

            {expanded && (
                <div className="p-4 pt-0 border-t border-border-color">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 my-4 text-center text-sm">
                        <div className="bg-bg-primary rounded p-2">
                            <div className="font-bold">{chaptersNeedingEnrichment.length}</div>
                            <div className="text-xs text-text-muted">New Chapters</div>
                        </div>
                        <div className="bg-bg-primary rounded p-2">
                            <div className="font-bold">{charactersNeedingEnrichment.length}</div>
                            <div className="text-xs text-text-muted">Unfinished Chars</div>
                        </div>
                        <div className="bg-bg-primary rounded p-2">
                            <div className="font-bold">{worldItemsNeedingEnrichment.length}</div>
                            <div className="text-xs text-text-muted">Stub Items</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex gap-2">
                            <button
                                onClick={queueAllForEnrichment}
                                className="flex-1 bg-accent-color text-white px-3 py-2 rounded text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} />
                                Enrich New
                            </button>
                            <button
                                onClick={queueMissingForEnrichment}
                                className="flex-1 bg-bg-tertiary border border-accent-color text-accent-color px-3 py-2 rounded text-sm font-bold hover:bg-accent-color/10 flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} />
                                Fill Missing
                            </button>
                        </div>

                        <button
                            onClick={scanForDuplicates}
                            disabled={isScanning}
                            className="w-full bg-bg-tertiary border border-border-color text-text-primary px-3 py-2 rounded text-sm font-bold hover:bg-bg-primary flex items-center justify-center gap-2"
                        >
                            {isScanning ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            {isScanning ? "Scanning..." : "Scan for Duplicates"}
                        </button>
                    </div>

                    {/* Duplicate Suggestions */}
                    {duplicateSuggestions.length > 0 && (
                        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                            <div className="text-xs font-bold text-yellow-500 uppercase mb-2">Potential Duplicates Found</div>
                            <div className="space-y-2">
                                {duplicateSuggestions.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm bg-bg-primary p-2 rounded">
                                        <div>
                                            <div className="font-bold">{s.originalId} ← {s.duplicateId}</div>
                                            <div className="text-xs text-text-muted">{s.reason}</div>
                                        </div>
                                        <button
                                            onClick={() => executeMerge(s)}
                                            className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-bold hover:opacity-80"
                                        >
                                            Merge
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {errorCount > 0 && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded p-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                                    <AlertCircle size={12} /> {errorCount} Failed
                                </div>
                                <button onClick={clearQueue} className="text-[10px] text-red-500 hover:underline">Clear Queue</button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {queue.filter(i => i.status === 'error').map(item => (
                                    <div key={item.id} className="text-xs text-red-400">
                                        <span className="font-bold">{item.name}:</span> {item.error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Processing Status */}
                    {isProcessing && (
                        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded p-3 animate-pulse">
                            <div className="flex items-center gap-2 text-blue-400 text-sm">
                                <Loader size={16} className="animate-spin" />
                                <span className="font-bold">Processing...</span>
                            </div>
                            {currentItem && (
                                <div className="text-xs text-blue-300 mt-1">
                                    Current: {currentItem.name} ({currentItem.type})
                                </div>
                            )}
                        </div>
                    )}

                    {/* Process Control */}
                    {queue.length > 0 && pendingCount > 0 && !isProcessing && (
                        <button
                            onClick={processQueue}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold hover:opacity-90 flex items-center justify-center gap-2 mb-2"
                        >
                            <Loader size={16} />
                            Start Processing Queue ({pendingCount})
                        </button>
                    )}

                    {/* Queue List ... (simplified view) */}
                    {queue.length > 0 && (
                        <div className="text-xs text-text-muted text-center mb-2">
                            {completeCount} completed, {errorCount} failed, {pendingCount} pending
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
