/* eslint-disable @typescript-eslint/no-explicit-any */
import { openDB, type DBSchema } from "idb";
import type { Project, Character, WorldItem, Chapter } from "../../types";

interface BookWriterDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  characters: {
    key: string;
    value: Character;
    indexes: { "by-project": string }; // Index to find characters by project (if multi-project later)
  };
  world: {
    key: string;
    value: WorldItem;
    indexes: { "by-project": string };
  };
  chapters: {
    key: string;
    value: Chapter;
    indexes: { "by-project": string };
  };
}

const DB_NAME = "book-writer-db";
const DB_VERSION = 2; // Bumped to trigger upgrade for indexes

export const dbPromise = openDB<BookWriterDB>(DB_NAME, DB_VERSION, {
  upgrade(db, _oldVersion, _newVersion, transaction) {
    // 1. Projects Store
    if (!db.objectStoreNames.contains("projects")) {
      db.createObjectStore("projects", { keyPath: "id" });
    }

    // 2. Characters Store
    let charStore;
    if (!db.objectStoreNames.contains("characters")) {
      charStore = db.createObjectStore("characters", { keyPath: "id" });
    } else {
      charStore = transaction.objectStore("characters");
    }
    if (!(charStore.indexNames.contains as any)("by-project")) {
      charStore.createIndex("by-project", "projectId");
    }

    // 3. World Store
    let worldStore;
    if (!db.objectStoreNames.contains("world")) {
      worldStore = db.createObjectStore("world", { keyPath: "id" });
    } else {
      worldStore = transaction.objectStore("world");
    }
    if (!(worldStore.indexNames.contains as any)("by-project")) {
      worldStore.createIndex("by-project", "projectId");
    }

    // 4. Chapters Store
    let chapterStore;
    if (!db.objectStoreNames.contains("chapters")) {
      chapterStore = db.createObjectStore("chapters", { keyPath: "id" });
    } else {
      chapterStore = transaction.objectStore("chapters");
    }
    if (!(chapterStore.indexNames.contains as any)("by-project")) {
      chapterStore.createIndex("by-project", "projectId");
    }
  },
});

// Helper for simple CRUD
export const db = {
  getAllProjects: async () => (await dbPromise).getAll("projects"),
  getProject: async (id: string) => (await dbPromise).get("projects", id),
  saveProject: async (project: Project) =>
    (await dbPromise).put("projects", project),
  deleteProject: async (id: string) => {
    const db = await dbPromise;
    const tx = db.transaction(
      ["projects", "chapters", "characters", "world"],
      "readwrite",
    );

    // Delete Project
    await tx.objectStore("projects").delete(id);

    // Delete Related Items (Manual cascade since IDB doesn't support it natively)
    // Note: For large datasets, iterate with cursor. For now, getAllKeys is fine.
    const chapterIdx = tx.objectStore("chapters").index("by-project");
    const charIdx = tx.objectStore("characters").index("by-project");
    const worldIdx = tx.objectStore("world").index("by-project");

    const chapterKeys = await (chapterIdx as any).getAllKeys(id);
    const charKeys = await (charIdx as any).getAllKeys(id);
    const worldKeys = await (worldIdx as any).getAllKeys(id);

    await Promise.all([
      ...chapterKeys.map((k: any) => tx.objectStore("chapters").delete(k)),
      ...charKeys.map((k: any) => tx.objectStore("characters").delete(k)),
      ...worldKeys.map((k: any) => tx.objectStore("world").delete(k)),
    ]);

    await tx.done;
  },

  getAllChapters: async (projectId: string) => {
    return (await dbPromise).getAllFromIndex(
      "chapters",
      "by-project" as any,
      projectId,
    );
  },
  saveChapter: async (chapter: Chapter) =>
    (await dbPromise).put("chapters", chapter),
  deleteChapter: async (id: string) => (await dbPromise).delete("chapters", id),

  getAllCharacters: async (projectId: string) => {
    return (await dbPromise).getAllFromIndex(
      "characters",
      "by-project" as any,
      projectId,
    );
  },
  saveCharacter: async (char: Character) =>
    (await dbPromise).put("characters", char),
  deleteCharacter: async (id: string) =>
    (await dbPromise).delete("characters", id),

  getAllWorldItems: async (projectId: string) => {
    return (await dbPromise).getAllFromIndex("world", "by-project" as any, projectId);
  },
  saveWorldItem: async (item: WorldItem) =>
    (await dbPromise).put("world", item),
  deleteWorldItem: async (id: string) => (await dbPromise).delete("world", id),

  clearProjectData: async (projectId: string) => {
    const db = await dbPromise;
    const tx = db.transaction(["chapters", "characters", "world"], "readwrite");

    // Get all keys first
    const chapterKeys = await (tx.objectStore("chapters").index("by-project") as any).getAllKeys(projectId);
    const charKeys = await (tx.objectStore("characters").index("by-project") as any).getAllKeys(projectId);
    const worldKeys = await (tx.objectStore("world").index("by-project") as any).getAllKeys(projectId);

    // Delete all
    await Promise.all([
      ...chapterKeys.map((k: any) => tx.objectStore("chapters").delete(k)),
      ...charKeys.map((k: any) => tx.objectStore("characters").delete(k)),
      ...worldKeys.map((k: any) => tx.objectStore("world").delete(k)),
    ]);

    await tx.done;
  }
};
