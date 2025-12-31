/* eslint-disable @typescript-eslint/no-explicit-any */

import { AgentService } from "./agent";
import type { Chapter, Character, WorldItem } from "../../types";

export interface Citation {
  type: "chapter" | "scene" | "character" | "world";
  id: string;
  name: string;
  excerpt: string;
}

export interface QAResponse {
  answer: string;
  citations: Citation[];
}

export const OutlineQA = {
  /**
   * Ask a question about the outline and get an answer with citations
   * Uses local model for cost-free operation
   */
  askQuestion: async (
    question: string,
    chapters: Chapter[],
    characters: Character[],
    worldItems: WorldItem[],
  ): Promise<QAResponse> => {
    // Build indexed outline for citation
    const chapterIndex = chapters.map((ch, i) => ({
      id: ch.id,
      name: ch.title,
      content: `Chapter ${i + 1}: ${ch.title}\nSummary: ${ch.summary}\nAct: ${ch.act || "unknown"}\nPOV: ${ch.primaryPov || "unknown"}\nGoal: ${ch.chapterGoal || "unknown"}\nScenes: ${ch.scenes.map((s) => `${s.title} - ${s.summary}`).join("; ")}`,
    }));

    const characterIndex = characters.map((c) => ({
      id: c.id,
      name: c.name,
      content: `${c.name} (${c.role}): ${c.shortDescription}${c.archetype ? `, archetype: ${c.archetype}` : ""}${c.personality ? `, personality: ${c.personality}` : ""}`,
    }));

    const worldIndex = worldItems.map((w) => ({
      id: w.id,
      name: w.name,
      content: `${w.name} (${w.category}): ${w.shortDescription}${w.significance ? `, significance: ${w.significance}` : ""}`,
    }));

    const fullIndex = [
      ...chapterIndex.map((c) => ({ ...c, type: "chapter" as const })),
      ...characterIndex.map((c) => ({ ...c, type: "character" as const })),
      ...worldIndex.map((w) => ({ ...w, type: "world" as const })),
    ];

    const prompt = `
You are answering a question about a story outline. Use ONLY the information provided below.

OUTLINE DATA:
${fullIndex.map((item) => `[${item.type.toUpperCase()}:${item.id}] ${item.name}: ${item.content}`).join("\n\n")}

QUESTION: ${question}

Answer the question using the outline data. For each piece of information in your answer, cite the source using its ID.

Return JSON:
{
    "answer": "Your detailed answer here. Reference sources by their ID when using their information.",
    "citations": [
        {"type": "chapter|scene|character|world", "id": "source_id", "name": "Source Name", "excerpt": "Relevant quote or summary"}
    ]
}

If the answer cannot be found in the outline, say so and explain what information is missing.
Return ONLY valid JSON.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "Answer questions about the story outline. Always cite sources.",
        userPrompt: prompt,
        operation: "qa",
      });

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return {
          answer: result.answer || "No answer found",
          citations: (result.citations || []).map((c: any) => ({
            type: c.type || "chapter",
            id: c.id || "",
            name: c.name || "Unknown",
            excerpt: c.excerpt || "",
          })),
        };
      }
    } catch (e) {
      console.error("Q&A failed:", e);
      return {
        answer: "Sorry, I encountered an error processing your question.",
        citations: [],
      };
    }

    return {
      answer: "Could not parse response.",
      citations: [],
    };
  },
};
