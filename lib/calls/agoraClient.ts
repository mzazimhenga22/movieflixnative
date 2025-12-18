import {
  ClientRoleType,
  ChannelProfileType,
} from 'react-native-agora';
import RtcEngine from 'react-native-agora';
import type { IRtcEngine } from 'react-native-agora';
import { AGORA_APP_ID, assertAgoraConfigured } from '@/constants/agora';
import type { CallType } from './types';

let enginePromise: Promise<IRtcEngine> | null = null;

const ensureEngineInstance = async (): Promise<IRtcEngine> => {
  if (enginePromise) {
    return enginePromise;
  }

  assertAgoraConfigured();
  const engine = RtcEngine();
  await engine.initialize({
    appId: AGORA_APP_ID,
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
  });
  await engine.enableAudio();
  await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  enginePromise = Promise.resolve(engine);
  return engine;
};

export const getAgoraEngine = async (mode: CallType): Promise<IRtcEngine> => {
  const engine = await ensureEngineInstance();
  if (mode === 'video') {
    await engine.enableVideo();
  } else {
    await engine.disableVideo();
  }
  return engine;
};

export const destroyAgoraEngine = async (): Promise<void> => {
  if (!enginePromise) return;
  try {
    const engine = await enginePromise;
    await engine.leaveChannel();
    if (typeof engine.release === 'function') {
      await engine.release();
    }
  } catch (err) {
    console.warn('Failed to release Agora engine', err);
  } finally {
    enginePromise = null;
  }
};
