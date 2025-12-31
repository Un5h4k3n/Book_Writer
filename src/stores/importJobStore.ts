import { create } from "zustand";

export interface ImportProgress {
  status: "idle" | "extracting" | "enriching" | "complete" | "error" | "paused";
  phase: 1 | 2;
  totalChunks: number;
  processedChunks: number;
  extractedChapters: number;
  extractedCharacters: number;
  extractedWorldItems: number;
  currentChunkPreview?: string;
  errors: string[];
  startTime?: number;
  pauseRequested: boolean;
}

interface ImportJobStore {
  progress: ImportProgress;

  // Actions
  startImport: (totalChunks: number) => void;
  updateProgress: (update: Partial<ImportProgress>) => void;
  incrementChunk: () => void;
  addExtracted: (
    chapters: number,
    characters: number,
    worldItems: number,
  ) => void;
  setError: (error: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;

  // Computed
  getPercentage: () => number;
  getEstimatedTimeRemaining: () => string;
}

const initialProgress: ImportProgress = {
  status: "idle",
  phase: 1,
  totalChunks: 0,
  processedChunks: 0,
  extractedChapters: 0,
  extractedCharacters: 0,
  extractedWorldItems: 0,
  errors: [],
  pauseRequested: false,
};

export const useImportJobStore = create<ImportJobStore>((set, get) => ({
  progress: initialProgress,

  startImport: (totalChunks: number) =>
    set({
      progress: {
        ...initialProgress,
        status: "extracting",
        phase: 1,
        totalChunks,
        startTime: Date.now(),
      },
    }),

  updateProgress: (update: Partial<ImportProgress>) =>
    set((state) => ({
      progress: { ...state.progress, ...update },
    })),

  incrementChunk: () =>
    set((state) => ({
      progress: {
        ...state.progress,
        processedChunks: state.progress.processedChunks + 1,
      },
    })),

  addExtracted: (chapters: number, characters: number, worldItems: number) =>
    set((state) => ({
      progress: {
        ...state.progress,
        extractedChapters: state.progress.extractedChapters + chapters,
        extractedCharacters: state.progress.extractedCharacters + characters,
        extractedWorldItems: state.progress.extractedWorldItems + worldItems,
      },
    })),

  setError: (error: string) =>
    set((state) => ({
      progress: {
        ...state.progress,
        status: "error",
        errors: [...state.progress.errors, error],
      },
    })),

  pause: () =>
    set((state) => ({
      progress: { ...state.progress, pauseRequested: true, status: "paused" },
    })),

  resume: () =>
    set((state) => ({
      progress: {
        ...state.progress,
        pauseRequested: false,
        status: "extracting",
      },
    })),

  reset: () => set({ progress: initialProgress }),

  getPercentage: () => {
    const { totalChunks, processedChunks } = get().progress;
    if (totalChunks === 0) return 0;
    return Math.round((processedChunks / totalChunks) * 100);
  },

  getEstimatedTimeRemaining: () => {
    const { startTime, processedChunks, totalChunks } = get().progress;
    if (!startTime || processedChunks === 0) return "Calculating...";

    const elapsed = Date.now() - startTime;
    const avgTimePerChunk = elapsed / processedChunks;
    const remainingChunks = totalChunks - processedChunks;
    const remainingMs = avgTimePerChunk * remainingChunks;

    const minutes = Math.ceil(remainingMs / 60000);
    if (minutes < 1) return "Less than a minute";
    if (minutes === 1) return "~1 minute remaining";
    return `~${minutes} minutes remaining`;
  },
}));
