import type { Timestamp } from 'firebase/firestore';

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'active'
  | 'ended'
  | 'declined'
  | 'missed';

export type CallParticipantState = 'invited' | 'joined' | 'left' | 'declined';

export type CallParticipant = {
  id: string;
  displayName?: string | null;
  state: CallParticipantState;
  agoraUid?: number;
  mutedAudio?: boolean;
  mutedVideo?: boolean;
  joinedAt?: Timestamp;
  leftAt?: Timestamp;
};

export type CallTokens = Record<
  string,
  {
    token: string;
    agoraUid: number;
    issuedAt?: Timestamp;
  }
>;

export type CallSession = {
  id: string;
  conversationId: string;
  conversationName?: string | null;
  members: string[];
  isGroup: boolean;
  channelName: string;
  type: CallType;
  initiatorId: string;
  initiatorName?: string | null;
  status: CallStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  endedAt?: Timestamp;
  endedBy?: string | null;
  participants?: Record<string, CallParticipant>;
  tokens?: CallTokens;
};

export type CreateCallOptions = {
  conversationId: string;
  members: string[];
  type: CallType;
  initiatorId: string;
  isGroup?: boolean;
  conversationName?: string | null;
  initiatorName?: string | null;
};
