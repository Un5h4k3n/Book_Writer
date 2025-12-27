import { AgentService } from './agent';
import type { Project, Chapter } from '../../types';

export const OutlinerService = {
    /**
     * Generates a list of initial chapters based on basic project info.
     */
    generateInitialChapters: async (project: Project, count: number = 10): Promise<any[]> => {
        const prompt = `
    Project Title: ${project.title}
    Genre: ${project.genre}
    
    Generate ${count} chapters with comprehensive metadata.
    Structure them to form a cohesive narrative arc.
    
    Output JSON array:
    [{
      "title": "Chapter 1: Title",
      "summary": "What happens",
      "act": "setup/rising/climax/falling/resolution",
      "primaryPov": "Main POV character",
      "chapterGoal": "What must be accomplished",
      "chapterForeshadowing": "Hints planted",
      "theme": "Central theme",
      "openingHook": "How chapter begins",
      "closingImage": "How chapter ends"
    }]
    ONLY JSON.
    `;

        const response = await AgentService.generateText({
            systemPrompt: 'You are an expert novel outliner.',
            userPrompt: prompt
        });

        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse chapters', e);
            return [];
        }
    },

    /**
     * Expands a chapter summary into a list of scenes.
     */
    expandChapterToScenes: async (chapter: Chapter, project: Project): Promise<any[]> => {
        const prompt = `
    Project: ${project.title} (${project.genre})
    Chapter: ${chapter.title}
    Summary: ${chapter.summary}
    ${chapter.chapterGoal ? `Chapter Goal: ${chapter.chapterGoal}` : ''}
    ${chapter.theme ? `Theme: ${chapter.theme}` : ''}
    
    Break this chapter into 2-5 detailed scenes with comprehensive metadata.
    
    Output JSON array:
    [{
      "title": "Scene Title",
      "summary": "What happens",
      "pov": "POV Character",
      "goals": "What POV wants",
      "stakes": "Consequences of failure",
      "conflict": "The obstacle",
      "outcome": "win/loss/pivot",
      "mood": "emotional tone",
      "location": "Where it happens",
      "tensionLevel": 5,
      "pacing": "slow/medium/fast",
      "charactersPresent": ["Char1", "Char2"],
      "foreshadowing": "Hints for later",
      "plotFunction": "introduce/reveal/escalate/resolve"
    }]
    ONLY JSON.
    `;

        const response = await AgentService.generateText({
            systemPrompt: 'You are an expert story architect.',
            userPrompt: prompt
        });

        try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse scenes', e);
            return [];
        }
    }
};
