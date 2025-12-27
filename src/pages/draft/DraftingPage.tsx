import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { DrafterService } from '../../services/ai/drafter';
import { ContextManager } from '../../services/ai/contextManager';
import { AgentService } from '../../services/ai/agent';
import { ChevronDown, ChevronRight, Wand2, BookOpen, PanelLeftClose, PanelLeft, Scissors, Sparkles, X, Send, Loader, Plus, AlertTriangle, RefreshCw, ExternalLink, Bold, Italic } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Scene, Chapter } from '../../types';

// Ideal word count per chapter (configurable based on book style)
const IDEAL_WORDS_PER_CHAPTER = 3000;
const WORD_COUNT_TOLERANCE = 0.3; // 30% tolerance

// Visible scene break marker - using a distinct visible marker
const SCENE_BREAK = '\n\n⁂\n\n'; // Asterism symbol as visual break

const genId = () => Math.random().toString(36).substring(2, 9);

interface NewSceneModalState {
    open: boolean;
    insertAfterIndex: number;
    title: string;
    summary: string;
    pov: string;
    goals: string;
    conflict: string;
    mood: string;
    location: string;
    stakes: string;
    generating: boolean;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    selectionStart: number;
    selectionEnd: number;
    selectedText: string;
}

interface AIEditPanelState {
    open: boolean;
    selectedText: string;
    selectionStart: number;
    selectionEnd: number;
    prompt: string;
    loading: boolean;
    result: string | null;
}

interface SceneContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    sceneId: string;
    sceneIndex: number;
}

