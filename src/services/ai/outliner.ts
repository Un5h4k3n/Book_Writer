/* eslint-disable @typescript-eslint/no-explicit-any */

import { AgentService } from "./agent";
import type { Project, Chapter } from "../../types";

export const OutlinerService = {
  /**
   * Generates a list of initial chapters based on basic project info.
   */
  generateInitialChapters: async (
    project: Project,
    count: number = 10,
  ): Promise<any[]> => {
    const prompt = `
    Project Title: ${project.title}
    Genre: ${project.genre}
    
    Generate ${count} chapters with comprehensive metadata.
    Structure them to form a cohesive narrative arc.
    CRITICAL: Every chapter MUST have a specific, actionable 'chapterGoal'.
    
    
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
      systemPrompt: "You are an expert novel outliner.",
      userPrompt: prompt,
    });

    try {
      const jsonStr = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse chapters", e);
      return [];
    }
  },

  /**
   * Expands a chapter summary into a list of scenes.
   */
  expandChapterToScenes: async (
    chapter: Chapter,
    project: Project,
  ): Promise<any[]> => {
    const prompt = `
    Project: ${project.title} (${project.genre})
    Chapter: ${chapter.title}
    Summary: ${chapter.summary}
    ${chapter.chapterGoal ? `Chapter Goal: ${chapter.chapterGoal}` : ""}
    ${chapter.theme ? `Theme: ${chapter.theme}` : ""}
    
    Break this chapter into 2-5 detailed scenes with comprehensive metadata.
    CRITICAL: Every scene MUST have a specific 'goals' field defining what the POV character wants.
    
    
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
      systemPrompt: "You are an expert story architect.",
      userPrompt: prompt,
    });

    try {
      const jsonStr = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse scenes", e);
      return [];
    }
  },


  /**
   * Analyzes current chapter content and updates metadata (summary, goals, etc.)
   * and generates/updates scene structure based on the actual drafted text.
   */
  updateOutlineFromContent: async (
    chapter: Chapter,
    project: Project,
  ): Promise<Partial<Chapter>> => {
    // 1. Aggregate content
    const fullContent = chapter.scenes.map((s) => s.content || "").join("\n\n");
    if (!fullContent.trim()) return {};

    const prompt = `
    Analyze the drafted content for "Chapter: ${chapter.title}".
    
    Project Context: ${project.title} (${project.genre})
    
    Task 1: Generate high-level metadata for the chapter.
    Task 2: Generate summaries and metadata for each identified scene.
    
    CONTENT:
    ${fullContent.slice(0, 25000)}
    
    Return JSON:
    {
      "summary": "Updated comprehensive summary",
      "chapterGoal": "What is actually accomplished",
      "primaryPov": "Who is the main POV",
      "theme": "Emergent theme",
      "scenes": [
        {
          "index": 0,
          "title": "Suggested Scene Title",
          "summary": "What happens in this scene",
          "pov": "POV",
          "goals": "Character goals in this scene",
          "conflict": "Scene conflict",
          "mood": "Scene mood"
        }
      ]
    }
    `;

    try {
      const response = await AgentService.generateText({
        systemPrompt: "You are an expert editor. Analyze the draft and update the outline. Return JSON only.",
        userPrompt: prompt,
        operation: "enrichment"
      });

      const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");

      const data = JSON.parse(match[0]);

      // Map back to existing scenes (assuming order is preserved or close enough)
      const updatedScenes = chapter.scenes.map((scene, idx) => {
        const structuralData = data.scenes?.[idx];
        if (structuralData) {
          return {
            ...scene,
            title: structuralData.title || scene.title,
            summary: structuralData.summary || scene.summary,
            pov: structuralData.pov || scene.pov,
            goals: structuralData.goals || scene.goals,
            conflict: structuralData.conflict || scene.conflict,
            mood: structuralData.mood || scene.mood,
          };
        }
        return scene;
      });

      return {
        summary: data.summary,
        chapterGoal: data.chapterGoal,
        primaryPov: data.primaryPov,
        theme: data.theme,
        scenes: updatedScenes,
      };

    } catch (e) {
      console.error("Failed to update outline from content", e);
      return {};
    }
  }
};
