import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Optional: each installation must supply its own Firebase project.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const db = Object.values(firebaseConfig).every(Boolean)
  ? getFirestore(initializeApp(firebaseConfig))
  : null;
