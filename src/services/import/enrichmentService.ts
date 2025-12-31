/* eslint-disable @typescript-eslint/no-explicit-any */

import { AgentService } from "../ai/agent";
import type { Chapter, Character, WorldItem, WorldCategory } from "../../types";

/**
 * Enrichment Services
 * - Inline enrichment: during import, uses chunk context
 * - Full enrichment: post-import, uses project context
 * Uses local Ollama for cost-free operation
 */

const safeParseJSON = (text: string): any => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch {
    // 2. Try extracting from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
        // eslint-disable-next-line no-empty
      } catch { }
    }

    // 3. Try finding first JSON object or array
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
        // eslint-disable-next-line no-empty
      } catch { }
    }

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
        // eslint-disable-next-line no-empty
      } catch { }
    }

    throw new Error("No valid JSON found in response");
  }
};
export interface InlineEnrichmentResult {
  chapter: {
    act?: string;
    primaryPov?: string;
    chapterGoal?: string;
    theme?: string;
    timeContext?: string;
  };
  scenes: {
    title: string;
    pov?: string;
    mood?: string;
    location?: string;
    conflict?: string;
    stakes?: string;
  }[];
  characters: {
    name: string;
    archetype?: string;
    personality?: string;
  }[];
  worldItems: {
    name: string;
    significance?: string;
  }[];
}

// Category-specific field prompts for WorldItems
const WORLD_CATEGORY_FIELDS: Record<WorldCategory, string> = {
  location: `
    - climate: Weather and environmental conditions
    - geography: Terrain, layout, natural features
    - population: Who lives here, demographics
    - culture: Customs, traditions, way of life
    - sensoryDetails: What you see, hear, smell, feel
    - landmarks: Notable features or buildings
    - threats: Dangers or conflicts present`,

  supernatural: `
    - type: Kind of supernatural (magic, divine, psychic, curse, etc.)
    - rules: How it works, mechanics
    - source: Where the power comes from
    - cost: Price or limitation of use
    - practitioners: Who can use it
    - limitations: What it cannot do
    - manifestation: How it appears visually`,

  faction: `
    - leadership: Who leads, power structure
    - goals: What they want to achieve
    - beliefs: Core ideology or philosophy
    - territory: Where they operate, influence
    - allies: Friendly groups
    - enemies: Opposing groups
    - resources: What they control`,

  technology: `
    - function: What it does, purpose
    - powerSource: How it's powered
    - availability: Who has access, rarity
    - limitations: What it cannot do
    - inventor: Who created it, origin`,

  history: `
    - era: When it occurred
    - cause: What triggered it
    - outcome: What resulted
    - keyFigures: Important people involved
    - legacy: Lasting impact on the world`,

  other: `
    - rules: How it works
    - significance: Why it matters
    - connections: Related elements`,
};

