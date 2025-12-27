import { AgentService } from './agent';
import type { Chapter, Character, WorldItem } from '../../types';

export interface OutlineRecommendation {
    id: string;
    type: 'structure' | 'pacing' | 'character' | 'conflict' | 'theme' | 'continuity' | 'other';
    targetType: 'chapter' | 'scene' | 'character' | 'world' | 'overall';
    targetId?: string;
    targetName: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'applied' | 'dismissed';
}

const genId = () => Math.random().toString(36).substring(2, 9);

export const OutlineReviewer = {
    /**
     * Review the entire outline using hosted model (Gemini) for comprehensive feedback
     * Returns prioritized recommendations for improvement
     */
    reviewOutline: async (
        chapters: Chapter[],
        characters: Character[],
        worldItems: WorldItem[],
        projectTitle: string,
        projectGenre: string
    ): Promise<OutlineRecommendation[]> => {
        // Build outline summary for review
        const outlineSummary = chapters.map((ch, i) =>
            `Chapter ${i + 1}: ${ch.title}\n  Summary: ${ch.summary}\n  Act: ${ch.act || 'unknown'}\n  Scenes: ${ch.scenes.map(s => s.title).join(', ')}`
        ).join('\n\n');

        const characterSummary = characters.map(c =>
            `${c.name} (${c.role}): ${c.shortDescription}`
        ).join('\n');

        const worldSummary = worldItems.map(w =>
            `${w.name} (${w.category}): ${w.shortDescription}`
        ).join('\n');

        const prompt = `
You are a professional story editor reviewing a ${projectGenre} story outline for "${projectTitle}".

OUTLINE:
${outlineSummary}

CHARACTERS:
${characterSummary}

WORLD ELEMENTS:
${worldSummary}

Analyze this outline and provide specific, actionable recommendations. Focus on:
1. STRUCTURE: Story arc, pacing, act balance
2. CHARACTER: Development, consistency, motivation clarity
3. CONFLICT: Rising tension, stakes, obstacles
4. THEME: Thematic consistency, resonance
5. CONTINUITY: Plot holes, timeline issues, inconsistencies

Return JSON array of recommendations:
[
    {
        "type": "structure|pacing|character|conflict|theme|continuity|other",
        "targetType": "chapter|scene|character|world|overall",
        "targetName": "Name of specific element or 'Overall'",
        "issue": "What the problem is (concise)",
        "suggestion": "How to fix it (actionable)",
        "priority": "high|medium|low"
    }
]

Provide 5-10 specific recommendations. Be constructive and specific. Return ONLY valid JSON array.
`;

        try {
            const response = await AgentService.generateText({
                systemPrompt: 'You are a professional story editor. Provide constructive, specific feedback.',
                userPrompt: prompt,
                provider: 'gemini' // Use hosted model for quality review
            });

            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                const rawRecs = JSON.parse(match[0]);
                return rawRecs.map((rec: any) => ({
                    id: genId(),
                    type: rec.type || 'other',
                    targetType: rec.targetType || 'overall',
                    targetName: rec.targetName || 'Overall',
                    issue: rec.issue,
                    suggestion: rec.suggestion,
                    priority: rec.priority || 'medium',
                    status: 'pending'
                }));
            }
        } catch (e) {
            console.error('Outline review failed:', e);
            throw e;
        }
        return [];
    }
};
