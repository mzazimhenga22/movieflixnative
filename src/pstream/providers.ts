// src/pstream/providers.ts
import { makeProviders, makeStandardFetcher, makeSimpleProxyFetcher, targets } from '@p-stream/providers';
import 'react-native-get-random-values'; // sometimes useful for crypto libs

const proxyUrl = process.env.MOVIE_WEB_PROXY_URL || undefined;

const fetcher = makeStandardFetcher(fetch as typeof globalThis.fetch);

const proxiedFetcher = proxyUrl ? makeSimpleProxyFetcher(proxyUrl, fetch as typeof globalThis.fetch) : undefined;

// IMPORTANT: for react-native, set target to NATIVE and consistentIpForRequests true
export const providers = makeProviders({
  fetcher,
  proxiedFetcher,
  target: targets.NATIVE,
  consistentIpForRequests: true,
});

export default providers;
