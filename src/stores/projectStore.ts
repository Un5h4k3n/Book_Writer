import { create } from 'zustand';
import { db } from '../services/db/db';
import type { Character, WorldItem, Chapter, Project, Scene } from '../types';

interface ProjectState {
    projects: Project[]; // List of available projects
    isLoading: boolean;
    // Active Project Data
    project: Project | null;
    characters: Character[];
    worldItems: WorldItem[];
    chapters: Chapter[];

    // System Actions
    init: () => Promise<void>;
    createNewProject: (title: string, genre: string) => Promise<string>;
    loadProject: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    clearCurrentProject: () => Promise<void>;

    // Active Project Actions
    addCharacter: (char: Character) => void;
    updateCharacter: (id: string, updates: Partial<Character>) => void;
    deleteCharacter: (id: string) => void;
    addWorldItem: (item: WorldItem) => void;
    updateWorldItem: (id: string, updates: Partial<WorldItem>) => void;
    deleteWorldItem: (id: string) => void;
    addChapter: (ch: Chapter) => void;
    updateChapter: (id: string, updates: Partial<Chapter>) => void;
    deleteChapter: (id: string) => void;
    updateScene: (sceneId: string, updates: Partial<Scene>) => void;

    // Cloud
    isSyncing: boolean;
    syncToCloud: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    isLoading: true, // Start loading
    project: null,
    characters: [],
    worldItems: [],
    chapters: [],

    init: async () => {
        set({ isLoading: true });
        try {
            const projects = await db.getAllProjects();
            set({ projects });

            // Auto-load last active project
            const lastId = localStorage.getItem('lastActiveProjectId');
            if (lastId) {
                // Determine if valid
                if (projects.some(p => p.id === lastId)) {
                    await get().loadProject(lastId);
                } else {
                    localStorage.removeItem('lastActiveProjectId');
                }
            }
        } finally {
            set({ isLoading: false });
        }
    },

    createNewProject: async (title, genre) => {
        const newProject: Project = {
            id: crypto.randomUUID(),
            title,
            genre,
            author: 'Me', // Default
            created_at: Date.now(),
            updated_at: Date.now()
        };
        await db.saveProject(newProject);
        set(state => ({ projects: [...state.projects, newProject] }));
        await get().loadProject(newProject.id);

        // Cloud Sync
        import('../services/db/firebaseSync').then(m => m.syncProjectMetadata(newProject));

        return newProject.id;
    },

    loadProject: async (id) => {
        const project = await db.getProject(id);
        if (!project) return;

        localStorage.setItem('lastActiveProjectId', id); // Persist selection

        const [chapters, characters, world] = await Promise.all([
            db.getAllChapters(id),
            db.getAllCharacters(id),
            db.getAllWorldItems(id)
        ]);

        // Sort chapters by order
        chapters.sort((a, b) => a.order - b.order);

        set({
            project,
            chapters,
            characters,
            worldItems: world
        });
    },

    deleteProject: async (id) => {
        await db.deleteProject(id);

        // Cloud Sync - Delete entire project structure? 
        // For now, let's at least delete the metadata to hide it from lists
        // Ideally we'd use a cloud function or recursive delete, but here:
        import('firebase/firestore').then(async ({ doc, deleteDoc }) => {
            // We can't easily delete subcollections from client SDK without recursion.
            // Just deleting the project doc is a 'soft' delete effectively for the list.
            const { db } = await import('../services/firebase');
            const ref = doc(db, 'projects', id);
            await deleteDoc(ref);
        });

        // Handle Active Project Deletion
        const { project } = get();
        const isCurrent = project?.id === id;

        if (isCurrent) {
            localStorage.removeItem('lastActiveProjectId');
        }

        set(state => ({
            projects: state.projects.filter(p => p.id !== id),
            project: isCurrent ? null : state.project,
            // Clear data if we just deleted the active project
            characters: isCurrent ? [] : state.characters,
            chapters: isCurrent ? [] : state.chapters,
            worldItems: isCurrent ? [] : state.worldItems,
        }));
    },

    clearCurrentProject: async () => {
        const { project } = get();
        if (!project) return;

        // Delete from DB
        await Promise.all([
            db.chapters.where('projectId').equals(project.id).delete(),
            db.characters.where('projectId').equals(project.id).delete(),
            db.worldItems.where('projectId').equals(project.id).delete()
        ]);

        // Clear local state
        set({
            chapters: [],
            characters: [],
            worldItems: []
        });
    },

    /* -------------------------------------------------------------------------- */
    /*                             Active Data Logic                              */
    /* -------------------------------------------------------------------------- */
    // Note: We optimistically update UI (set) AND fire-and-forget DB save

