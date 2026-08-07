import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseConfig, Person, UserAuditInfo, UserProfile, WeightEntry } from '../types';
import {
  getStoredFirebaseConfig,
  setStoredFirebaseConfig,
  getStoredFamilyCode,
  setStoredFamilyCode
} from './storage';

// Subcollection names. `weight_members` rather than a bare `members`, because
// households/{code} is a namespace shared with CarTracker, HomeTracker and
// ExpenseTracker — and `members` is already a field on metadata/info.
const PEOPLE_COLLECTION = 'weight_members';
const WEIGHTS_COLLECTION = 'weights';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

const envConfig: FirebaseConfig | null = import.meta.env.VITE_FIREBASE_API_KEY ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
} : null;

export const initializeFirebaseService = (customConfig?: FirebaseConfig): boolean => {
  const config = customConfig || getStoredFirebaseConfig() || envConfig;
  if (!config || !config.apiKey || !config.projectId) {
    console.log('[Firebase] Running in Local Demo Mode');
    return false;
  }

  try {
    app = getApps().length ? getApp() : initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
    if (customConfig) {
      setStoredFirebaseConfig(customConfig);
    }
    console.log('[Firebase] Initialized for project:', config.projectId);
    return true;
  } catch (err) {
    console.warn('[Firebase] Initialization failed:', err);
    return false;
  }
};

export const isFirebaseConfigured = (): boolean => db !== null && auth !== null;

export const subscribeAuth = (callback: (user: UserProfile | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Household Member',
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous
      });
    } else {
      callback(null);
    }
  });
};

export const loginWithGoogle = async (): Promise<UserProfile | null> => {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  setStoredFamilyCode('');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const res = await signInWithPopup(auth, provider);
  return {
    uid: res.user.uid,
    email: res.user.email,
    displayName: res.user.displayName,
    photoURL: res.user.photoURL
  };
};

export const logoutFirebase = async (): Promise<void> => {
  setStoredFamilyCode('');
  if (auth) {
    await firebaseSignOut(auth);
  }
};

// Personal scope by default; a household code switches every read and write
// to the shared households/{code} scope that the other family apps use.
const getStorageTarget = (userId: string, familyCode?: string) => {
  const code = (familyCode || getStoredFamilyCode() || '').trim().toUpperCase();
  if (code) {
    return { root: 'households', id: code };
  }
  return { root: 'users', id: userId };
};

const handleSyncError = (label: string, error: any) => {
  console.error(`[Firestore] ${label} sync error:`, error);
  if (error?.code === 'permission-denied') {
    console.warn('[Firestore] Permission denied. Clearing invalid household code.');
    setStoredFamilyCode('');
  }
};

// ==========================================
// People (weight_members)
// ==========================================

export const subscribeFirestorePeople = (
  userId: string,
  familyCode: string | undefined,
  callback: (people: Person[]) => void
) => {
  if (!db) return () => {};
  const target = getStorageTarget(userId, familyCode);
  // No orderBy: sortOrder is applied in memory so a doc missing the field
  // cannot silently drop out of the snapshot.
  const q = collection(db, target.root, target.id, PEOPLE_COLLECTION);
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Person)));
  }, (error) => handleSyncError('People', error));
};

export const saveFirestorePerson = async (
  userId: string,
  person: Person,
  familyCode?: string
): Promise<void> => {
  if (!db) return;
  try {
    const target = getStorageTarget(userId, familyCode);
    const clean = JSON.parse(JSON.stringify(person)); // Firestore rejects undefined
    await setDoc(doc(db, target.root, target.id, PEOPLE_COLLECTION, person.id), clean, { merge: true });
    console.log(`[Firestore] Person saved to ${target.root}/${target.id}:`, person.id);
  } catch (err) {
    console.error('[Firestore] Error saving person:', err);
  }
};

export const deleteFirestorePerson = async (
  userId: string,
  personId: string,
  familyCode?: string
): Promise<void> => {
  if (!db) return;
  try {
    const target = getStorageTarget(userId, familyCode);
    await deleteDoc(doc(db, target.root, target.id, PEOPLE_COLLECTION, personId));
  } catch (err) {
    console.error('[Firestore] Error deleting person:', err);
  }
};

