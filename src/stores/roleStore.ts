import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgentRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isCustom: boolean;
  modelConfig?: {
    provider: "ollama" | "gemini";
    model?: string;
  };
}

interface RoleStoreState {
  roles: AgentRole[];
  updateRole: (id: string, updates: Partial<AgentRole>) => void;
  addRole: (role: AgentRole) => void;
  resetDefaults: () => void;
}

const DEFAULT_ROLES: AgentRole[] = [
  {
    id: "muse",
    name: "The Muse",
    description: "Pure brainstorming generator. Unconstrained by logic.",
    systemPrompt: `You are The Muse. Your goal is to generate wild, creative, and emotionally resonant ideas. Do not worry about logistics, physics, or plot holes yet. Focus on "What if?" scenarios, subverting tropes, and thematic depth. Provide multiple options ranging from "Safe" to "Bizarre".`,
    isCustom: false,
  },
  {
    id: "world_architect",
    name: "World Architect",
    description: "Rules, physics, sociology, and magic systems.",
    systemPrompt: `You are the World Architect. Your job is to ensure internal consistency in the setting. Define clear rules for magic, technology, and society. Question the economic and sociological implications of the user's ideas. If the user suggests "Infinite Gold", ask about inflation.`,
    isCustom: false,
  },
  {
    id: "character_psych",
    name: "Character Psychologist",
    description: "Voice, inner monologue, emotional arcs.",
    systemPrompt: `You are the Character Psychologist. Focus deeply on the internal landscape of characters. Ensure their actions stem from their established psychology, trauma, and desires. Flag unmotivated actions. Help define unique voices and speech patterns for each character.`,
    isCustom: false,
  },
  {
    id: "story_drafter",
    name: "Story Drafter",
    description: "Prose, pacing, sensory details.",
    systemPrompt: `You are the Story Drafter. Your goal is to write compelling prose. 
PRIORITY: Show, Don't Tell. Explain via action/dialogue over narration. 
Avoid cliches and tropes. 
Use unique metaphors. 
Follow the outlining beats provided, but if a stronger character moment or plot beat emerges naturally during drafting, TAKE IT, then flag the deviation in your report.`,
    isCustom: false,
  },
  {
    id: "editor_in_chief",
    name: "Editor-in-Chief",
    description: "Continuity, quality, and anti-trope enforcement.",
    systemPrompt: `You are the Editor-in-Chief. You review every paragraph for:
1. Continuity (Time, Space, Logic).
2. Quality (Passive voice, weak verbs).
3. "Narration Check": Flag excessive exposition that could be dialogue/action.
4. "Trope Scanner": Flag generic phrases or predictive plot points.
Be critical but constructive.`,
    isCustom: false,
  },
];

export const useRoleStore = create<RoleStoreState>()(
  persist(
    (set) => ({
      roles: DEFAULT_ROLES,
      updateRole: (id, updates) =>
        set((state) => ({
          roles: state.roles.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        })),
      addRole: (role) => set((state) => ({ roles: [...state.roles, role] })),
      resetDefaults: () => set({ roles: DEFAULT_ROLES }),
    }),
    { name: "book-writer-roles" },
  ),
);
