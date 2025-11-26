/* app/messaging/messagesController.tsx */
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { firestore, authPromise } from '../../constants/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDatabase, ref, onValue, set, onDisconnect } from "firebase/database";

// ---- Types ----
export type Conversation = {
  id: string;
  lastMessage?: string;
  updatedAt?: any;
  [key: string]: any;
};

export type Message = {
  id: string;
  text?: string;
  createdAt?: any;
  from?: string;
  [key: string]: any;
};

export type Profile = {
  id: string;
  displayName: string;
  photoURL: string;
  status?: string;
};

type AuthCallback = (user: User | null) => void;
type UnsubscribeFn = () => void;

/**
 * Internal helper: wait for auth to be ready and return it.
 * Always safe to call (will await initialization).
 */
async function getAuth(): Promise<import('firebase/auth').Auth> {
  return await authPromise;
}

// --- Authentication ---
export const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const auth = await getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[messagesController] signUpWithEmail success', userCredential.user.uid);
    return userCredential.user as User;
  } catch (error: any) {
    console.error('[messagesController] signUpWithEmail error:', error?.message ?? error);
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const auth = await getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[messagesController] signInWithEmail success', userCredential.user.uid);
    return userCredential.user as User;
  } catch (error: any) {
    console.error('[messagesController] signInWithEmail error:', error?.message ?? error);
    return null;
  }
};

/**
 * onAuthChange: returns a safe unsubscribe function immediately.
 * If auth isn't ready yet, this attaches the listener once initialization completes.
 */
export const onAuthChange = (callback: AuthCallback): UnsubscribeFn => {
  let unsub: UnsubscribeFn = () => {};
  let calledCallbackNull = false;

  // schedule a fallback to avoid UI stuck waiting — will be overridden by real onAuthStateChanged when ready
  const fallbackTimer = setTimeout(() => {
    if (!calledCallbackNull) {
      calledCallbackNull = true;
      callback(null);
    }
  }, 200);

  // attach when auth initializes
  void authPromise
    .then((auth) => {
      clearTimeout(fallbackTimer);
      // ensure we haven't already invoked callback(null) as final state
      const firebaseUnsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in.
          updateUserStatus(user.uid, 'online');

          // Set up presence management
          const db = getDatabase();
          const userStatusDatabaseRef = ref(db, '/status/' + user.uid);
          const isOfflineForDatabase = {
            state: 'offline',
            last_changed: serverTimestamp(),
          };
          const isOnlineForDatabase = {
            state: 'online',
            last_changed: serverTimestamp(),
          };

          onValue(ref(db, '.info/connected'), (snapshot) => {
            if (snapshot.val() === false) {
              // Instead of simply returning, we'll persist the offline status
              onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                  updateUserStatus(user.uid, 'offline');
              });
              return;
            }

            onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
              set(userStatusDatabaseRef, isOnlineForDatabase);
              updateUserStatus(user.uid, 'online');
            });
          });
        } else {
          // User is signed out.
          const lastUser = auth.currentUser;
          if (lastUser) {
            updateUserStatus(lastUser.uid, 'offline');
          }
        }
        callback(user);
      });
      unsub = () => {
        try {
          (firebaseUnsub as unknown as () => void)();
        } catch (e) {
          // noop
        }
      };
    })
    .catch((err) => {
      clearTimeout(fallbackTimer);
      console.warn('[messagesController] onAuthChange: auth init failed', err);
      // leave unsub as noop
    });

  return () => unsub();
};

// --- Firestore subscriptions (unchanged behavior but typed & logged) ---
export const onConversationUpdate = (conversationId: string, callback: (conv: Conversation) => void): UnsubscribeFn => {
  const docRef = doc(firestore, 'conversations', conversationId);
  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...(snap.data() as Record<string, any>) } as Conversation);
    } else {
      callback({ id: snap.id } as Conversation);
    }
  }, (err) => {
    console.error('[messagesController] onConversationUpdate snapshot error:', err);
  });
  return () => unsubscribe();
};