    addCharacter: (char) => {
        const { project } = get();
        if (!project) return;
        const newChar = { ...char, projectId: project.id }; // Ensure ID linkage if missing
        db.saveCharacter(newChar as Character);
        set((state) => ({ characters: [...state.characters, newChar as Character] }));

        // Cloud Sync
        import('../services/db/firebaseSync').then(m => m.syncCharacter(project.id, newChar as Character));
    },

    updateCharacter: (id, updates) => {
        const { characters, project } = get();
        const char = characters.find(c => c.id === id);
        if (char) {
            const updated = { ...char, ...updates };
            db.saveCharacter(updated);
            set((state) => ({
                characters: state.characters.map(c => c.id === id ? updated : c)
            }));

            // Cloud Sync
            if (project) import('../services/db/firebaseSync').then(m => m.syncCharacter(project.id, updated));
        }
    },

    deleteCharacter: (id) => {
        db.characters.delete(id);
        const { project } = get();
        set((state) => ({
            characters: state.characters.filter(c => c.id !== id)
        }));

        // Cloud Sync
        if (project) import('../services/db/firebaseSync').then(m => m.removeCharacter(project.id, id));
    },

    addWorldItem: (item) => {
        const { project } = get();
        if (!project) return;
        const newItem = { ...item, projectId: project.id };
        db.saveWorldItem(newItem as WorldItem);
        set((state) => ({ worldItems: [...state.worldItems, newItem as WorldItem] }));

        // Cloud Sync
        import('../services/db/firebaseSync').then(m => m.syncWorldItem(project.id, newItem as WorldItem));
    },

    updateWorldItem: (id, updates) => {
        const { worldItems, project } = get();
        const item = worldItems.find(w => w.id === id);
        if (item) {
            const updated = { ...item, ...updates };
            db.saveWorldItem(updated);
            set((state) => ({
                worldItems: state.worldItems.map(w => w.id === id ? updated : w)
            }));

            // Cloud Sync
            if (project) import('../services/db/firebaseSync').then(m => m.syncWorldItem(project.id, updated));
        }
    },

    deleteWorldItem: (id) => {
        db.worldItems.delete(id);
        const { project } = get();
        set((state) => ({
            worldItems: state.worldItems.filter(w => w.id !== id)
        }));

        // Cloud Sync
        if (project) import('../services/db/firebaseSync').then(m => m.removeWorldItem(project.id, id));
    },

    addChapter: (ch) => {
        const { project } = get();
        if (!project) return;
        const newChapter = { ...ch, projectId: project.id };
        db.saveChapter(newChapter as Chapter);
        set((state) => ({ chapters: [...state.chapters, newChapter as Chapter] }));

        // Cloud Sync
        import('../services/db/firebaseSync').then(m => m.syncChapter(project.id, newChapter as Chapter));
    },

    updateChapter: (id, updates) => {
        const { chapters, project } = get();
        const ch = chapters.find(c => c.id === id);
        if (ch) {
            const updated = { ...ch, ...updates };
            db.saveChapter(updated);
            set((state) => ({
                chapters: state.chapters.map(c => c.id === id ? updated : c)
            }));

            // Cloud Sync
            if (project) import('../services/db/firebaseSync').then(m => m.syncChapter(project.id, updated));
        }
    },

    deleteChapter: (id) => {
        db.chapters.delete(id);
        const { project } = get();
        set((state) => ({
            chapters: state.chapters.filter(c => c.id !== id)
        }));

        // Cloud Sync
        if (project) import('../services/db/firebaseSync').then(m => m.removeChapter(project.id, id));
    },

    updateScene: (sceneId, updates) => {
        const { project } = get();
        set((state) => {
            const newChapters = state.chapters.map(ch => {
                const sceneIndex = ch.scenes.findIndex((s: Scene) => s.id === sceneId);
                if (sceneIndex === -1) return ch;

                const newScenes = [...ch.scenes];
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], ...updates };
                const newChapter = { ...ch, scenes: newScenes };

                // Persist the PARENT chapter which contains the scene
                db.saveChapter(newChapter);

                // Cloud Sync
                if (project) import('../services/db/firebaseSync').then(m => m.syncChapter(project.id, newChapter));

                return newChapter;
            });
            return { chapters: newChapters };
        });
    },

    /* -------------------------------------------------------------------------- */
    /*                                Cloud Sync                                  */
    /* -------------------------------------------------------------------------- */
    isSyncing: false,
    syncToCloud: async () => {
        const { project, characters, worldItems, chapters } = get();
        if (!project) return;

        set({ isSyncing: true });
        try {
            // Dynamic import to avoid strict dependency if not configured
            const { saveProjectToCloud } = await import('../services/db/firebaseSync');
            await saveProjectToCloud(project, characters, worldItems, chapters);
            console.log('Project synced to cloud successfully');
        } catch (error) {
            console.error('Cloud sync failed:', error);
            throw error;
        } finally {
            set({ isSyncing: false });
        }
    }
}));
