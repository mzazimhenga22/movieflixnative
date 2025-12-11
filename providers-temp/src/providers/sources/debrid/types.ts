// these need to be the names that correspond with Torrentio's
export type debridProviders = 'torbox' | 'real-debrid';

export interface stremioStream {
  name: string;
  title: string;
  infoHash: string;
  fileIdx: number;
  behaviorHints?: {
    bingeGroup: string;
    filename: string;
    videoSize?: number;
    videoHash?: string;
  };
  sources?: string[];
}

export interface torrentioResponse {
  streams: stremioStream[];
  cacheMaxAge: number;
  staleRevalidate: number;
  staleError: number;
}
