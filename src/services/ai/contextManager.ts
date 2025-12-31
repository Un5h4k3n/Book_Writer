import { useProjectStore } from "../../stores/projectStore";

// Algorithm: Score = (Recency * 0.4) + (KeywordMatch * 0.3) + (ExplicitLink * 0.3) (Simplified)
export const ContextManager = {
  gatherContext: async (
    currentChapterId: string,
    currentSceneId: string,
  ): Promise<string> => {
    const store = useProjectStore.getState();
    const currentChapter = store.chapters.find(
      (c) => c.id === currentChapterId,
    );

    if (!currentChapter) return "";

    // 1. Keyword Matching (Naive implementation)
    // We scan the scene summary/title for names of characters or world items.
    const activeScene = currentChapter.scenes.find(
      (s) => s.id === currentSceneId,
    );
    const searchText = (
      activeScene?.title +
      " " +
      activeScene?.summary
    ).toLowerCase();

    const relevantChars = store.characters.filter((c) =>
      searchText.includes(c.name.toLowerCase()),
    );

    const relevantWorld = store.worldItems.filter((w) =>
      searchText.includes(w.name.toLowerCase()),
    );

    // 2. Previous Scene Context (Recency)
    // Find the scene immediately before this one.
    const prevSceneSummary = "None (Start of book)";
    // Logic to find prev scene omitted for brevity, assuming standard order

    // Construct Context String
    const contextStr = `
    ### Context Data
    
    **Current Chapter**: ${currentChapter.title}
    **Scene Goal**: ${activeScene?.summary || "Draft a compelling scene."}
    **Previous Scene**: ${prevSceneSummary}
    
    **Relevant Characters**:
    ${relevantChars.map((c) => `- ${c.name} (${c.role}): ${c.shortDescription} [Archetype: ${c.archetype}]`).join("\n")}
    
    **World Rules/Locations**:
    ${relevantWorld.map((w) => `- ${w.name} (${w.category}): ${w.shortDescription}`).join("\n")}
    `;

    return contextStr;
  },
};