export const onConversationsUpdate = (callback: (conversations: Conversation[]) => void): UnsubscribeFn => {
  const q = query(collection(firestore, 'conversations'), orderBy('updatedAt', 'desc'));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const conversations: Conversation[] = [];
    querySnapshot.forEach((docSnap) => {
      conversations.push({ id: docSnap.id, ...(docSnap.data() as Record<string, any>) } as Conversation);
    });
    callback(conversations);
  }, (err) => {
    console.error('[messagesController] onConversationsUpdate snapshot error:', err);
  });
  return () => unsubscribe();
};

export const onMessagesUpdate = (conversationId: string, callback: (messages: Message[]) => void): UnsubscribeFn => {
  const messagesColRef = collection(firestore, 'conversations', conversationId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...(docSnap.data() as Record<string, any>) } as Message);
    });
    callback(messages);
  }, (err) => {
    console.error('[messagesController] onMessagesUpdate snapshot error:', err);
  });

  return () => unsubscribe();
};

export const onUserProfileUpdate = (userId: string, callback: (profile: Profile) => void): UnsubscribeFn => {
    const docRef = doc(firestore, 'users', userId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() } as Profile);
        }
    });
    return () => unsubscribe();
};

export const sendMessage = async (conversationId: string, message: Partial<Message>): Promise<void> => {
  const auth = await getAuth();
  if (!auth?.currentUser) return;

  const messagesColRef = collection(firestore, 'conversations', conversationId, 'messages');
  await addDoc(messagesColRef, {
    ...message,
    createdAt: serverTimestamp(),
  });

  const conversationDocRef = doc(firestore, 'conversations', conversationId);
  await setDoc(conversationDocRef, {
    lastMessage: (message as any).text ?? '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const getFollowing = async (): Promise<Profile[]> => {
  const auth = await getAuth();
  if (!auth?.currentUser) return [];

  const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  const followingIds = userDoc.data()?.following || [];

  if (followingIds.length === 0) return [];

  const usersRef = collection(firestore, 'users');
  const q = query(usersRef, where('__name__', 'in', followingIds));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Profile));
};

export const getSuggestedPeople = async (): Promise<Profile[]> => {
  return await getFollowing();
};

export const updateConversationStatus = async (conversationId: string, status: string): Promise<void> => {
  const conversationDocRef = doc(firestore, 'conversations', conversationId);
  await setDoc(conversationDocRef, {
    status: status,
  }, { merge: true });
};

export const findOrCreateConversation = async (otherUser: Profile): Promise<string> => {
  const auth = await getAuth();
  if (!auth?.currentUser) throw new Error('User not authenticated');

  const conversationsRef = collection(firestore, 'conversations');
  const q = query(
    conversationsRef,
    where('members', 'array-contains', auth.currentUser.uid),
    limit(30) // Adjust limit as needed
  );

  const querySnapshot = await getDocs(q);
  let conversationId: string | null = null;

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.members.includes(otherUser.id)) {
      conversationId = docSnap.id;
    }
  });

  if (conversationId) return conversationId;

  const otherUserDocRef = doc(firestore, 'users', otherUser.id);
  const otherUserDoc = await getDoc(otherUserDocRef);
  const otherUserFollowing = otherUserDoc.data()?.following || [];
  const isFollowingBack = otherUserFollowing.includes(auth.currentUser.uid);

  const currentUserDocRef = doc(firestore, 'users', auth.currentUser.uid);
  const currentUserDoc = await getDoc(currentUserDocRef);
  const currentUserFollowing = currentUserDoc.data()?.following || [];
  const isFollowing = currentUserFollowing.includes(otherUser.id);

  const initialStatus = isFollowing && isFollowingBack ? 'active' : 'pending';

  const newConversation = await addDoc(conversationsRef, {
    members: [auth.currentUser.uid, otherUser.id],
    updatedAt: serverTimestamp(),
    lastMessage: '',
    status: initialStatus,
  });

  return newConversation.id;
};

export const updateUserStatus = async (userId: string, status: string): Promise<void> => {
    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, {
        status: status,
        lastSeen: serverTimestamp(),
    }, { merge: true });
};

export const findUserByUsername = async (username: string): Promise<Profile | null> => {
  const usersRef = collection(firestore, 'users');
  const q = query(usersRef, where('displayName', '==', username), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const userDoc = querySnapshot.docs[0];
  return { ...userDoc.data(), id: userDoc.id } as Profile;
};

export default {};
