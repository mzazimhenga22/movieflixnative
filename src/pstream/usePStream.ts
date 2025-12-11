import { useState, useCallback } from 'react';
import { Buffer } from 'buffer';
import {
  makeProviders,
  makeStandardFetcher,
  targets,
  type ProviderControls,
  type RunOutput,
  type ScrapeMedia,
  type Stream,
  type Qualities,
} from '../../providers-temp/lib/index.js';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

export type PStreamPlayback = {
  uri: string;
  headers?: Record<string, string>;
  stream: Stream;
  sourceId: string;
  embedId?: string;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const fetchLike: FetchLike = (url, init) => fetch(url, init);

const sharedFetcher = makeStandardFetcher(fetchLike as any);

let cachedProviders: ProviderControls | null = null;

function getProviders(): ProviderControls {
  if (!cachedProviders) {
    cachedProviders = makeProviders({
      fetcher: sharedFetcher,
      proxiedFetcher: sharedFetcher,
      target: targets.NATIVE,
      consistentIpForRequests: true,
      proxyStreams: true,
      externalSources: 'all',
    });
  }
  return cachedProviders;
}

const QUALITY_ORDER: Qualities[] = ['4k', '1080', '720', '480', '360', 'unknown'];

function mergeStreamHeaders(stream: Stream): Record<string, string> | undefined {
  const headers = {
    ...(stream.headers ?? {}),
    ...(stream.preferredHeaders ?? {}),
  };
  const keys = Object.keys(headers);
  return keys.length > 0 ? headers : undefined;
}

function pickFileQuality(stream: Stream): string | null {
  if (stream.type !== 'file') return null;
  for (const quality of QUALITY_ORDER) {
    const candidate = stream.qualities?.[quality];
    if (candidate?.url) return candidate.url;
  }
  const fallback = Object.values(stream.qualities ?? {}).find((file) => file?.url);
  return fallback?.url ?? null;
}

function buildPlayback(output: RunOutput): PStreamPlayback {
  const { stream } = output;
  let uri: string | null = null;
  if (stream.type === 'hls') {
    uri = stream.playlist;
  } else {
    uri = pickFileQuality(stream);
  }
  if (!uri) throw new Error('No playable stream returned');
  return {
    uri,
    headers: mergeStreamHeaders(stream),
    stream,
    sourceId: output.sourceId,
    embedId: output.embedId,
  };
}

export function usePStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PStreamPlayback | null>(null);

  const scrape = useCallback(async (media: ScrapeMedia): Promise<PStreamPlayback> => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const providers = getProviders();
      const runResult = await providers.runAll({
        media,
        disableOpensubtitles: true,
      });
      if (!runResult) {
        throw new Error('No providers returned a playable stream.');
      }
      const playable = buildPlayback(runResult);
      setResult(playable);
      return playable;
    } catch (err: any) {
      const message = String(err?.message || err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, scrape };
}

export default usePStream;