export const EnrichmentService = {
  /**
   * INLINE ENRICHMENT - Used during import with chunk context
   * Enriches chapter, scenes, characters, and world items in one call
   */
  inlineEnrichFromChunk: async (
    chapter: {
      title: string;
      summary: string;
      scenes: { title: string; summary: string }[];
    },
    characters: { name: string; role: string; description: string }[],
    worldItems: { name: string; category: string; description: string }[],
    chunkText: string,
  ): Promise<InlineEnrichmentResult> => {
    const prompt = `
Using ONLY the source text provided, enrich this extracted data with narrative metadata.
CRITICAL: You MUST identify or infer a 'chapterGoal' for the chapter and 'goals' for each scene.


SOURCE TEXT:
${chunkText.substring(0, 2000)}

EXTRACTED CHAPTER: "${chapter.title}"
Summary: ${chapter.summary}
Scenes: ${chapter.scenes.map((s) => s.title).join(", ")}

EXTRACTED CHARACTERS: ${characters.map((c) => c.name).join(", ")}
EXTRACTED WORLD ITEMS: ${worldItems.map((w) => w.name).join(", ")}

Return JSON with enrichment data:
{
    "chapter": {
        "act": "setup|rising|climax|falling|resolution",
        "primaryPov": "POV character name",
        "chapterGoal": "What must be accomplished",
        "theme": "Central theme",
        "timeContext": "When this occurs"
    },
    "scenes": [
        {"title": "Scene Title", "pov": "Character", "mood": "Mood", "location": "Where", "conflict": "Obstacle", "stakes": "Consequences"}
    ],
    "characters": [
        {"name": "Character Name", "archetype": "Archetype", "personality": "Traits"}
    ],
    "worldItems": [
        {"name": "Item Name", "significance": "Why it matters"}
    ]
}

Return ONLY valid JSON. Base answers on the SOURCE TEXT, not imagination.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "Extract narrative metadata from the provided text. Be concise and accurate.",
        userPrompt: prompt,
        operation: "enrichment",
      });

      return safeParseJSON(response);
    } catch (e) {
      console.error("Inline enrichment failed:", e);
      throw e;
    }
  },

  /**
   * Enrich a chapter with comprehensive metadata (post-import)
   */
  enrichChapter: async (
    chapter: Chapter,
    projectContext: string,
  ): Promise<Partial<Chapter>> => {
    const prompt = `
Analyze this chapter and extract detailed narrative metadata.
CRITICAL: You MUST identify a clear 'chapterGoal'.


CHAPTER: "${chapter.title}"
SUMMARY: ${chapter.summary}
SCENES: ${chapter.scenes.map((s) => `- ${s.title}: ${s.summary}`).join("\n")}

PROJECT CONTEXT: ${projectContext}

Return JSON with:
{
    "act": "setup|rising|climax|falling|resolution",
    "primaryPov": "Which character's perspective",
    "chapterGoal": "What must be accomplished",
    "theme": "Central theme explored",
    "timeContext": "When this occurs (e.g., 'Day 3', 'One week later')",
    "openingHook": "How chapter should grab reader",
    "closingImage": "Final image/moment to leave reader with",
    "chapterForeshadowing": "Hints to plant for later payoff",
    "keyLocations": ["Important places"],
    "keyCharacters": ["Characters who appear"]
}

Return ONLY valid JSON.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a narrative structure analyst. Extract story metadata.",
        userPrompt: prompt,
        operation: "enrichment",
      });

      const data = safeParseJSON(response);
      // Safety: Only return whitelisted fields to prevent overwriting core data like scenes
      return {
        act: data.act,
        primaryPov: data.primaryPov,
        chapterGoal: data.chapterGoal,
        theme: data.theme,
        timeContext: data.timeContext,
        openingHook: data.openingHook,
        closingImage: data.closingImage,
        chapterForeshadowing: data.chapterForeshadowing,
        keyLocations: data.keyLocations,
        keyCharacters: data.keyCharacters,
      };
    } catch (e) {
      console.error("Chapter enrichment failed:", e);
      throw e;
    }
  },

  /**
   * Enrich a character with deep profile data and duplicate check
   */
  enrichCharacter: async (
    character: Character,
    projectContext: string,
    existingCharacters: Character[] = [],
  ): Promise<Partial<Character> & { mergeWithId?: string }> => {
    const existingList = existingCharacters
      .map((c) => `- ${c.name} (ID: ${c.id})`)
      .join("\n");

    const prompt = `
Create a deep character profile based on available information.

CHARACTER: ${character.name}
ROLE: ${character.role}
DESCRIPTION: ${character.shortDescription}
PROJECT CONTEXT: ${projectContext}

Existing Characters:
${existingList}

Step 1: check if "${character.name}" is a duplicate or alias of an existing character (e.g. "Jon" vs "Jonathan").
If it is a duplicate, return: { "mergeWithId": "ID_OF_EXISTING_CHARACTER" }

Step 2: If unique, create profile.
Return JSON with:
{
    "archetype": "Hero/Mentor/Trickster/etc.",
    "personality": "Core personality traits, MBTI if appropriate",
    "physicalDescription": "Appearance, distinguishing features",
    "backstory": "History before the story begins",
    "motivations": "What drives them, deepest desires",
    "fears": "Deepest fears and vulnerabilities",
    "strengths": ["Skills", "Abilities", "Positive traits"],
    "weaknesses": ["Flaws", "Vulnerabilities", "Blind spots"],
    "arc": "Character growth journey through the story",
    "voice": "Speech patterns, vocabulary, dialogue style",
    "secrets": "What they hide from others",
    "relationships": [{"name": "Other Character", "type": "friend/rival/mentor/etc."}]
}

Return ONLY valid JSON. Infer from context where details are not explicit.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a character development specialist. Create rich character profiles or detect duplicates.",
        userPrompt: prompt,
        operation: "enrichment",
      });

      const data = safeParseJSON(response);
      if (data.mergeWithId) return { mergeWithId: data.mergeWithId };

      // Safety: Whitelist to protect core fields
      return {
        archetype: data.archetype,
        personality: data.personality,
        physicalDescription: data.physicalDescription,
        backstory: data.backstory,
        motivations: data.motivations,
        fears: data.fears,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        arc: data.arc,
        voice: data.voice,
        secrets: data.secrets,
        relationships: data.relationships,
      };
    } catch (e) {
      console.error("Character enrichment failed:", e);
      throw e;
    }
  },

  /**
   * Enrich a world item with category-specific details and duplicate check
   */
  enrichWorldItem: async (
    item: WorldItem,
    projectContext: string,
    existingItems: WorldItem[] = [],
  ): Promise<Partial<WorldItem> & { mergeWithId?: string }> => {
    const categoryFields =
      WORLD_CATEGORY_FIELDS[item.category] || WORLD_CATEGORY_FIELDS.other;
    const existingList = existingItems
      .filter((w) => w.category === item.category)
      .map((w) => `- ${w.name} (ID: ${w.id})`)
      .join("\n");

    const prompt = `
Expand this world-building element with detailed attributes.

ITEM: ${item.name}
CATEGORY: ${item.category}
DESCRIPTION: ${item.shortDescription}
PROJECT CONTEXT: ${projectContext}

Existing ${item.category} Items:
${existingList}

Step 1: check if "${item.name}" is a duplicate of an existing item.
If it is a duplicate, return: { "mergeWithId": "ID_OF_EXISTING_ITEM" }

Step 2: If unique, extract details.

For a ${item.category}, extract these specific fields:
${categoryFields}

Also include COMMON fields:
- history: Origin and background
- significance: Why it matters to the plot
- mysteries: Unknown or unexplored aspects
- connectedCharacters: Characters linked to this
- connectedEvents: Plot events involving this

Return ONLY valid JSON with these fields in an "attributes" object:
{
    "history": "...",
    "significance": "...",
    "mysteries": "...",
    "connectedCharacters": ["..."],
    "connectedEvents": ["..."],
    "attributes": {
        // category-specific fields as key-value pairs
    }
}
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a world-building expert. Create rich, consistent lore or detect duplicates.",
        userPrompt: prompt,
        operation: "enrichment",
      });

      const data = safeParseJSON(response);
      if (data.mergeWithId) return { mergeWithId: data.mergeWithId };

      return {
        history: data.history,
        significance: data.significance,
        mysteries: data.mysteries,
        connectedCharacters: data.connectedCharacters,
        connectedEvents: data.connectedEvents,
        attributes: { ...item.attributes, ...data.attributes },
      };
    } catch (e) {
      console.error("World item enrichment failed:", e);
      throw e;
    }
  },

  /**
   * Enrich a scene with narrative details
   */
  enrichScene: async (
    scene: { title: string; summary: string },
    chapterContext: string,
  ): Promise<any> => {
    // ... (existing code) ...
    const prompt = `
Analyze this scene and extract detailed narrative metadata.
CRITICAL: You MUST identify clear 'goals' for the POV character.


SCENE: "${scene.title}"
SUMMARY: ${scene.summary}
CHAPTER CONTEXT: ${chapterContext}

Return JSON:
{
    "pov": "POV character name",
    "goals": "What the POV character wants",
    "stakes": "What happens if they fail",
    "conflict": "The obstacle they face",
    "outcome": "win/loss/pivot/mixed",
    "mood": "Emotional atmosphere",
    "location": "Where it takes place",
    "tensionLevel": 7,
    "pacing": "slow|medium|fast",
    "charactersPresent": ["Character1", "Character2"],
    "foreshadowing": "Hints planted for later",
    "plotFunction": "What this scene accomplishes (introduce/reveal/escalate/resolve)"
}

Return ONLY valid JSON.
`;
    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a scene analyst. Extract specific narrative metrics.",
        userPrompt: prompt,
        operation: "enrichment",
      });

      const data = safeParseJSON(response);
      // Safety whitelist
      return {
        pov: data.pov,
        goals: data.goals,
        stakes: data.stakes,
        conflict: data.conflict,
        outcome: data.outcome,
        mood: data.mood,
        location: data.location,
        tensionLevel: data.tensionLevel,
        pacing: data.pacing,
        charactersPresent: data.charactersPresent,
        foreshadowing: data.foreshadowing,
        plotFunction: data.plotFunction,
      };
    } catch (e) {
      console.error("Scene enrichment failed:", e);
    }
    return {};
  },

  /**
   * Merge multiple entities (Characters or World Items) into a single comprehensive record
   */
  mergeEntities: async (
    items: any[],
    type: "character" | "worldItem",
  ): Promise<any> => {
    if (items.length < 2) return items[0];

    const entitiesText = items
      .map((item, index) => `ENTITY ${index + 1}:\n${JSON.stringify(item, null, 2)}`)
      .join("\n\n");

    const prompt = `
Merge these ${items.length} ${type} records into a single, comprehensive entry. Resolution strategy: preserve the most detailed information from all sources.

${entitiesText}

Return a single JSON object that combines all unique data. 
- For arrays (e.g. traits), merge and deduplicate.
- For descriptions, combine if complementary, or keep the longer/better one.
- Resolve conflicts by favoring the first entity if unsure.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a data consistency expert. Merge multiple records into one perfect master record.",
        userPrompt: prompt,
        operation: "other",
      });

      return safeParseJSON(response);
    } catch (e) {
      console.error("Entity merge failed:", e);
      throw e;
    }
  },

  /**
   * Scan a list of items and identify potential duplicates or synonyms
   */
  detectDuplicates: async (
    items: { id: string; name: string; description?: string }[],
  ): Promise<{ originalId: string; duplicateId: string; reason: string }[]> => {
    // ... (existing implementation) ...
    if (items.length < 2) return [];

    const list = items.map((i) => `${i.id}: ${i.name}`).join("\n");

    const prompt = `
Analyze this list of entities and identify potential duplicates (synonyms, typos, or same entity referred to differently).
Examples: "The King" vs "King Alaric", "Jon" vs "Jonathan".
Ignore obvious distinct entities.

LIST:
${list}

Return JSON array of pairs:
[
    { "originalId": "ID_TO_KEEP", "duplicateId": "ID_TO_MERGE_INTO_ORIGINAL", "reason": "Explanation" }
]
Return empty array [] if no duplicates found.
`;

    try {
      const response = await AgentService.generateText({
        systemPrompt:
          "You are a deduping assistant. Find synonyms and duplicates.",
        userPrompt: prompt,
        operation: "other",
      });

      return safeParseJSON(response);
    } catch (e) {
      console.error("Duplicate detection failed:", e);
    }
    return [];
  },

  /**
   * Identify items with missing core narrative fields
   */
  identifyIncompleteItems: (project: any) => {
    const incomplete = {
      chapters: [] as any[],
      scenes: [] as any[],
      characters: [] as any[],
      worldItems: [] as any[],
    };

    project.chapters?.forEach((ch: any) => {
      if (!ch.openingHook || !ch.closingImage || !ch.chapterForeshadowing) {
        incomplete.chapters.push(ch);
      }
      ch.scenes?.forEach((sc: any) => {
        if (!sc.goals || !sc.conflict || !sc.outcome) {
          incomplete.scenes.push({ ...sc, chapterId: ch.id });
        }
      });
    });

    project.characters?.forEach((c: any) => {
      if (!c.backstory || !c.motivations || !c.voice)
        incomplete.characters.push(c);
    });

    // Check for basic descriptive fields in world items
    project.worldItems?.forEach((w: any) => {
      if (!w.history && !w.significance) incomplete.worldItems.push(w);
    });

    return incomplete;
  },
};
