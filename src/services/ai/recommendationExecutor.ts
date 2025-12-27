import { AgentService } from './agent';
import type { OutlineRecommendation } from './outlineReviewer';
import type { Chapter, Scene, Character, WorldItem } from '../../types';

export interface ExecutionResult {
    success: boolean;
    original: any;
    proposed: any;
    changes: string[];
}

export const RecommendationExecutor = {
    /**
     * Apply a recommendation using local model
     * Returns proposed changes for user approval
     */
    applyRecommendation: async (
        recommendation: OutlineRecommendation,
        targetData: Chapter | Scene | Character | WorldItem,
        fullContext?: string
    ): Promise<ExecutionResult> => {
        const prompt = `
You are making a specific edit to a story element based on editorial feedback.

RECOMMENDATION:
Issue: ${recommendation.issue}
Suggestion: ${recommendation.suggestion}
Priority: ${recommendation.priority}

CURRENT DATA:
${JSON.stringify(targetData, null, 2)}

${fullContext ? `CONTEXT:\n${fullContext}` : ''}

Apply the suggestion to the current data. Return JSON with:
{
    "changes": ["Description of change 1", "Description of change 2"],
    "updated": {
        // The complete updated object with changes applied
    }
}

Make ONLY the changes suggested. Keep all other fields unchanged.
Return ONLY valid JSON.
`;

        try {
            const response = await AgentService.generateText({
                systemPrompt: 'You are applying editorial changes. Be precise and minimal.',
                userPrompt: prompt
                // Uses default provider (local model)
            });

            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                return {
                    success: true,
                    original: targetData,
                    proposed: result.updated,
                    changes: result.changes || ['Changes applied']
                };
            }
        } catch (e) {
            console.error('Recommendation execution failed:', e);
            return {
                success: false,
                original: targetData,
                proposed: null,
                changes: [(e as Error).message]
            };
        }

        return {
            success: false,
            original: targetData,
            proposed: null,
            changes: ['Failed to parse response']
        };
    }
};
