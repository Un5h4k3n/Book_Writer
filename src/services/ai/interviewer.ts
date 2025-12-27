import { AgentService } from './agent';
import type { Character, WorldItem } from '../../types';

export const InterviewerService = {
    /**
     * Generates the next question based on what we know so far.
     */
    generateNextQuestion: async (
        entityType: 'character' | 'world',
        context: Partial<Character | WorldItem>,
        previousAnswer?: string
    ): Promise<string> => {
        const existingAttrs = context.attributes || {};
        const attrString = Object.entries(existingAttrs).map(([k, v]) => `${k}: ${v}`).join('\n');

        let systemPrompt = `You are an expert interviewer helper for a writer.
Your goal is to help the user flesh out a ${entityType}.
Current known attributes:
${attrString}
    `;

        if (context.name) systemPrompt += `\nName: ${context.name}`;

        let prompt = `Based on the current context, ask ONE simple, direct question to help the user define the ${entityType}. 
    Use simple, clear language. Avoid complex or flowery phrasing.
    Focus on one specific detail about motivation, appearance, or background.
    If the user just answered "${previousAnswer || ''}", follow up on that naturally.
    Keep the question short (under 20 words if possible).
    Output ONLY the question.`;

        const question = await AgentService.generateText({
            systemPrompt,
            userPrompt: prompt
            // model: 'mistral' -> Removed to use default configured (Gemini)
        });

        return question.trim();
    },

    /**
     * Analyzes the user's answer and extracts a structured attribute (key: value).
     */
    synthesizeAttribute: async (
        question: string,
        answer: string
    ): Promise<{ key: string; value: string }> => {
        const prompt = `
    Question: "${question}"
    Answer: "${answer}"
    
    Extract a single concise attribute Key and Value from this exchange.
    Key should be snake_case (e.g., magic_cost, childhood_trauma).
    Value should be a summary of the answer.
    
    Output JSON format: { "key": "...", "value": "..." }
    ONLY JSON.
    `;

        const response = await AgentService.generateText({
            userPrompt: prompt
        });

        try {
            // clean response
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse attribute synthesis', e);
            return { key: 'note', value: answer };
        }
    }
};
