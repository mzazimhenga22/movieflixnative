import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { makeProviders, makeStandardFetcher, targets, NotFoundError } from '@p-stream/providers';

// Polyfill base64 + crypto polyfill instructions
import '@react-native-anywhere/polyfill-base64';
// IMPORTANT: follow react-native-quick-crypto docs to initialize crypto. Example (uncomment if you installed it):
// const rnCrypto = require('react-native-quick-crypto');
// // set global crypto for libs that expect it
// if (!globalThis.crypto) globalThis.crypto = rnCrypto;

// ---------- Providers singleton ----------
let providersInstance: ReturnType<typeof makeProviders> | null = null;
function getProviders() {
  if (providersInstance) return providersInstance;

  providersInstance = makeProviders({
    fetcher: makeStandardFetcher(fetch),
    // proxiedFetcher: undefined, // not needed for native target
    target: targets.NATIVE,
    // If your app will request streams from the same IP as playback device, set true
    consistentIpForRequests: true,
  });

  return providersInstance;
}

// ---------- Types ----------
type ScrapeMedia = {
  type: 'movie' | 'show';
  title?: string;
  tmdbId: string;
  releaseYear?: number | string;
  season?: number;
  episode?: number;
};

export function usePStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const scrape = useCallback(async (media: ScrapeMedia) => {
    const providers = getProviders();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const scrapeResult = await providers.runAll({ media });
      if (!scrapeResult) {
        Alert.alert('Not found', 'No stream could be found for this media');
        setResult(null);
      } else {
        // If the runAll returned a stream object, use it; else log embeds
        if (scrapeResult.stream) {
          // scrapeResult.stream is a Stream object — may be hls or file
          // For HLS: use stream.playlist
          if (scrapeResult.stream.type === 'hls') {
            setResult(scrapeResult.stream.playlist);
          } else if (scrapeResult.stream.type === 'file') {
            // file -> qualities map
            const qualities = (scrapeResult.stream as any).qualities || {};
            const keys = Object.keys(qualities);
            if (keys.length) setResult(qualities[keys[0]].url);
          }
        }
      }
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        Alert.alert('Not found', 'Source reported not found');
      } else {
        console.error('Scrape error', err);
        setError(String(err?.message || err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, scrape };
}
