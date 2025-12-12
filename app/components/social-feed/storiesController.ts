import { firestore } from '../../../constants/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';

const storiesCollection = collection(firestore, 'stories');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let prunePromise: Promise<void> | null = null;
let lastPrune = 0;

const pruneExpiredStories = async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - ONE_DAY_MS);
  try {
    const expiredQuery = query(storiesCollection, where('createdAt', '<', cutoff));
    const snapshots = await getDocs(expiredQuery);
    await Promise.all(
      snapshots.docs.map((docSnap) => deleteDoc(doc(firestore, 'stories', docSnap.id)))
    );
  } catch (err) {
    console.warn('[storiesController] failed to prune expired stories', err);
  } finally {
    prunePromise = null;
    lastPrune = Date.now();
  }
};

const ensurePruneScheduled = () => {
  if (prunePromise) return;
  if (Date.now() - lastPrune < 5 * 60 * 1000) return;
  prunePromise = pruneExpiredStories();
};

export const onStoriesUpdate = (callback: (stories: any[]) => void) => {
  const cutoff = Timestamp.fromMillis(Date.now() - ONE_DAY_MS);
  const q = query(storiesCollection, where('createdAt', '>=', cutoff));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const stories = snapshot.docs
      .map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }))
      .sort((a, b) => {
        const aTime = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return aTime - bTime;
      });
    callback(stories);
    ensurePruneScheduled();
  });

  ensurePruneScheduled();
  return unsubscribe;
};

// dummy default export for expo-router route scanning
export default {};
