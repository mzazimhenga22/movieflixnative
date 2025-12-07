import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

// Temporary Expo Go-friendly stub.
// Native p-stream providers rely on custom native modules that Expo Go does not ship with.
// We simply return a sample video URL so the rest of the UI keeps working.

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

  const scrape = useCallback(async (_media: ScrapeMedia) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult('http://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4');
      Alert.alert(
        'Streaming disabled',
        'Using sample video while native p-stream is disabled for Expo Go.'
      );
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, scrape };
}

export default usePStream;