// ==========================================
// Weigh-ins
// ==========================================

export const subscribeFirestoreWeights = (
  userId: string,
  familyCode: string | undefined,
  callback: (entries: WeightEntry[]) => void
) => {
  if (!db) return () => {};
  const target = getStorageTarget(userId, familyCode);
  // Single-field orderBy only — adding a where('personId', ...) here would
  // require a composite index. Per-person filtering happens in memory.
  const q = query(collection(db, target.root, target.id, WEIGHTS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as WeightEntry)));
  }, (error) => handleSyncError('Weights', error));
};

export const saveFirestoreWeight = async (
  userId: string,
  entry: WeightEntry,
  familyCode?: string
): Promise<void> => {
  if (!db) return;
  try {
    const target = getStorageTarget(userId, familyCode);
    const clean = JSON.parse(JSON.stringify(entry));
    await setDoc(doc(db, target.root, target.id, WEIGHTS_COLLECTION, entry.id), clean, { merge: true });
    console.log(`[Firestore] Weigh-in saved to ${target.root}/${target.id}:`, entry.id);
  } catch (err) {
    console.error('[Firestore] Error saving weigh-in:', err);
  }
};

export const deleteFirestoreWeight = async (
  userId: string,
  entryId: string,
  familyCode?: string
): Promise<void> => {
  if (!db) return;
  try {
    const target = getStorageTarget(userId, familyCode);
    await deleteDoc(doc(db, target.root, target.id, WEIGHTS_COLLECTION, entryId));
  } catch (err) {
    console.error('[Firestore] Error deleting weigh-in:', err);
  }
};

// ==========================================
// Household membership
// ==========================================

export const verifyOrCreateHousehold = async (
  familyCode: string,
  userProfile: UserProfile
): Promise<{ success: boolean; message: string; isNew?: boolean }> => {
  if (!db) return { success: true, message: 'Offline mode active.' };

  const code = familyCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Please enter a Household Code.' };

  try {
    const metaRef = doc(db, 'households', code, 'metadata', 'info');
    const docSnap = await getDoc(metaRef);

    const auditUser: UserAuditInfo = {
      uid: userProfile.uid,
      displayName: userProfile.displayName || 'Household Member',
      email: userProfile.email || undefined
    };

    if (docSnap.exists()) {
      // Both shapes are maintained: members[] for display, memberUids{} because
      // the security rule does `request.auth.uid in ...data.memberUids`.
      const data = docSnap.data();
      const members: UserAuditInfo[] = data.members || [];
      const memberUids: Record<string, boolean> = data.memberUids || {};

      if (!members.some(m => m.uid === userProfile.uid) || !memberUids[userProfile.uid]) {
        if (!members.some(m => m.uid === userProfile.uid)) {
          members.push(auditUser);
        }
        memberUids[userProfile.uid] = true;
        await setDoc(metaRef, { members, memberUids }, { merge: true });
      }

      return { success: true, isNew: false, message: `✅ Joined household ${code}.` };
    }

    const newHousehold = {
      code,
      createdBy: auditUser,
      createdAt: new Date().toISOString(),
      members: [auditUser],
      memberUids: { [userProfile.uid]: true }
    };
    await setDoc(metaRef, newHousehold);
    return { success: true, isNew: true, message: `🎉 Created new household ${code}.` };
  } catch (err: any) {
    console.error('[Firestore] Error verifying household:', err);
    if (err.code === 'permission-denied' || err.message?.includes('insufficient permissions')) {
      return {
        success: false,
        message: '❌ Creating new household codes is restricted to administrators. Ask your admin for an existing code.'
      };
    }
    return { success: false, message: err.message || 'Error joining household code.' };
  }
};

export const subscribeHouseholdMembers = (
  familyCode: string,
  callback: (members: UserAuditInfo[]) => void
) => {
  if (!db || !familyCode) {
    callback([]);
    return () => {};
  }
  const metaRef = doc(db, 'households', familyCode.trim().toUpperCase(), 'metadata', 'info');
  return onSnapshot(metaRef, (snap) => {
    callback(snap.exists() ? (snap.data().members || []) : []);
  }, (error) => {
    console.error('[Firestore] Household members sync error:', error);
    callback([]);
  });
};
