export interface Project {
    id: string;
    title: string;
    genre: string;
    author: string;
    created_at: number;
    updated_at: number;
}

export interface Character {
    id: string;
    projectId: string;
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    shortDescription: string;

    // Core Identity
    archetype?: string;
    personality?: string;
    physicalDescription?: string;

    // Motivation & Psychology
    backstory?: string;
    motivations?: string;
    fears?: string;
    secrets?: string;

    // Traits
    strengths?: string[];
    weaknesses?: string[];

    // Relationships & Arc
    relationships?: { name: string; type: string }[];
    arc?: string;
    voice?: string;
    firstAppearance?: string;

    // Enrichment Status
    needsEnrichment?: boolean;
    attributes: Record<string, string>;
    roleAnalysis?: string;
}

// Category-specific fields stored in attributes
export type WorldCategory = 'location' | 'supernatural' | 'faction' | 'technology' | 'history' | 'other';

export interface WorldItem {
    id: string;
    projectId: string;
    category: WorldCategory;
    name: string;
    shortDescription: string;

    // Common Fields (All Categories)
    history?: string;
    significance?: string;
    connectedCharacters?: string[];
    connectedEvents?: string[];
    mysteries?: string;

    // Enrichment Status
    needsEnrichment?: boolean;

    // Category-specific fields stored here
    attributes: Record<string, string>;
}

export interface Scene {
    id: string;
    title: string;
    summary: string;
    beatSheet: string[];
    content: string;
    status: 'drafting' | 'review' | 'done';

    // Narrative Core
    pov?: string;
    goals?: string;
    stakes?: string;
    conflict?: string;
    outcome?: string;
    foreshadowing?: string;

    // Atmosphere & Pacing
    mood?: string;
    location?: string;
    tensionLevel?: number; // 1-10
    pacing?: 'slow' | 'medium' | 'fast';
    sensoryFocus?: string;

    // Characters & Dialogue
    charactersPresent?: string[];
    keyDialogue?: string[];

    // Structure
    emotionalArc?: { start: string; end: string };
    plotFunction?: string;
    needsEnrichment?: boolean;
}

export interface Chapter {
    id: string;
    projectId: string;
    title: string;
    order: number;
    summary: string;
    scenes: Scene[];

    // Narrative Structure
    act?: 'setup' | 'rising' | 'climax' | 'falling' | 'resolution';
    primaryPov?: string;
    chapterGoal?: string;
    chapterForeshadowing?: string;
    timeContext?: string;
    theme?: string;
    needsEnrichment?: boolean;

    // Content Planning
    subplotThreads?: string[];
    keyLocations?: string[];
    keyCharacters?: string[];
    wordCountTarget?: number;
    openingHook?: string;
    closingImage?: string;
}

export interface Outline {
    id: string;
    projectId: string;
    chapters: string[];
}
