import { AgentService } from '../ai/agent';
import { useImportJobStore } from '../../stores/importJobStore';
import { EnrichmentService } from './enrichmentService';

export interface ImportResult {
  chapters: {
    title: string;
    summary: string;
    scenes: {
      title: string;
      summary: string;
      pov?: string;
      mood?: string;
      location?: string;
      conflict?: string;
      stakes?: string;
    }[];
    // Enrichment fields
    act?: string;
    primaryPov?: string;
    chapterGoal?: string;
    theme?: string;
    timeContext?: string;
  }[];
  characters: {
    name: string;
    role: string;
    description: string;
    archetype?: string;
    personality?: string;
  }[];
  world: {
    name: string;
    category: string;
    description: string;
    significance?: string;
  }[];
}

// Model-specific chunk sizes (in words)
// Smaller for local models to ensure complete JSON responses
// Larger for Gemini which has massive context windows
const CHUNK_SIZES = {
  ollama: 800,    // ~3,200 tokens - safe for 4K-8K context models
  gemini: 2500    // ~10,000 tokens - Gemini handles 1M+ tokens easily
};

export const ImportAnalyzer = {
  /**
   * Phase 1: Extract structure with progress tracking
   * Uses model-appropriate chunk sizes for reliability
   */
  extractStructure: async (
    text: string,
    onProgress?: (chunk: number, total: number, data: Partial<ImportResult>) => void
  ): Promise<ImportResult> => {
    const store = useImportJobStore.getState();

    // Get the configured import provider
    const { useTokenTrackingStore } = await import('../../stores/tokenTrackingStore');
    const provider = useTokenTrackingStore.getState().importProvider;

    // 1. Chunking - Use provider-appropriate chunk size
    const words = text.split(/\s+/);
    const CHUNK_SIZE = CHUNK_SIZES[provider] || CHUNK_SIZES.ollama;
    const chunks: string[] = [];

    console.log(`Import: Using ${provider} with chunk size ${CHUNK_SIZE} words`);

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
    }

    console.log(`Import: Split into ${chunks.length} chunks of ~${CHUNK_SIZE} words each`);
    store.startImport(chunks.length);

    const consolidated: ImportResult = {
      chapters: [],
      characters: [],
      world: []
    };

    // 2. Process Chunks with Progress Tracking
    for (const [index, chunk] of chunks.entries()) {
      // Check for pause
      if (store.progress.pauseRequested) {
        console.log('Import paused at chunk', index + 1);
        while (store.progress.pauseRequested) {
          await new Promise(r => setTimeout(r, 500));
        }
        console.log('Import resumed');
      }

      store.updateProgress({ currentChunkPreview: chunk.substring(0, 100) + '...' });

      const prompt = `
Extract story structure from this text segment (Part ${index + 1}/${chunks.length}).

Return ONLY valid JSON:
{
  "chapters": [
    {
      "title": "Chapter X: Title",
      "summary": "Brief summary of chapter",
      "scenes": [
        { "title": "Scene name", "summary": "What happens in the scene" }
      ]
    }
  ],
  "characters": [
    { "name": "Character Full Name", "role": "protagonist/antagonist/supporting/minor", "description": "Brief description" }
  ],
  "world": [
    { "name": "Location/Item Name", "category": "location/supernatural/faction/technology/history", "description": "Brief description" }
  ]
}

IMPORTANT CLASSIFICATION RULES:
- CHARACTERS: Named individuals ONLY (people with actual names like "Elena Gilbert", "Count Dracula")
- WORLD: Species, groups, systems, concepts, places (like "Vampires", "The Council", "Blood Magic", "Mystic Falls")
  - If it's a TYPE of being (vampires, werewolves, witches) → WORLD with category "supernatural"
  - If it's an organization or group → WORLD with category "faction"

CRITICAL: Extract EVERY chapter mentioned. Do not summarize or skip any.

TEXT:
${chunk}
`;

      try {
        const response = await AgentService.generateText({
          systemPrompt: 'Extract story structure. Return valid JSON only. Include all chapters.',
          userPrompt: prompt,
          operation: 'import'
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);

          const chaptersFound = data.chapters?.length || 0;
          const charsFound = data.characters?.length || 0;
          const worldFound = data.world?.length || 0;

          console.log(`Chunk ${index + 1}/${chunks.length}: ${chaptersFound} chapters, ${charsFound} characters, ${worldFound} world items`);

          // INLINE ENRICHMENT: Enrich each chapter while chunk context is available
          for (const chapter of (data.chapters || [])) {
            try {
              console.log(`  Enriching chapter: ${chapter.title}`);
              const enrichment = await EnrichmentService.inlineEnrichFromChunk(
                chapter,
                data.characters || [],
                data.world || [],
                chunk
              );

              // Merge chapter enrichment
              if (enrichment.chapter) {
                Object.assign(chapter, enrichment.chapter);
              }

              // Merge scene enrichments with Fuzzy + Index matching
              // AI sometimes changes scene titles (e.g. "Scene 1" vs "The Meeting")
              (enrichment.scenes || []).forEach((enrichedScene, idx) => {
                let scene = chapter.scenes?.find((s: any) =>
                  s.title.toLowerCase() === enrichedScene.title.toLowerCase()
                );

                // Fallback: If no title match, assume order matches (index-based)
                if (!scene && chapter.scenes && chapter.scenes[idx]) {
                  console.log(`  Merging scene by index [${idx}]: "${chapter.scenes[idx].title}" logic-linked to "${enrichedScene.title}"`);
                  scene = chapter.scenes[idx];
                }

                if (scene) {
                  Object.assign(scene, enrichedScene);
                } else {
                  console.warn(`  Could not match enriched scene "${enrichedScene.title}" to any extracted scene.`);
                }
              });


              // Merge character enrichments into extracted characters
              for (const enrichedChar of (enrichment.characters || [])) {
                const char = data.characters?.find((c: any) =>
                  c.name.toLowerCase() === enrichedChar.name.toLowerCase()
                );
                if (char) {
                  Object.assign(char, enrichedChar);
                }
              }

              // Merge world item enrichments
              for (const enrichedWorld of (enrichment.worldItems || [])) {
                const worldItem = data.world?.find((w: any) =>
                  w.name.toLowerCase() === enrichedWorld.name.toLowerCase()
                );
                if (worldItem) {
                  Object.assign(worldItem, enrichedWorld);
                }
              }
            } catch (enrichError) {
              console.warn(`  Enrichment failed for ${chapter.title}:`, enrichError);
            }
          }

          if (data.chapters) consolidated.chapters.push(...data.chapters);
          if (data.characters) consolidated.characters.push(...data.characters);
          if (data.world) consolidated.world.push(...data.world);

          store.addExtracted(chaptersFound, charsFound, worldFound);

          if (onProgress) {
            onProgress(index + 1, chunks.length, data);
          }
        } else {
          console.warn(`Chunk ${index + 1}: No valid JSON in response`);
          store.setError(`Chunk ${index + 1}: Invalid response format`);
        }
      } catch (e) {
        console.error(`Error on chunk ${index + 1}:`, e);
        store.setError(`Chunk ${index + 1}: ${(e as Error).message}`);
      }

      store.incrementChunk();
    }

    console.log(`Import: Raw totals - ${consolidated.chapters.length} chapters, ${consolidated.characters.length} characters, ${consolidated.world.length} world items`);

    // 3. Deduplication
    const result = ImportAnalyzer.deduplicateResults(consolidated);

    console.log(`Import: After dedup - ${result.chapters.length} chapters, ${result.characters.length} characters, ${result.world.length} world items`);

    store.updateProgress({ status: 'complete', phase: 2 });

    return result;
  },

  /**
   * Deduplicate extracted data
   */
  deduplicateResults: (data: ImportResult): ImportResult => {
    // Chapter deduplication
    const normalizeTitle = (title: string): string => {
      const match = title.match(/chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d+)/i);
      if (match) return match[1].toLowerCase();
      if (title.toLowerCase().includes('prologue')) return 'prologue';
      if (title.toLowerCase().includes('epilogue')) return 'epilogue';
      return title.toLowerCase().trim();
    };

    const uniqueChapters = new Map<string, any>();
    for (const chapter of data.chapters) {
      const key = normalizeTitle(chapter.title);
      if (uniqueChapters.has(key)) {
        const existing = uniqueChapters.get(key);
        // Prefer longer summary
        if (chapter.summary?.length > (existing.summary?.length || 0)) {
          existing.summary = chapter.summary;
        }
        // Merge scenes
        const existingTitles = new Set(existing.scenes?.map((s: any) => s.title.toLowerCase()) || []);
        for (const scene of (chapter.scenes || [])) {
          if (!existingTitles.has(scene.title.toLowerCase())) {
            existing.scenes = existing.scenes || [];
            existing.scenes.push(scene);
          }
        }
      } else {
        uniqueChapters.set(key, { ...chapter, scenes: chapter.scenes || [] });
      }
    }

    const sortedChapters = Array.from(uniqueChapters.values()).sort((a, b) => {
      const numA = parseInt(normalizeTitle(a.title)) || 999;
      const numB = parseInt(normalizeTitle(b.title)) || 999;
      return numA - numB;
    });

    // Character deduplication
    const uniqueChars = new Map<string, any>();
    const sortedChars = [...data.characters].sort((a, b) => b.name.length - a.name.length);

    for (const char of sortedChars) {
      let foundAlias = false;
      for (const existingName of uniqueChars.keys()) {
        const existingParts = existingName.toLowerCase().split(' ');
        const currentParts = char.name.toLowerCase().split(' ');
        if (currentParts.every(part => existingParts.includes(part))) {
          foundAlias = true;
          break;
        }
      }
      if (!foundAlias) {
        uniqueChars.set(char.name, char);
      }
    }

    // World item deduplication
    const uniqueWorld = new Map<string, any>();
    data.world.forEach(w => {
      if (!uniqueWorld.has(w.name.toLowerCase())) {
        uniqueWorld.set(w.name.toLowerCase(), w);
      }
    });

    return {
      chapters: sortedChapters,
      characters: Array.from(uniqueChars.values()),
      world: Array.from(uniqueWorld.values())
    };
  },

  // Legacy method for backwards compatibility
  analyzeOverview: async (text: string) => {
    return ImportAnalyzer.extractStructure(text);
  }
};
