import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDnTfoMthllbf12Jp5qz7Y7G9Gc_BxCFQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jomakhoroch-60203.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jomakhoroch-60203",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jomakhoroch-60203.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "445316898742",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:445316898742:web:68d90479fbbcf4ec87eb17",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
