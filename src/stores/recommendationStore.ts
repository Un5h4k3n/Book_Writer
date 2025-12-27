import { create } from 'zustand';
import type { OutlineRecommendation } from '../services/ai/outlineReviewer';

interface RecommendationStore {
    recommendations: OutlineRecommendation[];
    isReviewing: boolean;
    lastReviewDate: number | null;

    // Actions
    setRecommendations: (recs: OutlineRecommendation[]) => void;
    addRecommendation: (rec: OutlineRecommendation) => void;
    updateStatus: (id: string, status: 'pending' | 'applied' | 'dismissed') => void;
    dismissAll: () => void;
    clearAll: () => void;
    setReviewing: (reviewing: boolean) => void;

    // Selectors
    getPending: () => OutlineRecommendation[];
    getByPriority: (priority: 'high' | 'medium' | 'low') => OutlineRecommendation[];
    getByType: (type: string) => OutlineRecommendation[];
}

export const useRecommendationStore = create<RecommendationStore>((set, get) => ({
    recommendations: [],
    isReviewing: false,
    lastReviewDate: null,

    setRecommendations: (recs) => set({
        recommendations: recs,
        lastReviewDate: Date.now()
    }),

    addRecommendation: (rec) => set(state => ({
        recommendations: [...state.recommendations, rec]
    })),

    updateStatus: (id, status) => set(state => ({
        recommendations: state.recommendations.map(r =>
            r.id === id ? { ...r, status } : r
        )
    })),

    dismissAll: () => set(state => ({
        recommendations: state.recommendations.map(r => ({ ...r, status: 'dismissed' as const }))
    })),

    clearAll: () => set({ recommendations: [], lastReviewDate: null }),

    setReviewing: (reviewing) => set({ isReviewing: reviewing }),

    getPending: () => get().recommendations.filter(r => r.status === 'pending'),

    getByPriority: (priority) => get().recommendations.filter(r => r.priority === priority),

    getByType: (type) => get().recommendations.filter(r => r.type === type)
}));