export default function DraftingPage() {
    const { sceneId } = useParams();
    const navigate = useNavigate();
    const { chapters, updateChapter, characters, worldItems } = useProjectStore();

    // State
    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const [navCollapsed, setNavCollapsed] = useState(true);
    const [loading, setLoading] = useState(false);
    const [cursorSceneIndex, setCursorSceneIndex] = useState(0);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        selectionStart: 0,
        selectionEnd: 0,
        selectedText: ''
    });

    // New Scene Modal State
    const [newSceneModal, setNewSceneModal] = useState<NewSceneModalState>({
        open: false,
        insertAfterIndex: -1,
        title: '',
        summary: '',
        pov: '',
        goals: '',
        conflict: '',
        mood: '',
        location: '',
        stakes: '',
        generating: false
    });

    // AI Edit Panel State
    const [aiPanel, setAiPanel] = useState<AIEditPanelState>({
        open: false,
        selectedText: '',
        selectionStart: 0,
        selectionEnd: 0,
        prompt: '',
        loading: false,
        result: null
    });

    // Scene Context Menu State (for right-click on scene navigator)
    const [sceneContextMenu, setSceneContextMenu] = useState<SceneContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        sceneId: '',
        sceneIndex: 0
    });

    const [enriching, setEnriching] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    // Get active chapter
    const activeChapter = chapters.find(c => c.id === activeChapterId);

    // Combine all scene content into a single string with visible breaks
    const chapterContent = useMemo(() => {
        if (!activeChapter) return '';
        return activeChapter.scenes.map(s => s.content || '').join(SCENE_BREAK);
    }, [activeChapter]);

    // Parse content back into scenes
    const parseContentToScenes = useCallback((content: string): string[] => {
        return content.split(SCENE_BREAK);
    }, []);

    // Handle content change - update all scenes
    const handleContentChange = useCallback((newContent: string) => {
        if (!activeChapter) return;

        const sceneContents = parseContentToScenes(newContent);
        const updatedScenes = activeChapter.scenes.map((scene, idx) => ({
            ...scene,
            content: sceneContents[idx] || ''
        }));

        // Sync scene count if breaks were added/removed
        if (sceneContents.length > activeChapter.scenes.length) {
            // New scenes created via break insertion
            for (let i = activeChapter.scenes.length; i < sceneContents.length; i++) {
                updatedScenes.push({
                    id: genId(),
                    title: `Scene ${i + 1}`,
                    summary: '',
                    beatSheet: [],
                    content: sceneContents[i] || '',
                    status: 'drafting'
                });
            }
        } else if (sceneContents.length < activeChapter.scenes.length) {
            // Scenes merged via break removal
            updatedScenes.splice(sceneContents.length);
        }

        updateChapter(activeChapter.id, { scenes: updatedScenes });
    }, [activeChapter, parseContentToScenes, updateChapter]);

    // Detect current scene based on content position
    const handleCursorChange = useCallback(() => {
        if (!editorRef.current || !activeChapter) return;

        const content = editorRef.current.innerText || '';
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        // Get approximate cursor position from text before cursor
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const cursorPos = preCaretRange.toString().length;

        let sceneIndex = 0;
        let pos = 0;
        while (pos < cursorPos) {
            const nextBreak = content.indexOf(SCENE_BREAK.trim(), pos);
            if (nextBreak === -1 || nextBreak >= cursorPos) break;
            sceneIndex++;
            pos = nextBreak + SCENE_BREAK.trim().length;
        }

        setCursorSceneIndex(sceneIndex);
    }, [activeChapter]);

    // Keyboard shortcuts for Bold/Italic using execCommand (provides native undo/redo)
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        // Ctrl+B for Bold
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false);
        }

        // Ctrl+I for Italic
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false);
        }

        // Ctrl+Z for Undo (native)
        // Ctrl+Y for Redo (native)
        // These are handled natively by contenteditable
    }, []);

    // Right-click context menu handler
    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();

        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selectionStart: 0,
            selectionEnd: 0,
            selectedText
        });
    }, []);

    // Close context menu
    useEffect(() => {
        const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
        if (contextMenu.visible) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [contextMenu.visible]);

    // Close scene context menu on click
    useEffect(() => {
        const handleClick = () => setSceneContextMenu(prev => ({ ...prev, visible: false }));
        if (sceneContextMenu.visible) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [sceneContextMenu.visible]);

    // Scene right-click handler
    const handleSceneContextMenu = useCallback((e: React.MouseEvent, sceneId: string, sceneIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setSceneContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            sceneId,
            sceneIndex
        });
    }, []);

    // Navigate to scene in outline
    const handleOpenSceneInOutline = useCallback(() => {
        if (sceneContextMenu.sceneId) {
            navigate(`/outline?scene=${sceneContextMenu.sceneId}`);
        }
        setSceneContextMenu(prev => ({ ...prev, visible: false }));
    }, [sceneContextMenu.sceneId, navigate]);

    // Add Scene Break at cursor
    const handleAddSceneBreak = useCallback(() => {
        if (!editorRef.current || !activeChapter) return;

        const cursorPos = contextMenu.selectionStart;
        const content = editorRef.current.value;
        const newContent = content.slice(0, cursorPos) + SCENE_BREAK + content.slice(cursorPos);

        handleContentChange(newContent);
        setContextMenu(prev => ({ ...prev, visible: false }));

        // Open modal for new scene info
        const scenesBefore = content.slice(0, cursorPos).split(SCENE_BREAK).length - 1;
        setNewSceneModal({
            open: true,
            insertAfterIndex: scenesBefore,
            title: '',
            summary: '',
            pov: '',
            goals: '',
            conflict: '',
            mood: '',
            location: '',
            stakes: '',
            generating: false
        });
    }, [activeChapter, contextMenu.selectionStart, handleContentChange]);

    // Open AI Edit Panel
    const handleOpenAIPanel = useCallback(() => {
        setAiPanel({
            open: true,
            selectedText: contextMenu.selectedText,
            selectionStart: contextMenu.selectionStart,
            selectionEnd: contextMenu.selectionEnd,
            prompt: '',
            loading: false,
            result: null
        });
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [contextMenu]);

    // Execute AI Edit
    const handleExecuteAIEdit = useCallback(async () => {
        if (!activeChapter || !aiPanel.prompt.trim()) return;

        setAiPanel(prev => ({ ...prev, loading: true, result: null }));

        try {
            const chapterContext = `Chapter: ${activeChapter.title}\nSummary: ${activeChapter.summary || 'N/A'}`;

            const prompt = `You are a creative writing assistant.

CONTEXT:
${chapterContext}

SELECTED TEXT:
"${aiPanel.selectedText}"

REQUEST:
${aiPanel.prompt}

Provide ONLY the revised text. No explanations.`;

            const response = await AgentService.generateText({
                systemPrompt: 'Output only the replacement text.',
                userPrompt: prompt,
                operation: 'other'
            });

            setAiPanel(prev => ({ ...prev, loading: false, result: response }));
        } catch (error) {
            console.error('AI edit failed:', error);
            setAiPanel(prev => ({ ...prev, loading: false, result: 'Error: Failed to generate edit.' }));
        }
    }, [activeChapter, aiPanel.prompt, aiPanel.selectedText]);

    // Apply AI Edit - then navigate to and select the new text
    const handleApplyAIEdit = useCallback(() => {
        if (!editorRef.current || !aiPanel.result) return;

        const content = editorRef.current.value;
        const insertStart = aiPanel.selectionStart;
        const insertEnd = insertStart + aiPanel.result.length;
        const newContent = content.slice(0, aiPanel.selectionStart) + aiPanel.result + content.slice(aiPanel.selectionEnd);

        handleContentChange(newContent);
        setAiPanel(prev => ({ ...prev, open: false }));

        // Navigate to and select the inserted text
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.setSelectionRange(insertStart, insertEnd);
            }
        }, 50);
    }, [aiPanel, handleContentChange]);

    // Update scene metadata from modal
    const handleUpdateSceneMetadata = useCallback(() => {
        if (!activeChapter || newSceneModal.insertAfterIndex < 0) return;

        const sceneIdx = newSceneModal.insertAfterIndex + 1;
        if (sceneIdx >= activeChapter.scenes.length) return;

        const updatedScenes = activeChapter.scenes.map((scene, idx) =>
            idx === sceneIdx ? {
                ...scene,
                title: newSceneModal.title || scene.title,
                summary: newSceneModal.summary || scene.summary,
                pov: newSceneModal.pov || scene.pov,
                goals: newSceneModal.goals || scene.goals,
                conflict: newSceneModal.conflict || scene.conflict,
                mood: newSceneModal.mood || scene.mood,
                location: newSceneModal.location || scene.location,
                stakes: newSceneModal.stakes || scene.stakes
            } : scene
        );

        updateChapter(activeChapter.id, { scenes: updatedScenes });
        setNewSceneModal(prev => ({ ...prev, open: false }));
    }, [activeChapter, newSceneModal, updateChapter]);

    // Generate scene metadata using AI
    const handleGenerateSceneMetadata = useCallback(async () => {
        if (!activeChapter) return;
        setNewSceneModal(prev => ({ ...prev, generating: true }));

        try {
            const sceneIdx = newSceneModal.insertAfterIndex;
            const prevScene = sceneIdx >= 0 ? activeChapter.scenes[sceneIdx] : null;
            const nextScene = sceneIdx + 2 < activeChapter.scenes.length ? activeChapter.scenes[sceneIdx + 2] : null;

            const prompt = `Generate metadata for a new scene.

CHAPTER: "${activeChapter.title}"

${prevScene ? `PREVIOUS SCENE: "${prevScene.title}"\nSummary: ${prevScene.summary || 'N/A'}` : 'First scene in chapter'}

${nextScene ? `NEXT SCENE: "${nextScene.title}"\nSummary: ${nextScene.summary || 'N/A'}` : 'Last scene in chapter'}

Return JSON:
{
    "title": "Scene title",
    "summary": "What happens",
    "pov": "POV character",
    "goals": "Character goals",
    "conflict": "The obstacle",
    "mood": "Emotional tone",
    "location": "Where",
    "stakes": "What's at risk"
}`;

            const response = await AgentService.generateText({
                systemPrompt: 'Return only valid JSON.',
                userPrompt: prompt,
                operation: 'other'
            });

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                setNewSceneModal(prev => ({
                    ...prev,
                    title: data.title || '',
                    summary: data.summary || '',
                    pov: data.pov || '',
                    goals: data.goals || '',
                    conflict: data.conflict || '',
                    mood: data.mood || '',
                    location: data.location || '',
                    stakes: data.stakes || '',
                    generating: false
                }));
            }
        } catch (error) {
            console.error('Failed to generate:', error);
            setNewSceneModal(prev => ({ ...prev, generating: false }));
        }
    }, [activeChapter, newSceneModal.insertAfterIndex]);

    // Initialize
    useEffect(() => {
        if (sceneId) {
            const chapter = chapters.find(c => c.scenes.some(s => s.id === sceneId));
            if (chapter) {
                setActiveChapterId(chapter.id);
                setExpandedChapters(prev => ({ ...prev, [chapter.id]: true }));
            }
        } else if (chapters.length > 0 && !activeChapterId) {
            setActiveChapterId(chapters[0].id);
            setExpandedChapters({ [chapters[0].id]: true });
        }
    }, [sceneId, chapters, activeChapterId]);

    // Sync editor content when chapter changes
    useEffect(() => {
        if (editorRef.current && activeChapter) {
            const editorContent = editorRef.current.innerText || '';
            // Only update if content is different (prevents cursor jumping)
            if (editorContent.replace(/\s/g, '') !== chapterContent.replace(/\s/g, '')) {
                editorRef.current.innerHTML = chapterContent.replace(/\n/g, '<br>') || '<span class="text-text-muted">Start writing... (Ctrl+B for bold, Ctrl+I for italic)</span>';
            }
        }
    }, [activeChapterId]); // Only on chapter switch, not content change

    // Navigation handlers
    const handleChapterClick = (chapterId: string) => {
        setActiveChapterId(chapterId);
        setExpandedChapters(prev => ({ ...prev, [chapterId]: true }));
    };

    const handleSceneClick = (chapterId: string, sceneIdx: number) => {
        setActiveChapterId(chapterId);
        setExpandedChapters(prev => ({ ...prev, [chapterId]: true }));
        setCursorSceneIndex(sceneIdx);

        if (editorRef.current) {
            editorRef.current.focus();

            // Find the scene break position in the content
            const content = editorRef.current.innerText || '';
            let pos = 0;
            for (let i = 0; i < sceneIdx; i++) {
                const nextBreak = content.indexOf(SCENE_BREAK.trim(), pos);
                if (nextBreak === -1) break;
                pos = nextBreak + SCENE_BREAK.trim().length;
            }

            // Try to place cursor at the beginning of the scene
            // Use a simple approach - scroll the editor
            const textNodes: Text[] = [];
            const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
            let node: Text | null;
            while ((node = walker.nextNode() as Text)) {
                textNodes.push(node);
            }

            let charCount = 0;
            for (const textNode of textNodes) {
                const nodeLength = textNode.textContent?.length || 0;
                if (charCount + nodeLength >= pos) {
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.setStart(textNode, Math.min(pos - charCount, nodeLength));
                    range.collapse(true);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    break;
                }
                charCount += nodeLength;
            }
        }
    };

    const toggleChapterExpand = (chapterId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
    };

    // Draft full chapter
    const handleDraftFullChapter = async () => {
        if (!activeChapter) return;
        setLoading(true);

        try {
            const updatedScenes = [...activeChapter.scenes];

            for (let idx = 0; idx < updatedScenes.length; idx++) {
                const scene = updatedScenes[idx];
                if ((scene.content?.length || 0) > 50) continue;

                const context = await ContextManager.gatherContext(activeChapter.id, scene.id);
                let sceneText = '';

                for (const beat of scene.beatSheet) {
                    const para = await DrafterService.draftParagraph(beat, context, sceneText.slice(-500));
                    sceneText += (sceneText ? '\n\n' : '') + para;
                }

                if (scene.beatSheet.length === 0) {
                    const para = await DrafterService.draftParagraph(scene.summary, context, '');
                    sceneText = para;
                }

                updatedScenes[idx] = { ...scene, content: sceneText, status: 'drafted' as const };
            }

            updateChapter(activeChapter.id, { scenes: updatedScenes });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Enrich chapter overview from content
    const handleEnrichChapterOverview = useCallback(async () => {
        if (!activeChapter) return;
        setEnriching(true);

        try {
            const fullContent = activeChapter.scenes.map(s => s.content || '').join('\n\n');
            const prompt = `Analyze this chapter content and generate/update the chapter overview.

CHAPTER TITLE: ${activeChapter.title}
CURRENT SUMMARY: ${activeChapter.summary || 'None'}

CONTENT:
${fullContent.slice(0, 3000)}

Return JSON:
{
    "summary": "Updated chapter summary based on actual content",
    "primaryPov": "Main POV character",
    "chapterGoal": "What the chapter accomplishes",
    "theme": "Central theme"
}`;

            const response = await AgentService.generateText({
                systemPrompt: 'Analyze chapter content and return JSON.',
                userPrompt: prompt,
                operation: 'enrichment'
            });

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                updateChapter(activeChapter.id, {
                    summary: data.summary || activeChapter.summary,
                    primaryPov: data.primaryPov || activeChapter.primaryPov,
                    chapterGoal: data.chapterGoal || activeChapter.chapterGoal,
                    theme: data.theme || activeChapter.theme
                });
            }
        } catch (error) {
            console.error('Enrich failed:', error);
        } finally {
            setEnriching(false);
        }
    }, [activeChapter, updateChapter]);

    const currentSceneName = activeChapter?.scenes[cursorSceneIndex]?.title || 'No Scene';
    const totalWords = chapterContent.replace(new RegExp(SCENE_BREAK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').split(/\s+/).filter(Boolean).length;

    // Word count warning logic
    const minWords = Math.floor(IDEAL_WORDS_PER_CHAPTER * (1 - WORD_COUNT_TOLERANCE));
    const maxWords = Math.ceil(IDEAL_WORDS_PER_CHAPTER * (1 + WORD_COUNT_TOLERANCE));
    const wordCountWarning = totalWords < minWords ? 'short' : totalWords > maxWords ? 'long' : null;

    if (chapters.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-text-muted">
                <div className="text-center">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No chapters found. Go to Outline to create one.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex overflow-hidden animate-fade-in relative">
            {/* LEFT: Chapter Navigation */}
            <div className={`flex-shrink-0 bg-bg-secondary border-r border-border-color flex flex-col overflow-hidden transition-all duration-300 ${navCollapsed ? 'w-10' : 'w-56'}`}>
                <button onClick={() => setNavCollapsed(!navCollapsed)} className="p-2 border-b border-border-color bg-bg-tertiary flex items-center justify-center hover:bg-bg-primary transition-colors">
                    {navCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                </button>

                {!navCollapsed && (
                    <>
                        <div className="p-3 border-b border-border-color bg-bg-tertiary">
                            <h3 className="font-bold text-xs uppercase tracking-wide text-text-muted">Chapters</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {chapters.map((chapter) => (
                                <div key={chapter.id}>
                                    <div onClick={() => handleChapterClick(chapter.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${activeChapterId === chapter.id ? 'bg-accent-color/20 text-accent-color' : 'hover:bg-bg-tertiary text-text-primary'}`}>
                                        <button onClick={(e) => toggleChapterExpand(chapter.id, e)} className="p-0.5 hover:bg-bg-primary rounded">
                                            {expandedChapters[chapter.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <span className="text-sm font-medium truncate flex-1">{chapter.order}. {chapter.title}</span>
                                    </div>
                                    {expandedChapters[chapter.id] && (
                                        <div className="ml-6 mt-1 space-y-0.5">
                                            {chapter.scenes.map((scene, idx) => (
                                                <div key={scene.id} onClick={() => handleSceneClick(chapter.id, idx)} className={`px-2 py-1 text-xs rounded cursor-pointer transition-colors truncate ${activeChapterId === chapter.id && cursorSceneIndex === idx ? 'bg-bg-tertiary text-accent-color font-medium' : 'text-text-muted hover:text-text-primary hover:bg-bg-primary'}`}>
                                                    {scene.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {navCollapsed && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-xs font-bold text-text-muted uppercase tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>Chapters</div>
                    </div>
                )}
            </div>

            {/* CENTER: Single Textarea Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center justify-between border-b border-border-color px-2 py-1 bg-bg-primary shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold font-serif">{activeChapter?.order}. {activeChapter?.title}</h2>
                        <span className="text-xs text-text-muted">{activeChapter?.scenes.length || 0} scenes</span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${wordCountWarning ? 'text-amber-500' : 'text-accent-color'}`}>
                            {totalWords} words
                            {wordCountWarning && (
                                <span title={`Chapter may be too ${wordCountWarning} (ideal: ${minWords}-${maxWords} words)`}>
                                    <AlertTriangle size={12} />
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleEnrichChapterOverview} disabled={enriching} className="flex items-center gap-1 text-text-muted hover:text-accent-color px-2 py-1 rounded transition-colors disabled:opacity-50" title="Update chapter overview from content">
                            <RefreshCw size={14} className={enriching ? 'animate-spin' : ''} />
                            {!enriching && <span className="text-xs">Enrich</span>}
                        </button>
                        <button onClick={handleDraftFullChapter} disabled={loading} className="flex items-center gap-2 bg-accent-color text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
                            <Wand2 size={14} />
                            Draft
                        </button>
                    </div>
                </header>

                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="flex-1 w-full overflow-y-auto bg-bg-primary border-none focus:ring-0 focus:outline-none text-lg leading-relaxed font-serif p-4 m-0 whitespace-pre-wrap min-h-[200px]"
                    style={{ minHeight: '200px' }}
                    onInput={(e) => {
                        const content = (e.target as HTMLDivElement).innerText || '';
                        handleContentChange(content);
                    }}
                    onSelect={handleCursorChange}
                    onClick={handleCursorChange}
                    onKeyUp={handleCursorChange}
                    onKeyDown={handleKeyDown}
                    onContextMenu={handleContextMenu}
                    data-placeholder="Start writing... (Ctrl+B for bold, Ctrl+I for italic)"
                />
            </div>

            {/* RIGHT: Scene Navigator OR AI Edit Panel */}
            {aiPanel.open ? (
                <div className="w-80 flex-shrink-0 bg-bg-secondary border-l border-border-color flex flex-col animate-slide-in-right">
                    <div className="flex items-center justify-between p-3 border-b border-border-color bg-bg-tertiary">
                        <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles size={16} className="text-accent-color" />AI Edit</h3>
                        <button onClick={() => setAiPanel(prev => ({ ...prev, open: false }))} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase block mb-1">Selected Text</label>
                            <div className="bg-bg-primary p-2 rounded border border-border-color text-sm max-h-32 overflow-y-auto">"{aiPanel.selectedText.slice(0, 200)}{aiPanel.selectedText.length > 200 ? '...' : ''}"</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase block mb-1">What would you like to change?</label>
                            <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded text-sm resize-none" rows={3} value={aiPanel.prompt} onChange={(e) => setAiPanel(prev => ({ ...prev, prompt: e.target.value }))} placeholder="e.g., Make this more dramatic..." />
                        </div>
                        <button onClick={handleExecuteAIEdit} disabled={aiPanel.loading || !aiPanel.prompt.trim()} className="w-full flex items-center justify-center gap-2 bg-accent-color text-white px-4 py-2 rounded font-bold disabled:opacity-50">
                            {aiPanel.loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                            {aiPanel.loading ? 'Generating...' : 'Generate Edit'}
                        </button>
                        {aiPanel.result && (
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">AI Suggestion</label>
                                <div className="bg-bg-primary p-2 rounded border border-accent-color/50 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">{aiPanel.result}</div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={handleApplyAIEdit} className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700">Apply</button>
                                    <button onClick={() => setAiPanel(prev => ({ ...prev, result: null }))} className="flex-1 bg-bg-tertiary text-text-primary px-3 py-1.5 rounded text-sm font-bold hover:bg-bg-primary border border-border-color">Discard</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="w-40 flex-shrink-0 bg-bg-secondary border-l border-border-color flex flex-col">
                    <div className="p-2 border-b border-border-color bg-bg-tertiary">
                        <h3 className="text-xs font-bold text-text-muted uppercase">Scene Navigator</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {activeChapter?.scenes.map((scene, idx) => (
                            <div key={scene.id}>
                                <button
                                    onClick={() => handleSceneClick(activeChapter.id, idx)}
                                    onContextMenu={(e) => handleSceneContextMenu(e, scene.id, idx)}
                                    className={`w-full text-left px-2 py-2 text-xs transition-colors ${cursorSceneIndex === idx ? 'bg-accent-color/20 text-accent-color font-bold' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'}`}
                                >
                                    {scene.title}
                                </button>
                                {idx < activeChapter.scenes.length - 1 && (
                                    <div className="flex items-center px-2 py-1 text-[10px] text-accent-color/70">
                                        <div className="flex-1 border-t border-dashed border-accent-color/30" />
                                        <span className="mx-1">⁂</span>
                                        <div className="flex-1 border-t border-dashed border-accent-color/30" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.visible && (
                <div className="fixed bg-bg-secondary border border-border-color rounded-lg shadow-xl py-1 z-50 min-w-[200px] animate-fade-in" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <button onClick={handleAddSceneBreak} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-tertiary transition-colors text-left">
                        <Scissors size={16} className="text-accent-color" />
                        Add Scene Break
                        <span className="ml-auto text-xs text-text-muted">({activeChapter?.scenes.length || 0} scenes)</span>
                    </button>
                    {contextMenu.selectedText && (
                        <button onClick={handleOpenAIPanel} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-tertiary transition-colors text-left">
                            <Sparkles size={16} className="text-accent-color" />
                            Update Selection with AI
                        </button>
                    )}
                </div>
            )}

            {/* Scene Context Menu */}
            {sceneContextMenu.visible && (
                <div className="fixed bg-bg-secondary border border-border-color rounded-lg shadow-xl py-1 z-50 min-w-[180px] animate-fade-in" style={{ left: sceneContextMenu.x, top: sceneContextMenu.y }}>
                    <button onClick={handleOpenSceneInOutline} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-tertiary transition-colors text-left">
                        <ExternalLink size={16} className="text-accent-color" />
                        Open in Outline
                    </button>
                </div>
            )}

            {/* New Scene Modal */}
            {newSceneModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setNewSceneModal(prev => ({ ...prev, open: false }))} />
                    <div className="relative bg-bg-secondary border border-border-color rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        <div className="flex items-center justify-between p-4 border-b border-border-color">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Plus size={20} className="text-accent-color" />New Scene Details</h3>
                            <button onClick={() => setNewSceneModal(prev => ({ ...prev, open: false }))} className="text-text-muted hover:text-text-primary"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex gap-2">
                                <button onClick={handleGenerateSceneMetadata} disabled={newSceneModal.generating} className="flex items-center gap-2 bg-accent-color/20 text-accent-color px-3 py-1.5 rounded text-sm font-bold hover:bg-accent-color/30 disabled:opacity-50">
                                    {newSceneModal.generating ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {newSceneModal.generating ? 'Generating...' : 'Generate from Context'}
                                </button>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Title</label>
                                <input className="w-full p-2 bg-bg-primary border border-border-color rounded" value={newSceneModal.title} onChange={(e) => setNewSceneModal(prev => ({ ...prev, title: e.target.value }))} placeholder="Scene title" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Summary</label>
                                <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded resize-none" rows={2} value={newSceneModal.summary} onChange={(e) => setNewSceneModal(prev => ({ ...prev, summary: e.target.value }))} placeholder="What happens?" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-text-muted uppercase block mb-1">POV</label><input className="w-full p-2 bg-bg-primary border border-border-color rounded text-sm" value={newSceneModal.pov} onChange={(e) => setNewSceneModal(prev => ({ ...prev, pov: e.target.value }))} /></div>
                                <div><label className="text-xs font-bold text-text-muted uppercase block mb-1">Location</label><input className="w-full p-2 bg-bg-primary border border-border-color rounded text-sm" value={newSceneModal.location} onChange={(e) => setNewSceneModal(prev => ({ ...prev, location: e.target.value }))} /></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Goal</label>
                                <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded resize-none text-sm" rows={2} value={newSceneModal.goals} onChange={(e) => setNewSceneModal(prev => ({ ...prev, goals: e.target.value }))} placeholder="What does the POV character want in this scene?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Conflict</label>
                                <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded resize-none text-sm" rows={2} value={newSceneModal.conflict} onChange={(e) => setNewSceneModal(prev => ({ ...prev, conflict: e.target.value }))} placeholder="What obstacle or tension do they face?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Stakes</label>
                                <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded resize-none text-sm" rows={2} value={newSceneModal.stakes} onChange={(e) => setNewSceneModal(prev => ({ ...prev, stakes: e.target.value }))} placeholder="What happens if they fail? What's at risk?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase block mb-1">Mood</label>
                                <textarea className="w-full p-2 bg-bg-primary border border-border-color rounded resize-none text-sm" rows={2} value={newSceneModal.mood} onChange={(e) => setNewSceneModal(prev => ({ ...prev, mood: e.target.value }))} placeholder="Emotional tone - tense, hopeful, melancholic..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-border-color">
                            <button onClick={() => setNewSceneModal(prev => ({ ...prev, open: false }))} className="px-4 py-2 rounded border border-border-color text-text-secondary hover:bg-bg-tertiary">Skip</button>
                            <button onClick={handleUpdateSceneMetadata} className="px-4 py-2 rounded bg-accent-color text-white font-bold hover:bg-accent-hover">Save Scene Info</button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute bottom-8 right-16 bg-accent-color text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slide-in-up z-50">
                    <Wand2 size={20} className="animate-pulse" />
                    <span className="font-bold">Tehk is writing...</span>
                </div>
            )}
        </div>
    );
}
