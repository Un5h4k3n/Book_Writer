import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useRecommendationStore } from '../stores/recommendationStore';
import { OutlineReviewer } from '../services/ai/outlineReviewer';
import { RecommendationExecutor } from '../services/ai/recommendationExecutor';
import { Sparkles, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, Loader, Wand2 } from 'lucide-react';

const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

const typeIcons: Record<string, string> = {
    structure: '📐',
    pacing: '⏱️',
    character: '👤',
    conflict: '⚔️',
    theme: '🎭',
    continuity: '🔗',
    other: '💡'
};

export default function RecommendationPanel() {
    const { project, chapters, characters, worldItems, updateChapter, updateCharacter, updateWorldItem } = useProjectStore();
    const { recommendations, isReviewing, setRecommendations, setReviewing, updateStatus, clearAll } = useRecommendationStore();
    const [expanded, setExpanded] = useState(true);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleReview = async () => {
        if (!project) return;
        setReviewing(true);
        try {
            const recs = await OutlineReviewer.reviewOutline(
                chapters,
                characters,
                worldItems,
                project.title,
                project.genre
            );
            setRecommendations(recs);
        } catch (e) {
            console.error('Review failed:', e);
        }
        setReviewing(false);
    };

    const handleApply = async (rec: any) => {
        setApplyingId(rec.id);

        // Find target data
        let targetData: any = null;
        if (rec.targetType === 'chapter') {
            targetData = chapters.find(c => c.title.toLowerCase().includes(rec.targetName.toLowerCase()));
        } else if (rec.targetType === 'character') {
            targetData = characters.find(c => c.name.toLowerCase().includes(rec.targetName.toLowerCase()));
        } else if (rec.targetType === 'world') {
            targetData = worldItems.find(w => w.name.toLowerCase().includes(rec.targetName.toLowerCase()));
        }

        if (!targetData) {
            console.warn('Target not found:', rec.targetName);
            setApplyingId(null);
            return;
        }

        try {
            const result = await RecommendationExecutor.applyRecommendation(rec, targetData);
            if (result.success && result.proposed) {
                setPreviewData({ rec, result });
            }
        } catch (e) {
            console.error('Apply failed:', e);
        }
        setApplyingId(null);
    };

    const confirmApply = () => {
        if (!previewData) return;
        const { rec, result } = previewData;

        // Apply changes to store
        if (rec.targetType === 'chapter') {
            updateChapter(result.proposed.id, result.proposed);
        } else if (rec.targetType === 'character') {
            updateCharacter(result.proposed.id, result.proposed);
        } else if (rec.targetType === 'world') {
            updateWorldItem(result.proposed.id, result.proposed);
        }

        updateStatus(rec.id, 'applied');
        setPreviewData(null);
    };

    const pendingCount = recommendations.filter(r => r.status === 'pending').length;

    return (
        <div className="bg-bg-secondary border border-border-color rounded-lg overflow-hidden mb-4">
            {/* Header */}
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-bg-tertiary"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Wand2 size={18} className="text-purple-400" />
                    <span className="font-bold">AI Review</span>
                    {pendingCount > 0 && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                            {pendingCount} recommendations
                        </span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="p-4 pt-0 border-t border-border-color">
                    {/* Review Button */}
                    {recommendations.length === 0 && (
                        <button
                            onClick={handleReview}
                            disabled={isReviewing}
                            className="w-full mt-4 bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isReviewing ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    Reviewing with AI...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Review Outline with AI (Gemini)
                                </>
                            )}
                        </button>
                    )}

                    {/* Recommendations List */}
                    {recommendations.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-text-muted">{recommendations.length} recommendations</span>
                                <button onClick={clearAll} className="text-xs text-red-400 hover:underline">Clear All</button>
                            </div>

                            {recommendations.map(rec => (
                                <div
                                    key={rec.id}
                                    className={`p-3 rounded-lg border ${rec.status === 'applied' ? 'opacity-50' : ''} ${priorityColors[rec.priority]}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span>{typeIcons[rec.type] || '💡'}</span>
                                            <span className="font-bold text-sm">{rec.targetName}</span>
                                            <span className="text-xs opacity-70 capitalize">{rec.type}</span>
                                        </div>
                                        <span className="text-xs capitalize px-2 py-0.5 rounded bg-bg-primary/50">
                                            {rec.priority}
                                        </span>
                                    </div>

                                    <p className="text-sm mb-1"><strong>Issue:</strong> {rec.issue}</p>
                                    <p className="text-sm mb-3"><strong>Suggestion:</strong> {rec.suggestion}</p>

                                    {rec.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApply(rec)}
                                                disabled={applyingId === rec.id}
                                                className="flex-1 bg-bg-primary text-text-primary px-3 py-1.5 rounded text-sm hover:bg-bg-tertiary flex items-center justify-center gap-1"
                                            >
                                                {applyingId === rec.id ? <Loader className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => updateStatus(rec.id, 'dismissed')}
                                                className="px-3 py-1.5 rounded text-sm text-text-muted hover:text-red-400"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {rec.status === 'applied' && (
                                        <div className="text-xs text-green-400 flex items-center gap-1">
                                            <CheckCircle size={12} /> Applied
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Preview Modal */}
                    {previewData && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-bg-primary border border-border-color rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                                <h3 className="text-lg font-bold mb-4">Preview Changes</h3>
                                <div className="space-y-2 mb-4">
                                    {previewData.result.changes.map((change: string, i: number) => (
                                        <div key={i} className="text-sm bg-green-500/10 text-green-400 p-2 rounded">
                                            ✓ {change}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={confirmApply}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
                                    >
                                        Confirm & Apply
                                    </button>
                                    <button
                                        onClick={() => setPreviewData(null)}
                                        className="px-4 py-2 rounded border border-border-color hover:bg-bg-tertiary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
