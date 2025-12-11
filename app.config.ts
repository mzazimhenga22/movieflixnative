import type { ConfigContext, ExpoConfig } from '@expo/config';
import base from './app.json';

const baseExpoConfig = (base as { expo: ExpoConfig }).expo;

export default ({ config }: ConfigContext): ExpoConfig => {
  const appIdFromEnv = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';
  const tokenEndpointFromEnv = process.env.EXPO_PUBLIC_AGORA_TOKEN_ENDPOINT ?? '';

  const mergedPlugins = [
    ...(baseExpoConfig.plugins ?? []),
    [
      '@config-plugins/react-native-agora',
      {
        appid: appIdFromEnv,
      },
    ],
  ];

  return {
    ...config,
    ...baseExpoConfig,
    plugins: mergedPlugins,
    extra: {
      ...(baseExpoConfig.extra ?? {}),
      ...(config.extra ?? {}),
      agora: {
        appId: appIdFromEnv,
        tokenEndpoint: tokenEndpointFromEnv,
      },
    },
  };
};
