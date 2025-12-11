import {
  ChannelProfileType,
  ClientRoleType,
  RtcEngine,
  RtcEngineContext,
} from 'react-native-agora';
import { AGORA_APP_ID, assertAgoraConfigured } from '@/constants/agora';

let liveEnginePromise: Promise<RtcEngine> | null = null;

const ensureLiveEngine = async (): Promise<RtcEngine> => {
  if (liveEnginePromise) {
    return liveEnginePromise;
  }

  assertAgoraConfigured();
  liveEnginePromise = RtcEngine.createWithContext(
    new RtcEngineContext(AGORA_APP_ID, {
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    }),
  );
  const engine = await liveEnginePromise;
  await engine.setChannelProfile(
    ChannelProfileType.ChannelProfileLiveBroadcasting,
  );
  await engine.enableVideo();
  await engine.enableAudio();
  return engine;
};

export const getLiveEngine = async (
  role: 'broadcaster' | 'audience' = 'audience',
): Promise<RtcEngine> => {
  const engine = await ensureLiveEngine();
  await engine.setClientRole(
    role === 'broadcaster'
      ? ClientRoleType.ClientRoleBroadcaster
      : ClientRoleType.ClientRoleAudience,
  );
  if (role === 'broadcaster') {
    await engine.enableVideo();
    await engine.startPreview();
  } else {
    await engine.muteLocalVideoStream(true);
  }
  return engine;
};

export const destroyLiveEngine = async (): Promise<void> => {
  if (!liveEnginePromise) return;
  try {
    const engine = await liveEnginePromise;
    await engine.leaveChannel();
    if (typeof (engine as any).release === 'function') {
      await (engine as any).release();
    } else if (typeof RtcEngine.destroy === 'function') {
      await RtcEngine.destroy();
    }
  } catch (err) {
    console.warn('Failed to destroy live Agora engine', err);
  } finally {
    liveEnginePromise = null;
  }
};
