import {
  ClientRoleType,
  ChannelProfileType,
  RtcEngine,
  RtcEngineContext,
} from 'react-native-agora';
import { AGORA_APP_ID, assertAgoraConfigured } from '@/constants/agora';
import type { CallType } from './types';

let enginePromise: Promise<RtcEngine> | null = null;

const ensureEngineInstance = async (): Promise<RtcEngine> => {
  if (enginePromise) {
    return enginePromise;
  }

  assertAgoraConfigured();
  enginePromise = RtcEngine.createWithContext(
    new RtcEngineContext(AGORA_APP_ID, {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    }),
  );
  const engine = await enginePromise;
  await engine.enableAudio();
  await engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
  await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  return engine;
};

export const getAgoraEngine = async (mode: CallType): Promise<RtcEngine> => {
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
    // @ts-expect-error release is not typed in older versions
    if (typeof (engine as any).release === 'function') {
      await (engine as any).release();
    } else if (typeof RtcEngine.destroy === 'function') {
      await RtcEngine.destroy();
    }
  } catch (err) {
    console.warn('Failed to release Agora engine', err);
  } finally {
    enginePromise = null;
  }
};
