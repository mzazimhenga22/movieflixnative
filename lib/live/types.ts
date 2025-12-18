import type { Timestamp } from 'firebase/firestore';

export type LiveStreamStatus = 'draft' | 'live' | 'ended';

export type LiveStream = {
  id: string;
  title: string;
  channelName: string;
  hostId: string;
  hostName?: string | null;
  coverUrl?: string | null;
  status: LiveStreamStatus;
  viewersCount: number;
  createdAt?: Timestamp;
  endedAt?: Timestamp;
  updatedAt?: Timestamp;
  endedBy?: string | null;
  signaling?: any; // WebRTC signaling data
};

export type CreateLiveStreamOptions = {
  hostId: string;
  hostName?: string | null;
  title: string;
  coverUrl?: string | null;
};

export type LiveStreamSession = {
  streamId: string;
  channelName: string;
};
