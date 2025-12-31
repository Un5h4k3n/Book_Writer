import { doc, writeBatch, collection } from "firebase/firestore";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db as firestore } from "../firebase";
import type { Project, Character, WorldItem, Chapter } from "../../types";

export const saveProjectToCloud = async (
  project: Project,
  characters: Character[],
  worldItems: WorldItem[],
  chapters: Chapter[],
): Promise<void> => {
  if (!project) return;

  const batch = writeBatch(firestore);
  const projectRef = doc(firestore, "projects", project.id);

  // Save Project Metadata
  batch.set(projectRef, project);

  // Save Characters
  characters.forEach((char) => {
    const ref = doc(collection(projectRef, "characters"), char.id);
    batch.set(ref, char);
  });

  // Save World Items
  worldItems.forEach((item) => {
    const ref = doc(collection(projectRef, "worldItems"), item.id);
    batch.set(ref, item);
  });

  // Save Chapters
  chapters.forEach((chap) => {
    const ref = doc(collection(projectRef, "chapters"), chap.id);
    batch.set(ref, chap);
  });

  await batch.commit();
};

/* -------------------------------------------------------------------------- */
/*                              Granular Updates                              */
/* -------------------------------------------------------------------------- */

// Generic Helper
const saveEntity = async (
  projectId: string,
  collectionName: string,
  entity: any,
) => {
  try {
    const ref = doc(
      firestore,
      "projects",
      projectId,
      collectionName,
      entity.id,
    );
    await import("firebase/firestore").then(({ setDoc }) =>
      setDoc(ref, entity),
    );
  } catch (e) {
    console.error(`Failed to save ${collectionName} to cloud:`, e);
  }
};

const deleteEntity = async (
  projectId: string,
  collectionName: string,
  entityId: string,
) => {
  try {
    const ref = doc(firestore, "projects", projectId, collectionName, entityId);
    await import("firebase/firestore").then(({ deleteDoc }) => deleteDoc(ref));
  } catch (e) {
    console.error(`Failed to delete ${collectionName} from cloud:`, e);
  }
};

export const syncCharacter = (projectId: string, char: Character) =>
  saveEntity(projectId, "characters", char);
export const removeCharacter = (projectId: string, charId: string) =>
  deleteEntity(projectId, "characters", charId);

export const syncWorldItem = (projectId: string, item: WorldItem) =>
  saveEntity(projectId, "worldItems", item);
export const removeWorldItem = (projectId: string, itemId: string) =>
  deleteEntity(projectId, "worldItems", itemId);

export const syncChapter = (projectId: string, chap: Chapter) =>
  saveEntity(projectId, "chapters", chap);
export const removeChapter = (projectId: string, chapId: string) =>
  deleteEntity(projectId, "chapters", chapId);

export const syncProjectMetadata = async (project: Project) => {
  try {
    const ref = doc(firestore, "projects", project.id);
    await import("firebase/firestore").then(({ setDoc }) =>
      setDoc(ref, project),
    );
  } catch (e) {
    console.error("Failed to save project metadata:", e);
  }
};
