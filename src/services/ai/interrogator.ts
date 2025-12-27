import { AgentService } from './agent';
import type { Chapter } from '../../types';

export const InterrogatorService = {
    askAboutChapter: async (
        question: string,
        chapter: Chapter
    ): Promise<string> => {
        // 1. Gather Content
        // Concatenate all scenes in the chapter to form the full text context.
        const fullText = chapter.scenes.map(s => `[SCENE: ${s.title}]\n${s.content}`).join('\n\n');

        // 2. Prompt
        const prompt = `
    You are an AI assistant helping an author analyze their chapter.
    
    CONTEXT (Current Chapter Text):
    ${fullText.slice(0, 50000)} // Truncate if too huge
    
    USER QUESTION:
    "${question}"
    
    Answer the question based ONLY on the text provided above.
    If the answer is not in the text, say so.
    If you reference specific events, quote them briefly.
    `;

        return AgentService.generateText({
            systemPrompt: 'You are a helpful literary assistant.',
            userPrompt: prompt
        });
    }
};
