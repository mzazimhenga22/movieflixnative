import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
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
import { requestAgoraToken } from './tokenService';
import type { CallSession, CallStatus, CreateCallOptions } from './types';

const callsCollection = collection(firestore, 'calls');
const ACTIVE_STATUSES: CallStatus[] = ['initiated', 'ringing', 'active'];

export type CreateCallResult = {
  callId: string;
  channelName: string;
  token: string;
  agoraUid: number;
};

const normalizeCallSnapshot = (
  snapshot: DocumentSnapshot<DocumentData>,
): CallSession | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Record<string, any>;
  return {
    id: snapshot.id,
    ...(data as CallSession),
  };
};

export const getAgoraUid = (userId: string): number => {
  let hash = 7;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 2147483647;
  }
  const normalized = Math.abs(hash);
  // ensure we never return 0 because Agora reserves it for the SDK
  return (normalized % 2147480000) + 1;
};

export const listenToCall = (
  callId: string,
  callback: (call: CallSession | null) => void,
): Unsubscribe => {
  const callRef = doc(firestore, 'calls', callId);
  return onSnapshot(callRef, (snap) => {
    callback(normalizeCallSnapshot(snap));
  });
};

export const listenToActiveCallsForUser = (
  userId: string,
  callback: (calls: CallSession[]) => void,
): Unsubscribe => {
  const q = query(
    callsCollection,
    where('members', 'array-contains', userId),
    where('status', 'in', ACTIVE_STATUSES),
  );

  return onSnapshot(q, (snapshot) => {
    const calls = snapshot.docs
      .map((docSnap) => normalizeCallSnapshot(docSnap as any))
      .filter((call): call is CallSession => Boolean(call));
    calls.sort((a, b) => {
      const aTime = a.updatedAt?.seconds ?? a.createdAt?.seconds ?? 0;
      const bTime = b.updatedAt?.seconds ?? b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
    callback(calls);
  });
};

export const createCallSession = async (
  options: CreateCallOptions,
): Promise<CreateCallResult> => {
  const channelName = `${options.conversationId}-${Date.now()}`;
  const members = Array.from(new Set(options.members));
  const initiatorAgoraUid = getAgoraUid(options.initiatorId);
  const { token } = await requestAgoraToken(channelName, initiatorAgoraUid);

  const docRef = await addDoc(callsCollection, {
    conversationId: options.conversationId,
    conversationName: options.conversationName ?? null,
    members,
    isGroup: !!options.isGroup,
    channelName,
    type: options.type,
    initiatorId: options.initiatorId,
    initiatorName: options.initiatorName ?? null,
    status: 'initiated' as CallStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tokens: {
      [options.initiatorId]: {
        token,
        agoraUid: initiatorAgoraUid,
        issuedAt: serverTimestamp(),
      },
    },
    participants: {
      [options.initiatorId]: {
        id: options.initiatorId,
        displayName: options.initiatorName ?? null,
        state: 'invited',
        agoraUid: initiatorAgoraUid,
        mutedAudio: false,
        mutedVideo: options.type === 'voice',
      },
    },
  });

  return {
    callId: docRef.id,
    channelName,
    token,
    agoraUid: initiatorAgoraUid,
  };
};

export const joinCallAsParticipant = async (
  callId: string,
  userId: string,
  displayName?: string | null,
): Promise<{ token: string; agoraUid: number; channelName: string }> => {
  const callRef = doc(firestore, 'calls', callId);
  const snapshot = await getDoc(callRef);
  if (!snapshot.exists()) {
    throw new Error('Call session not found');
  }

  const data = snapshot.data() as CallSession;
  const agoraUid = getAgoraUid(userId);
  const { token } = await requestAgoraToken(data.channelName, agoraUid);

  await setDoc(
    callRef,
    {
      status: 'active',
      updatedAt: serverTimestamp(),
      tokens: {
        [userId]: {
          token,
          agoraUid,
          issuedAt: serverTimestamp(),
        },
      },
      participants: {
        [userId]: {
          id: userId,
          displayName: displayName ?? null,
          state: 'joined',
          agoraUid,
          mutedAudio: false,
          mutedVideo: data.type === 'voice',
          joinedAt: serverTimestamp(),
        },
      },
    },
    { merge: true },
  );

  return { token, agoraUid, channelName: data.channelName };
};

export const updateParticipantMuteState = async (
  callId: string,
  userId: string,
  updates: { mutedAudio?: boolean; mutedVideo?: boolean },
): Promise<void> => {
  const callRef = doc(firestore, 'calls', callId);
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof updates.mutedAudio === 'boolean') {
    payload[`participants.${userId}.mutedAudio`] = updates.mutedAudio;
  }
  if (typeof updates.mutedVideo === 'boolean') {
    payload[`participants.${userId}.mutedVideo`] = updates.mutedVideo;
  }
  await updateDoc(callRef, payload);
};

export const markParticipantLeft = async (
  callId: string,
  userId: string,
): Promise<void> => {
  const callRef = doc(firestore, 'calls', callId);
  await updateDoc(callRef, {
    [`participants.${userId}.state`]: 'left',
    [`participants.${userId}.leftAt`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const declineCall = async (
  callId: string,
  userId: string,
  displayName?: string | null,
): Promise<void> => {
  const callRef = doc(firestore, 'calls', callId);
  await setDoc(
    callRef,
    {
      updatedAt: serverTimestamp(),
      participants: {
        [userId]: {
          id: userId,
          displayName: displayName ?? null,
          state: 'declined',
          leftAt: serverTimestamp(),
        },
      },
    },
    { merge: true },
  );
};

export const endCall = async (
  callId: string,
  endedBy: string | null,
  reason: CallStatus = 'ended',
): Promise<void> => {
  const callRef = doc(firestore, 'calls', callId);
  await setDoc(
    callRef,
    {
      status: reason,
      endedBy: endedBy ?? null,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
