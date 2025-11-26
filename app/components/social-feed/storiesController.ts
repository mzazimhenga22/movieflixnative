import { firestore } from '../../../constants/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const storiesCollection = collection(firestore, 'stories');

export const onStoriesUpdate = (callback: (stories: any[]) => void) => {
  const q = query(storiesCollection);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const stories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(stories);
  });

  return unsubscribe;
};
