'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// --- Singleton Initialization ---
// This pattern, executed at the module's top level, ensures that Firebase is
// initialized only once per application lifecycle.
const firebaseApp: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Get Auth and Firestore services from the initialized app
const auth: Auth = getAuth(firebaseApp);
const firestore: Firestore = getFirestore(firebaseApp);

// --- Exports for the rest of the app ---
// Export the initialized services as singletons for direct import elsewhere
export { firebaseApp, auth, firestore };

// Re-export the hooks and providers that will use these services via context
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
