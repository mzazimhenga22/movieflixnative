import * as FileSystem from 'expo-file-system/legacy';

export type DownloadHlsResult = {
  playlistPath: string;
  directory: string;
  totalBytes: number;
  segmentCount: number;
};

type DownloadHlsOptions = {
  playlistUrl: string;
  headers?: Record<string, string>;
  rootDir: string;
  sessionName: string;
  onProgress?: (completed: number, total: number) => void;
};

// Helpers
const stripQuotes = (value?: string) => value?.replace(/^"+/, '').replace(/"+$/, '');
const parseAttributeDictionary = (input: string): Record<string, string> => {
  const result: Record<string, string> = {};
  let buffer = '';
  let inQuotes = false;
  const flush = () => {
    if (!buffer) return;
    const [key, value] = buffer.split('=');
    if (key && value) result[key.trim()] = value.trim();
    buffer = '';
  };
  for (const char of input) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === ',' && !inQuotes) flush();
    else buffer += char;
  }
  flush();
  return result;
};
const resolveUrl = (baseUrl: string, relative: string) => {
  try {
    return new URL(relative, baseUrl).toString();
  } catch {
    return relative;
  }
};
const inferExtension = (url: string, fallback: string) => {
  const sanitized = url.split('?')[0].split('#')[0];
  const last = sanitized.split('/').pop() ?? '';
  if (last.includes('.')) {
    const ext = last.split('.').pop();
    if (ext && ext.length <= 5) return ext.toLowerCase();
  }
  return fallback;
};

async function fetchPlaylist(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`Failed to load playlist (${res.status})`);
  return await res.text();
}

const pickBestVariantUrl = (playlistText: string, baseUrl: string) => {
  let bestUrl: string | null = null;
  let bestBandwidth = -1;
  const regex = /#EXT-X-STREAM-INF:([^\n]+)\n([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(playlistText))) {
    const attrs = parseAttributeDictionary(match[1]);
    const uri = match[2]?.trim();
    if (!uri) continue;
    const bw = parseInt(attrs.BANDWIDTH ?? '0', 10);
    if (bw > bestBandwidth) {
      bestBandwidth = bw;
      bestUrl = resolveUrl(baseUrl, uri);
    }
  }
  return bestUrl;
};

async function resolveTerminalPlaylist(url: string, headers?: Record<string, string>) {
  let currentUrl = url;
  let currentText = await fetchPlaylist(url, headers);
  let depth = 0;
  while (currentText.includes('#EXT-X-STREAM-INF')) {
    const nextUrl = pickBestVariantUrl(currentText, currentUrl);
    if (!nextUrl) throw new Error('No playable variant found for this HLS stream.');
    currentUrl = nextUrl;
    currentText = await fetchPlaylist(currentUrl, headers);
    depth += 1;
    if (depth > 6) throw new Error('HLS playlist nests too many levels.');
  }
  return { playlistUrl: currentUrl, playlistText: currentText };
}

export async function downloadHlsPlaylist({
  playlistUrl,
  headers,
  rootDir,
  sessionName,
  onProgress,
}: DownloadHlsOptions): Promise<DownloadHlsResult | null> {
  try {
    const sessionDir = `${rootDir}/${sessionName}`;
    await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });

    const resolved = await resolveTerminalPlaylist(playlistUrl, headers);
    let activePlaylistUrl = resolved.playlistUrl;
    let playlistText = resolved.playlistText;

    if (playlistText.includes('#EXT-X-KEY')) {
      console.warn('[HLS] Encrypted streams not supported yet.');
      return null;
    }

    const lines = playlistText.split('\n');
    const segmentUrls = lines.filter((line) => line.trim() && !line.startsWith('#'));
    if (!segmentUrls.length) {
      console.warn('[HLS] No media segments found.');
      return null;
    }

    let totalBytes = 0;
    let completedSegments = 0;
    const rewrittenLines: string[] = [];

    const downloadBinary = async (sourceUrl: string, destination: string) => {
      try {
        const download = FileSystem.createDownloadResumable(
          sourceUrl,
          destination,
          headers ? { headers } : undefined
        );
        const result = await download.downloadAsync();
if (!result || result.status >= 400) throw new Error('Segment download failed');
        if (result.status >= 400) throw new Error('Segment download failed');
        const info = await FileSystem.getInfoAsync(destination);
        if (info.exists && !info.isDirectory) totalBytes += info.size;
      } catch (err) {
        console.warn(`[HLS] Failed to download ${sourceUrl}:`, (err as Error).message);
      }
    };

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        rewrittenLines.push('');
        continue;
      }

      if (trimmed.startsWith('#EXT-X-MAP')) {
        const attrString = trimmed.split(':')[1] ?? '';
        const attrs = parseAttributeDictionary(attrString);
        const source = attrs.URI ? stripQuotes(attrs.URI) : undefined;
        if (source) {
          const resolvedUrl = resolveUrl(activePlaylistUrl, source);
          const mapName = `init-${Date.now()}-${Math.random().toString(36).slice(2)}.${inferExtension(source, 'mp4')}`;
          const localPath = `${sessionDir}/${mapName}`;
          await downloadBinary(resolvedUrl, localPath);
          attrs.URI = `"${mapName}"`;
          rewrittenLines.push(`#EXT-X-MAP:${Object.entries(attrs).map(([k,v])=>`${k}=${v}`).join(',')}`);
          continue;
        }
      }

      if (trimmed.startsWith('#')) {
        rewrittenLines.push(trimmed);
        continue;
      }

      const resolvedSegment = resolveUrl(activePlaylistUrl, trimmed);
      const ext = inferExtension(trimmed, 'ts');
      const localName = `seg-${String(completedSegments).padStart(5, '0')}.${ext}`;
      const localPath = `${sessionDir}/${localName}`;
      await downloadBinary(resolvedSegment, localPath);
      completedSegments += 1;
      if (onProgress) onProgress(completedSegments, segmentUrls.length);
      rewrittenLines.push(localName);
    }

    const playlistPath = `${sessionDir}/index.m3u8`;
    await FileSystem.writeAsStringAsync(playlistPath, rewrittenLines.join('\n'));

    return { playlistPath, directory: sessionDir, totalBytes, segmentCount: segmentUrls.length };
  } catch (err) {
    console.warn('[HLS] Download failed:', (err as Error).message);
    return null; // safe fallback for VideoPlayer / MovieDetails
  }
}
