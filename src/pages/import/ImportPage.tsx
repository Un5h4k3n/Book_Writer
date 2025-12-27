import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useImportJobStore } from '../../stores/importJobStore';
import { ChunkingService } from '../../services/import/chunker';
import { ImportAnalyzer } from '../../services/import/importAnalyzer';
import ImportProgressTracker from '../../components/ImportProgressTracker';
import ModelSelector from '../../components/ModelSelector';
import { Upload, FileText, CheckCircle, Loader, Trash2 } from 'lucide-react';
import type { Chapter, Scene, WorldCategory } from '../../types';
import type { ChangeEvent } from 'react';

// Temporary ID generator since we removed uuid
const genId = () => Math.random().toString(36).substring(2, 9);

export default function ImportPage() {
    const { addChapter, addCharacter, addWorldItem } = useProjectStore();
    const importProgress = useImportJobStore(s => s.progress);
    const [mode, setMode] = useState<'overview' | 'draft'>('overview');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string>('');

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setFileContent(event.target?.result as string);
            setFileName(file.name);
        };
        reader.readAsText(file);
    };

    const handleReset = async () => {
        if (confirm('WARNING: This will delete ALL current project data (chapters, characters, world items) and cannot be undone. Are you sure you want to start fresh?')) {
            await clearCurrentProject();
            setStatus('Project data cleared. Ready for re-import.');
            // Also reset import job status if needed
            useImportJobStore.getState().reset();
        }
    };

    const processOverview = async () => {
        if (!fileContent) return;
        setIsProcessing(true);
        setStatus('Starting import with local AI...');

        try {
            // Use new extractStructure with progress tracking
            const result = await ImportAnalyzer.extractStructure(fileContent);

            // 1. Add Chapters & Scenes with enrichment data
            let order = 1;
            for (const ch of result.chapters) {
                const newChapter: Chapter = {
                    id: genId(),
                    projectId: 'default',
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
                    scenes: ch.scenes ? ch.scenes.map((s: any) => ({
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
                        content: '',
                        status: 'drafting'
                    })) : []
                };
                addChapter(newChapter);
            }

            // 2. Add Characters with needsEnrichment flag
            if (result.characters) {
                for (const char of result.characters) {
                    addCharacter({
                        id: genId(),
                        projectId: 'default',
                        name: char.name,
                        role: (['protagonist', 'antagonist', 'supporting', 'minor'].includes(char.role) ? char.role : 'supporting') as any,
                        shortDescription: char.description,
                        needsEnrichment: true,
                        attributes: {}
                    });
                }
            }

            // 3. Add World Items with needsEnrichment flag
            const validCategories: WorldCategory[] = ['location', 'supernatural', 'faction', 'technology', 'history', 'other'];
            if (result.world) {
                for (const item of result.world) {
                    // Map 'magic' to 'supernatural' for backwards compatibility
                    let category = item.category as WorldCategory;
                    if (category === 'magic' as any) category = 'supernatural';
                    if (!validCategories.includes(category)) category = 'other';

                    addWorldItem({
                        id: genId(),
                        projectId: 'default',
                        name: item.name,
                        category,
                        shortDescription: item.description,
                        needsEnrichment: true,
                        attributes: {}
                    });
                }
            }

            setStatus(`✓ Imported ${result.chapters.length} chapters, ${result.characters?.length || 0} characters, and ${result.world?.length || 0} world items.`);
        } catch (e) {
            setStatus('Error processing overview.');
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const processDraft = async () => {
        if (!fileContent) return;
        setIsProcessing(true);
        setStatus('Chunking document...');

        try {
            const chunks = ChunkingService.chunkText(fileContent);
            setStatus(`Found ${chunks.length} sections. Creating Chapters/Scenes...`);

            let order = 1;
            for (const chunk of chunks) {
                // Simple mapping: 1 Chunk = 1 Scene in 1 Chapter (for now)
                // Or try to match existing chapters?

                // For MVP: Create new Chapter for each large chunk
                const sceneId = genId();
                const newScene: Scene = {
                    id: sceneId,
                    title: chunk.title,
                    summary: 'Imported from draft',
                    beatSheet: [],
                    content: chunk.content,
                    status: 'done'
                };

                const newChapter: Chapter = {
                    id: genId(),
                    projectId: 'default',
                    title: chunk.title,
                    order: order++,
                    summary: 'Imported Chapter',
                    scenes: [newScene]
                };
                addChapter(newChapter);
            }
            setStatus(`Imported ${chunks.length} sections as new chapters.`);
        } catch (e) {
            setStatus('Error processing draft.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-serif font-bold text-accent-color">Import Project Material</h1>
                <p className="text-text-secondary mt-2">Bring your existing work into the AI workflow.</p>
            </div>

            {/* Progress Tracker */}
            <ImportProgressTracker />

            {/* AI Model Settings */}
            <ModelSelector />

            {/* Mode Selection */}
            <div className="flex gap-4 justify-center">
                <button
                    onClick={() => setMode('overview')}
                    className={`px-6 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all w-48 ${mode === 'overview' ? 'border-accent-color bg-bg-secondary' : 'border-border-color bg-bg-primary opacity-60'}`}
                >
                    <FileText size={24} />
                    <span className="font-bold">Overview / Outline</span>
                    <span className="text-xs text-text-muted">Generate structure from summary</span>
                </button>
                <button
                    onClick={() => setMode('draft')}
                    className={`px-6 py-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all w-48 ${mode === 'draft' ? 'border-accent-color bg-bg-secondary' : 'border-border-color bg-bg-primary opacity-60'}`}
                >
                    <Upload size={24} />
                    <span className="font-bold">Current Draft</span>
                    <span className="text-xs text-text-muted">Import full text into Editor</span>
                </button>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border-color rounded-xl p-8 text-center bg-bg-secondary/50">
                {!fileName ? (
                    <label className="cursor-pointer flex flex-col items-center gap-4 hover:text-accent-color transition-colors">
                        <Upload size={48} className="opacity-50" />
                        <div>
                            <span className="font-bold">Click to upload</span> or drag and drop
                            <p className="text-xs text-text-muted mt-1">.txt, .md, .docx (text only)</p>
                        </div>
                        <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
                    </label>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <FileText size={48} className="text-accent-color" />
                        <div className="font-bold">{fileName}</div>
                        {!isProcessing && status.includes('Success') ? (
                            <div className="text-green-500 flex items-center gap-2"><CheckCircle size={16} /> {status}</div>
                        ) : (
                            <button
                                onClick={() => setFileName(null)}
                                className="text-xs text-red-500 hover:underline"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                )
                }
            </div >

            {/* Action Area */}
            {
                fileName && !status.includes('Success') && (
                    <div className="flex justify-center">
                        <button
                            onClick={mode === 'overview' ? processOverview : processDraft}
                            disabled={isProcessing}
                            className="bg-accent-color text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? <Loader className="animate-spin" /> : 'Process File'}
                            {isProcessing ? 'Processing...' : `Import as ${mode === 'overview' ? 'Outline' : 'Draft'}`}
                        </button>
                    </div>
                )
            }

            {/* Status Log */}
            {
                status && (
                    <div className="bg-bg-secondary p-4 rounded text-center text-sm font-mono text-text-muted">
                        {status}
                    </div>
                )
            }
        </div >
    );
}
