import Constants from 'expo-constants';

type AgoraExtra = {
  appId?: string;
  tokenEndpoint?: string;
};

const extra = (Constants?.expoConfig?.extra ?? {}) as { agora?: AgoraExtra };
const agoraExtra = extra.agora ?? {};

export const AGORA_APP_ID =
  process.env.EXPO_PUBLIC_AGORA_APP_ID ?? agoraExtra.appId ?? '';

export const AGORA_TOKEN_ENDPOINT =
  process.env.EXPO_PUBLIC_AGORA_TOKEN_ENDPOINT ?? agoraExtra.tokenEndpoint ?? '';

export const AGORA_APP_CERTIFICATE =
  process.env.AGORA_APP_CERTIFICATE ??
  process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE ??
  '';

export const AGORA_TOKEN_DURATION_SECONDS = Number(
  process.env.EXPO_PUBLIC_AGORA_TOKEN_DURATION ?? 3600,
);

export const assertAgoraConfigured = () => {
  if (!AGORA_APP_ID) {
    throw new Error(
      'Missing Agora App ID. Set EXPO_PUBLIC_AGORA_APP_ID or configure extra.agora.appId.',
    );
  }
};
