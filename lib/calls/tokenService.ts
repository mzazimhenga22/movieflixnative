import {
  AGORA_APP_CERTIFICATE,
  AGORA_APP_ID,
  AGORA_TOKEN_DURATION_SECONDS,
  AGORA_TOKEN_ENDPOINT,
  assertAgoraConfigured,
} from '@/constants/agora';

type TokenResponse = {
  token: string;
  expireAt?: number;
};

type RemoteTokenPayload = {
  channelName: string;
  uid: number;
  role: 'publisher' | 'audience';
  ttl?: number;
};

const fetchTokenFromEndpoint = async (
  payload: RemoteTokenPayload,
): Promise<TokenResponse | null> => {
  if (!AGORA_TOKEN_ENDPOINT) return null;

  try {
    const res = await fetch(AGORA_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('Agora token endpoint returned HTTP', res.status);
      return null;
    }

    const data = (await res.json()) as TokenResponse;
    if (!data?.token) {
      console.warn('Agora token endpoint response missing token');
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Failed to fetch Agora token from endpoint', err);
    return null;
  }
};

export const requestAgoraToken = async (
  channelName: string,
  uid: number,
  role: 'publisher' | 'audience' = 'publisher',
  ttlSeconds = AGORA_TOKEN_DURATION_SECONDS,
): Promise<TokenResponse> => {
  assertAgoraConfigured();
  const remote = await fetchTokenFromEndpoint({
    channelName,
    uid,
    role,
    ttl: ttlSeconds,
  });

  if (remote) {
    return remote;
  }

  throw new Error(
    'Unable to create Agora token. Provide EXPO_PUBLIC_AGORA_TOKEN_ENDPOINT and AGORA_APP_CERTIFICATE.',
  );
};
