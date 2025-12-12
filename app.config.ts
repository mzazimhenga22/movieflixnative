import type { ConfigContext, ExpoConfig } from '@expo/config';
import base from './app.json';

const baseExpoConfig = (base as { expo: ExpoConfig }).expo;

export default ({ config }: ConfigContext): ExpoConfig => {
  const appIdFromEnv = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';
  const tokenEndpointFromEnv = process.env.EXPO_PUBLIC_AGORA_TOKEN_ENDPOINT ?? '';

  // We just reuse whatever plugins are defined in app.json.
  // No Agora config plugin here, since it does not exist on npm.
  const mergedPlugins = [
    ...(baseExpoConfig.plugins ?? []),
    // If in future you add a real Agora config plugin, you can push it here.
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
