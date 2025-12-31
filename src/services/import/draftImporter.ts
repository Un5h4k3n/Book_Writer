import { AgentService } from "../ai/agent";
import type { Chapter } from "../../types";

const SCENE_BREAK = "\n\n⁂\n\n";

export interface DraftMapping {
    sourceSection: string; // The title found in the text (e.g., "Chapter 1")
    content: string; // The raw content of this section
    targetChapterId: string | "new"; // ID of existing chapter or "new"
    action: "overwrite" | "create" | "ignore";
    confidence: number;
}

export const DraftImporter = {
    /**
     * Phase 1: Analyze the draft text to identify chapters and map them to existing project structure.
     */
    analyzeDraft: (text: string, existingChapters: Chapter[]): DraftMapping[] => {
        // 1. Split text into potential chapters using Regex
        // Patterns: "Chapter X", "Chapter One", number followed by text, etc.
        const chapterRegex =
            /(?:^|\n)(?:Chapter\s+(?:\d+|[IVX]+|[A-Za-z]+)|Prologue|Epilogue)(?:[:\s].*)?(?:\r?\n|$)/i;

        // We'll use a simple approach: split by the regex, capturing the delimiter
        const lines = text.split(/\r?\n/);
        const sections: { title: string; content: string[] }[] = [];
        let currentTitle = "Introduction";
        let currentContent: string[] = [];

        // Helper to check if a line looks like a chapter header
        const isHeader = (line: string) =>
            chapterRegex.test(line) && line.trim().length < 100;

        for (const line of lines) {
            if (isHeader(line)) {
                if (currentContent.length > 0) {
                    sections.push({
                        title: currentTitle,
                        content: currentContent,
                    });
                }
                currentTitle = line.trim();
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }
        // Push last section
        if (currentContent.length > 0 || currentTitle !== "Introduction") {
            sections.push({
                title: currentTitle,
                content: currentContent,
            });
        }

        // 2. Fuzzy Map to Existing Chapters
        const mappings: DraftMapping[] = sections.map((section) => {
            const sectionHeader = section.title.toLowerCase().replace(/[^\w\s]/g, "");

            // Calculate rudimentary match score
            let bestMatch: Chapter | null = null;
            let maxScore = 0;

            for (const chapter of existingChapters) {
                let score = 0;
                const chapTitle = chapter.title.toLowerCase().replace(/[^\w\s]/g, "");

                // Exact number match (e.g. "Chapter 1" matches "Chapter 1")
                const sectionNum = sectionHeader.match(/\d+/)?.[0];
                const chapNum = chapTitle.match(/\d+/)?.[0];

                if (sectionNum && chapNum && sectionNum === chapNum) {
                    score += 50;
                }

                // Title text fuzzy match
                if (chapTitle.includes(sectionHeader) || sectionHeader.includes(chapTitle)) {
                    score += 30;
                }

                // Order match (weak signal)
                // Adjust for index-based boosting if needed

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = chapter;
                }
            }

            const confidence = Math.min(maxScore / 50, 1); // Normalize roughly

            return {
                sourceSection: section.title,
                content: section.content.join("\n"),
                targetChapterId: bestMatch && confidence > 0.6 ? bestMatch.id : "new",
                action: bestMatch && confidence > 0.6 ? "overwrite" : "create",
                confidence,
            };
        });

        return mappings.filter(m => m.content.trim().length > 0);
    },

    /**
     * Phase 2: Process a specific chapter section.
     * Logic: Validate size -> Chunk if needed -> Detect Scenes -> Return formatted content.
     */
    processChapter: async (
        mapping: DraftMapping,
        onProgress?: (msg: string) => void
    ): Promise<{ title: string; content: string }> => {
        onProgress?.(`Processing structure for ${mapping.sourceSection}...`);

        // Basic Large Text Handling
        // If text is huge (>50k chars), we might need to split scene detection
        // For MVP, we'll try to process in one go or naïve chunks
        const content = mapping.content;

        // Detect Scenes via AI
        const formattedContent = await DraftImporter.detectScenes(content);

        return {
            title: mapping.sourceSection,
            content: formattedContent,
        };
    },

    /**
     * Uses AI to identify scene breaks and insert the implementation-specific break marker.
     */
    detectScenes: async (text: string): Promise<string> => {
        // If explicit breaks exist (***), use them
        if (text.includes("***") || text.includes("# ") || text.includes("---")) {
            // Replace likely visual breaks with our system break
            // Being careful not to replace headers
            return text
                .replace(/\n\s*\*\*\*\s*\n/g, SCENE_BREAK)
                .replace(/\n\s*---\s*\n/g, SCENE_BREAK);
        }

        // Otherwise, ask AI to insert breaks based on narrative shifts
        // We send a condensed version or valid chunks to the AI
        // For MVP, let's treat the whole text as one scene if it's short, or ask AI to split it.



        // Note: Sending full text for "Return Exact" is expensive and prone to hallucinations/edits.
        // Better strategy for Large Text: 
        // Ask AI to return the *last sentence* of each scene. Then we split locally.

        const splitPrompt = `
    Analyze this text and identify the LAST SENTENCE of each scene.
    Look for time jumps, location changes, or POV switches.
    
    Return a JSON array of strings, where each string is the exact last sentence of a scene.
    
    TEXT:
    ${text.slice(0, 15000)}
    `;

        try {
            const response = await AgentService.generateText({
                systemPrompt: "You are a structural editor. Return JSON only.",
                userPrompt: splitPrompt,
                operation: "import",
            });

            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return text; // Fail safe: return original

            const breakSentences: string[] = JSON.parse(jsonMatch[0]);

            let processedText = text;
            // Insert breaks after each identified sentence
            for (const sentence of breakSentences) {
                // Need to be careful about matching unique sentences
                // This is fuzzy and risky, but acceptable for MVP Smart Layer
                processedText = processedText.replace(sentence, `${sentence}${SCENE_BREAK}`);
            }

            return processedText;

        } catch (e) {
            console.warn("Scene detection failed, treating as single scene.", e);
            return text;
        }
    }
};
