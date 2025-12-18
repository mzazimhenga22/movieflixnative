import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/constants/firebase';
import { sendOffer, sendAnswer, sendIceCandidate } from '@/lib/calls/callService';
import type {
  CreateLiveStreamOptions,
  LiveStream,
  LiveStreamSession,
} from './types';

const liveStreamsCollection = collection(firestore, 'liveStreams');

const normalizeStream = (
  snapshot: DocumentSnapshot<DocumentData>,
): LiveStream | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as LiveStream;
  return { ...data, id: snapshot.id };
};

export const listenToLiveStreams = (
  callback: (streams: LiveStream[]) => void,
): Unsubscribe => {
  const q = query(
    liveStreamsCollection,
    where('status', '==', 'live'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const streams = snap.docs
      .map((docSnap) => normalizeStream(docSnap as DocumentSnapshot<DocumentData>))
      .filter((stream): stream is LiveStream => Boolean(stream));
    callback(streams);
  });
};

export const listenToLiveStream = (
  streamId: string,
  callback: (stream: LiveStream | null) => void,
): Unsubscribe => {
  const streamRef = doc(firestore, 'liveStreams', streamId);
  return onSnapshot(streamRef, (snap) => callback(normalizeStream(snap)));
};

export const createLiveStreamSession = async (
  options: CreateLiveStreamOptions,
): Promise<LiveStreamSession> => {
  const channelName = `live-${options.hostId}-${Date.now()}`;

  const docRef = await addDoc(liveStreamsCollection, {
    title: options.title,
    channelName,
    hostId: options.hostId,
    hostName: options.hostName ?? null,
    coverUrl: options.coverUrl ?? null,
    status: 'live',
    viewersCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    signaling: {}, // WebRTC signaling data
  });

  return {
    streamId: docRef.id,
    channelName,
  };
};

export const joinLiveStream = async (
  streamId: string,
  userId: string,
): Promise<{
  stream: LiveStream;
  channelName: string;
}> => {
  const streamRef = doc(firestore, 'liveStreams', streamId);
  const snapshot = await getDoc(streamRef);
  if (!snapshot.exists()) {
    throw new Error('Live stream not found');
  }

  const stream = snapshot.data() as LiveStream;
  if (stream.status !== 'live') {
    throw new Error('Live stream is no longer active');
  }

  await updateDoc(streamRef, {
    viewersCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return {
    stream: { ...stream, id: snapshot.id },
    channelName: stream.channelName,
  };
};

export const leaveLiveStream = async (streamId: string): Promise<void> => {
  const streamRef = doc(firestore, 'liveStreams', streamId);
  const snapshot = await getDoc(streamRef);
  if (!snapshot.exists()) return;
  const current = (snapshot.data() as LiveStream).viewersCount ?? 0;
  await updateDoc(streamRef, {
    viewersCount: Math.max(current - 1, 0),
    updatedAt: serverTimestamp(),
  });
};

export const endLiveStream = async (
  streamId: string,
  endedBy?: string | null,
): Promise<void> => {
  const streamRef = doc(firestore, 'liveStreams', streamId);
  await setDoc(
    streamRef,
    {
      status: 'ended',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      endedBy: endedBy ?? null,
    },
    { merge: true },
  );
};
