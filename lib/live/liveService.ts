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
import { requestAgoraToken } from '@/lib/calls/tokenService';
import { getAgoraUid } from '@/lib/calls/callService';
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
  return { id: snapshot.id, ...(snapshot.data() as LiveStream) };
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
  const agoraUid = getAgoraUid(options.hostId);
  const { token } = await requestAgoraToken(channelName, agoraUid, 'publisher');

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
  });

  return {
    streamId: docRef.id,
    channelName,
    token,
    agoraUid,
  };
};

export const joinLiveStream = async (
  streamId: string,
  userId: string,
): Promise<{
  stream: LiveStream;
  channelName: string;
  token: string;
  agoraUid: number;
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

  const agoraUid = getAgoraUid(`${streamId}-${userId}`);
  const { token } = await requestAgoraToken(
    stream.channelName,
    agoraUid,
    'audience',
  );

  await updateDoc(streamRef, {
    viewersCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return {
    stream: { id: snapshot.id, ...stream },
    channelName: stream.channelName,
    token,
    agoraUid,
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
