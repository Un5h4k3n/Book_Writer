import { create } from "zustand";

export type EnrichmentItemType = "chapter" | "character" | "world" | "scene";

export interface EnrichmentQueueItem {
  id: string;
  type: EnrichmentItemType;
  name: string;
  status: "pending" | "processing" | "complete" | "error";
  error?: string;
}

interface EnrichmentQueueStore {
  queue: EnrichmentQueueItem[];
  isProcessing: boolean;
  currentItem: EnrichmentQueueItem | null;
  processedCount: number;

  // Actions
  addToQueue: (item: Omit<EnrichmentQueueItem, "status">) => void;
  addBatch: (items: Omit<EnrichmentQueueItem, "status">[]) => void;
  startProcessing: () => void;
  stopProcessing: () => void;
  markComplete: (id: string) => void;
  markError: (id: string, error: string) => void;
  setCurrentItem: (item: EnrichmentQueueItem | null) => void;
  clearQueue: () => void;
  removeFromQueue: (id: string) => void;
}

export const useEnrichmentQueueStore = create<EnrichmentQueueStore>((set) => ({
  queue: [],
  isProcessing: false,
  currentItem: null,
  processedCount: 0,

  addToQueue: (item) =>
    set((state) => ({
      queue: [...state.queue, { ...item, status: "pending" }],
    })),

  addBatch: (items) =>
    set((state) => ({
      queue: [
        ...state.queue,
        ...items.map((item) => ({ ...item, status: "pending" as const })),
      ],
    })),

  startProcessing: () => set({ isProcessing: true }),
  stopProcessing: () => set({ isProcessing: false }),

  markComplete: (id) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status: "complete" } : item,
      ),
      processedCount: state.processedCount + 1,
    })),

  markError: (id, error) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status: "error", error } : item,
      ),
    })),

  setCurrentItem: (item) => set({ currentItem: item }),

  clearQueue: () =>
    set({
      queue: [],
      isProcessing: false,
      currentItem: null,
      processedCount: 0,
    }),

  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    })),
}));
