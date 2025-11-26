// app/constants/firebase.ts
import { initializeApp, getApps, FirebaseOptions } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase web configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCth56JvRhkDONX76_InHWrhAV7cI3we8I",
  authDomain: "movieflixreactnative.firebaseapp.com",
  projectId: "movieflixreactnative",
  storageBucket: "movieflixreactnative.firebasestorage.app",
  messagingSenderId: "792382812631",
  appId: "1:792382812631:web:e9f54220dc157effb5db92",
  measurementId: "G-EZ2PS3B1S7",
};

// Initialize Firebase app (safe for HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// We'll populate this once initialization completes
let auth: Auth | null = null;

/**
 * Initialize Auth with React Native persistence if available.
 * Exported as a Promise so callers can await readiness.
 */
export const authPromise: Promise<Auth> = (async () => {
  let persistence: any | undefined;

  // 1) Try the main firebase/auth export (some firebase builds expose the helper there)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authPkg = require('firebase/auth') as any;
    if (authPkg && typeof authPkg.getReactNativePersistence === 'function') {
      persistence = authPkg.getReactNativePersistence(ReactNativeAsyncStorage);
    }
  } catch (e) {
    // ignore — we'll try dynamic import next
  }

  // 2) Fallback: dynamic import of the RN-specific entry (avoids bundling a static unresolved import)
  if (!persistence) {
    try {
      // dynamic import prevents Metro from trying to resolve this at static bundle-time
      // @ts-ignore - some builds don't have types for this path
      const rn = await import('firebase/auth/react-native');
      if (rn && typeof rn.getReactNativePersistence === 'function') {
        persistence = rn.getReactNativePersistence(ReactNativeAsyncStorage);
      }
    } catch (e) {
      // if this fails, we continue without RN-specific persistence (still works)
      persistence = undefined;
    }
  }

  const authOptions = persistence ? { persistence } : {};
  auth = initializeAuth(app, authOptions as any);
  return auth;
})();

/**
 * Synchronous getter for auth — will throw if used before `authPromise` resolves.
 * Use this after awaiting authPromise (or in code that runs after app startup).
 */
export function getAuthSync(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth not initialized yet. Await authPromise before calling getAuthSync().');
  }
  return auth;
}

// Other services (these are synchronous)
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Export app as default
export default app;
