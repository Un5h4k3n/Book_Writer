export const ChunkingService = {
  /**
   * Splits a large text body into manageable chunks based on headers or rough word counts.
   */
  chunkText: (text: string): { title: string; content: string }[] => {
    const lines = text.split("\n");
    const chunks: { title: string; content: string }[] = [];
    let currentTitle = "Introduction";
    let currentContent: string[] = [];

    const headerRegex = /^(#+\s|Chapter\s|Scene\s)/i;

    for (const line of lines) {
      if (headerRegex.test(line)) {
        if (currentContent.length > 0) {
          chunks.push({
            title: currentTitle,
            content: currentContent.join("\n"),
          });
        }
        currentTitle = line.replace(/#+\s*/, "").trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Push last chunk
    if (currentContent.length > 0) {
      chunks.push({ title: currentTitle, content: currentContent.join("\n") });
    }

    return chunks;
  },
};
