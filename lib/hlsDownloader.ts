import * as FileSystem from 'expo-file-system/legacy';

type DownloadHlsOptions = {
  playlistUrl: string;
  headers?: Record<string, string>;
  rootDir: string;
  sessionName: string;
  onProgress?: (completed: number, total: number) => void;
};

export type DownloadHlsResult = {
  playlistPath: string;
  directory: string;
  totalBytes: number;
  segmentCount: number;
};

const stripQuotes = (value?: string) => {
  if (!value) return value;
  return value.replace(/^"+/, '').replace(/"+$/, '');
};

const parseAttributeDictionary = (input: string): Record<string, string> => {
  const result: Record<string, string> = {};
  let buffer = '';
  let inQuotes = false;
  const flush = () => {
    if (!buffer) return;
    const [key, value] = buffer.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
    buffer = '';
  };
  for (const char of input) {
    if (char === '"') {
      inQuotes = !inQuotes;
    }
    if (char === ',' && !inQuotes) {
      flush();
    } else {
      buffer += char;
    }
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
    if (ext && ext.length <= 5) {
      return ext.toLowerCase();
    }
  }
  return fallback;
};

async function fetchPlaylist(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, headers ? { headers } : undefined);
  if (!res.ok) {
    throw new Error(`Failed to load playlist (${res.status})`);
  }
  return await res.text();
}

const pickBestVariantUrl = (playlistText: string, baseUrl: string) => {
  let bestVariantUrl: string | null = null;
  let bestBandwidth = -1;
  const variantRegex = /#EXT-X-STREAM-INF:([^\n]+)\n([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = variantRegex.exec(playlistText))) {
    const attrs = parseAttributeDictionary(match[1]);
    const uri = match[2]?.trim();
    if (!uri) continue;
    const bandwidth = parseInt(attrs.BANDWIDTH ?? '0', 10);
    if (bandwidth > bestBandwidth) {
      bestBandwidth = bandwidth;
      bestVariantUrl = resolveUrl(baseUrl, uri);
    }
  }
  return bestVariantUrl;
};

async function resolveTerminalPlaylist(url: string, headers?: Record<string, string>) {
  let currentUrl = url;
  let currentText = await fetchPlaylist(url, headers);
  let depth = 0;
  while (currentText.includes('#EXT-X-STREAM-INF')) {
    const nextUrl = pickBestVariantUrl(currentText, currentUrl);
    if (!nextUrl) {
      throw new Error('No playable variant found for this HLS stream.');
    }
    currentUrl = nextUrl;
    currentText = await fetchPlaylist(currentUrl, headers);
    depth += 1;
    if (depth > 6) {
      throw new Error('This HLS playlist nests too many levels.');
    }
  }
  return { playlistUrl: currentUrl, playlistText: currentText };
}

export async function downloadHlsPlaylist({
  playlistUrl,
  headers,
  rootDir,
  sessionName,
  onProgress,
}: DownloadHlsOptions): Promise<DownloadHlsResult> {
  const sessionDir = `${rootDir}/${sessionName}`;
  await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });

  const resolved = await resolveTerminalPlaylist(playlistUrl, headers);
  let activePlaylistUrl = resolved.playlistUrl;
  let playlistText = resolved.playlistText;

  if (playlistText.includes('#EXT-X-KEY')) {
    throw new Error('Encrypted HLS streams are not supported yet.');
  }

  const lines = playlistText.split('\n');
  const segmentUrls = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (!segmentUrls.length) {
    throw new Error('No media segments were found in this HLS playlist.');
  }

  let totalBytes = 0;
  let completedSegments = 0;
  const rewrittenLines: string[] = [];

  const downloadBinary = async (sourceUrl: string, destination: string) => {
    const download = FileSystem.createDownloadResumable(
      sourceUrl,
      destination,
      headers ? { headers } : undefined,
    );
    const result = await download.downloadAsync();
    if (!result || result.status >= 400) {
      throw new Error('Failed to download HLS segment.');
    }
    const info = await FileSystem.getInfoAsync(destination);
    totalBytes += info.size ?? 0;
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
        const resolved = resolveUrl(activePlaylistUrl, source);
        const mapName = `init-${Date.now()}-${Math.random().toString(36).slice(2)}.${inferExtension(source, 'mp4')}`;
        const localPath = `${sessionDir}/${mapName}`;
        await downloadBinary(resolved, localPath);
        attrs.URI = `"${mapName}"`;
        const rebuilt = Object.entries(attrs)
          .map(([key, value]) => `${key}=${value}`)
          .join(',');
        rewrittenLines.push(`#EXT-X-MAP:${rebuilt}`);
        continue;
      }
      rewrittenLines.push(trimmed);
      continue;
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
    if (onProgress) {
      onProgress(completedSegments, segmentUrls.length);
    }
    rewrittenLines.push(localName);
  }

  const playlistPath = `${sessionDir}/index.m3u8`;
  await FileSystem.writeAsStringAsync(playlistPath, rewrittenLines.join('\n'));

  return {
    playlistPath,
    directory: sessionDir,
    totalBytes,
    segmentCount: segmentUrls.length,
  };
}
