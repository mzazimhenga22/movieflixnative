import { useState, useCallback } from 'react';
import { Buffer } from 'buffer';
import type {
  ProviderControls,
  RunOutput,
  ScrapeMedia,
  Stream,
  Qualities,
} from '../../providers-temp/lib/index.js';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

const bufferProto = (globalThis.Buffer as any)?.prototype ?? (Buffer.prototype as any);
if (bufferProto && !bufferProto.__base64UrlPolyfillApplied) {
  const originalToString = bufferProto.toString;
  bufferProto.toString = function patchedToString(encoding?: string, start?: number, end?: number) {
    if (encoding === 'base64url') {
      const base64 = originalToString.call(this, 'base64', start, end);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return originalToString.call(this, encoding, start, end);
  };
  bufferProto.__base64UrlPolyfillApplied = true;
}

const {
  makeProviders,
  makeStandardFetcher,
  targets,
} = require('../../providers-temp/lib/index.js') as typeof import('../../providers-temp/lib/index.js');

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
      proxyStreams: false,
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

type ScrapeOptions = {
  sourceOrder?: string[];
  debugTag?: string;
};

const createDebugEvents = (tag: string, suffix?: string) => {
  const label = suffix ? `${tag} ${suffix}` : tag;
  return {
    init(evt: any) {
      console.log(`[PStream] ${label} :: init`, evt.sourceIds);
    },
    start(id: string) {
      console.log(`[PStream] ${label} :: start`, id);
    },
    discoverEmbeds(evt: any) {
      console.log(`[PStream] ${label} :: embeds`, evt);
    },
    update(evt: any) {
      if (evt.status === 'failure') {
        console.warn(`[PStream] ${label} :: ${evt.id} failed`, evt.error);
      } else if (evt.status === 'notfound') {
        console.log(`[PStream] ${label} :: ${evt.id} not found`, evt.reason);
      } else if (evt.status === 'success') {
        console.log(`[PStream] ${label} :: ${evt.id} success`);
      }
    },
  };
};

export function usePStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PStreamPlayback | null>(null);

  const scrape = useCallback(async (media: ScrapeMedia, options?: ScrapeOptions): Promise<PStreamPlayback> => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const providers = getProviders();
      const executeRun = async (order?: string[], debugSuffix?: string) =>
        providers.runAll({
          media,
          disableOpensubtitles: true,
          ...(order?.length ? { sourceOrder: order } : {}),
          ...(options?.debugTag ? { events: createDebugEvents(options.debugTag, debugSuffix) } : {}),
        });

      let runResult = await executeRun(options?.sourceOrder, '(preferred)');
      if (!runResult && options?.sourceOrder?.length) {
        console.warn('[PStream] Preferred source order returned nothing. Retrying default order.');
        runResult = await executeRun(undefined, '(default)');
      }
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
