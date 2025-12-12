import React from 'react';
import { StyleSheet, View, ScrollView, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Media, CastMember, DownloadItem } from '../../types';
import MovieHeader from './MovieHeader';
import MovieInfo from './MovieInfo';
import TrailerList from './TrailerList';
import RelatedMovies from './RelatedMovies';
import EpisodeList from './EpisodeList';
import CastList from './CastList';
import { useRouter } from 'expo-router';
import { getProfileScopedKey } from '../../lib/profileStorage';
import { usePStream } from '../../src/pstream/usePStream';
import { downloadHlsPlaylist } from '../../lib/hlsDownloader';
import { emitDownloadEvent } from '../../lib/downloadEvents';

interface VideoType {
  key: string;
  name: string;
}

interface Props {
  movie: Media | null;
  trailers: VideoType[];
  relatedMovies: Media[];
  isLoading: boolean;
  onWatchTrailer: (key?: string) => void;
  onBack: () => void;
  onSelectRelated: (id: number) => void;
  onAddToMyList: (movie: Media) => void;
  seasons: any[];
  mediaType?: string | string[] | undefined;
  cast: CastMember[];
}

const MovieDetailsView: React.FC<Props> = ({
  movie,
  trailers,
  relatedMovies,
  isLoading,
  onWatchTrailer,
  onBack,
  onSelectRelated,
  onAddToMyList,
  seasons,
  mediaType,
  cast,
}) => {
  const router = useRouter();
  const normalizedMediaType: 'movie' | 'tv' =
    typeof mediaType === 'string' && mediaType === 'tv' ? 'tv' : 'movie';
  const [isLaunchingPlayer, setIsLaunchingPlayer] = React.useState(false);
  const { scrape: scrapeDownload } = usePStream();
  const [downloadState, setDownloadState] = React.useState<'idle' | 'preparing' | 'downloading'>('idle');
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const isMountedRef = React.useRef(true);
  const downloadResumableRef = React.useRef<FileSystem.DownloadResumable | null>(null);
  const contentHint = React.useMemo(() => determineContentHint(movie), [movie]);
  const releaseDateValue = React.useMemo(() => {
    if (!movie) return undefined;
    return movie.release_date || movie.first_air_date || undefined;
  }, [movie]);
  const runtimeMinutes = React.useMemo(() => {
    if (!movie) return undefined;
    const directRuntime = (movie as any)?.runtime;
    if (typeof directRuntime === 'number' && directRuntime > 0) {
      return directRuntime;
    }
    const episodeRunTimes = (movie as any)?.episode_run_time;
    if (Array.isArray(episodeRunTimes) && episodeRunTimes.length > 0) {
      const candidate = episodeRunTimes.find((value: any) => typeof value === 'number' && value > 0);
      if (typeof candidate === 'number') {
        return candidate;
      }
    }
    return undefined;
  }, [movie]);
  const derivedGenreIds = React.useMemo(() => {
    if (!movie) return [];
    if (Array.isArray(movie.genre_ids) && movie.genre_ids.length > 0) {
      return movie.genre_ids as number[];
    }
    const genresArray = Array.isArray((movie as any)?.genres) ? (movie as any).genres : [];
    return genresArray
      .map((g: any) => (typeof g?.id === 'number' ? g.id : null))
      .filter((id: number | null): id is number => typeof id === 'number');
  }, [movie]);

  const ensureDownloadDir = React.useCallback(async () => {
    if (!FileSystem.documentDirectory) {
      throw new Error('Storage directory is unavailable on this device.');
    }
    const target = `${FileSystem.documentDirectory}downloads`;
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(target, { intermediates: true });
    }
    return target;
  }, []);

  const guessFileExtension = React.useCallback((uri: string) => {
    const sanitized = uri.split('?')[0].split('#')[0];
    const lastSegment = sanitized.split('/').pop() ?? '';
    if (lastSegment.includes('.')) {
      const ext = lastSegment.split('.').pop();
      if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) {
        return ext.toLowerCase();
      }
    }
    return 'mp4';
  }, []);

  const persistDownloadRecord = React.useCallback(async (record: Omit<DownloadItem, 'id'>) => {
    const key = await getProfileScopedKey('downloads');
    let existing: DownloadItem[] = [];
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        existing = JSON.parse(stored) as DownloadItem[];
      }
    } catch (err) {
      console.warn('Failed to parse downloads cache', err);
    }
    const entry: DownloadItem = {
      id: `${record.mediaId ?? 'download'}-${Date.now()}`,
      ...record,
    };
    try {
      await AsyncStorage.setItem(key, JSON.stringify([entry, ...existing]));
    } catch (err) {
      console.error('Failed to persist downloads list', err);
      throw err;
    }
    return entry;
  }, []);
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setDownloadStateSafe = React.useCallback((nextState: 'idle' | 'preparing' | 'downloading') => {
    if (isMountedRef.current) {
      setDownloadState(nextState);
    }
  }, []);

  const setDownloadProgressSafe = React.useCallback((nextProgress: number) => {
    if (isMountedRef.current) {
      setDownloadProgress(nextProgress);
    }
  }, []);

  const buildUpcomingEpisodesPayload = () => {
    if (mediaType !== 'tv' || !Array.isArray(seasons) || seasons.length === 0) {
      return undefined;
    }
    const upcoming: Array<{
      id?: number;
      title?: string;
      seasonName?: string;
      episodeNumber?: number;
      overview?: string;
      runtime?: number;
      stillPath?: string | null;
      seasonEpisodeCount?: number;
    }> = [];

    seasons.forEach((season, idx) => {
      const seasonEpisodes = Array.isArray((season as any)?.episodes) ? (season as any).episodes : [];
      const filtered = idx === 0 ? seasonEpisodes.filter((ep: any) => ep.episode_number > 1) : seasonEpisodes;
      filtered.forEach((ep: any) => {
        upcoming.push({
          id: ep.id,
          title: ep.name,
          seasonName: season?.name ?? `Season ${idx + 1}`,
          episodeNumber: ep.episode_number,
          overview: ep.overview,
          runtime: ep.runtime,
          stillPath: ep.still_path,
          seasonNumber: season?.season_number ?? idx + 1,
          seasonTmdbId: season?.id,
          episodeTmdbId: ep?.id,
          seasonEpisodeCount: seasonEpisodes.length || undefined,
        });
      });
    });

    if (!upcoming.length) return undefined;
    return JSON.stringify(upcoming);
  };

  const findInitialEpisode = () => {
    if (mediaType !== 'tv' || !Array.isArray(seasons)) return null;
    const sortedSeasons = seasons
      .filter((season: any) => typeof season?.season_number === 'number' && season.season_number > 0)
      .sort((a: any, b: any) => a.season_number - b.season_number);
    for (const season of sortedSeasons) {
      const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
      const sortedEpisodes = episodes
        .filter((ep: any) => typeof ep?.episode_number === 'number')
        .sort((a: any, b: any) => a.episode_number - b.episode_number);
      if (sortedEpisodes.length > 0) {
        return {
          season,
          episode: sortedEpisodes[0],
        };
      }
    }
    return null;
  };

  const computeReleaseYear = () => {
    const raw = movie?.release_date || movie?.first_air_date;
    if (!raw) return undefined;
    const parsed = parseInt(raw.slice(0, 4), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const buildDownloadPayload = () => {
    if (!movie) return null;
    const fallbackYear = computeReleaseYear() ?? new Date().getFullYear();
    if (normalizedMediaType === 'tv') {
      const initialEpisode = findInitialEpisode();
      if (!initialEpisode) {
        return null;
      }
      return {
        type: 'show' as const,
        title: movie.name || movie.title || 'TV Show',
        tmdbId: movie.id?.toString() ?? '',
        imdbId: movie.imdb_id ?? undefined,
        releaseYear: fallbackYear,
        season: {
          number: initialEpisode.season.season_number ?? 1,
          tmdbId: initialEpisode.season.id?.toString() ?? '',
          title: initialEpisode.season.name ?? `Season ${initialEpisode.season.season_number ?? 1}`,
          episodeCount: Array.isArray(initialEpisode.season?.episodes)
            ? initialEpisode.season.episodes.length
            : undefined,
        },
        episode: {
          number: initialEpisode.episode.episode_number ?? 1,
          tmdbId: initialEpisode.episode.id?.toString() ?? '',
        },
      };
    }
    return {
      type: 'movie' as const,
      title: movie.title || movie.name || 'Movie',
      tmdbId: movie.id?.toString() ?? '',
      imdbId: movie.imdb_id ?? undefined,
      releaseYear: fallbackYear,
    };
  };

  const buildRouteParams = (targetMediaType: string) => {
    const releaseYear = computeReleaseYear() ?? new Date().getFullYear();
    const params: Record<string, string> = {
      title: movie?.title || movie?.name || 'Now Playing',
      mediaType: targetMediaType,
      tmdbId: movie?.id?.toString() ?? '',
      releaseYear: releaseYear.toString(),
    };
    if (movie?.poster_path) {
      params.posterPath = movie.poster_path;
    }
    if (movie?.backdrop_path) {
      params.backdropPath = movie.backdrop_path;
    }
    if (movie?.overview) {
      params.overview = movie.overview;
    }
    if (releaseDateValue) {
      params.releaseDate = releaseDateValue;
    }
    if (typeof movie?.vote_average === 'number') {
      params.voteAverage = movie.vote_average.toString();
    }
    if (typeof runtimeMinutes === 'number' && runtimeMinutes > 0) {
      params.runtime = runtimeMinutes.toString();
    }
    if (derivedGenreIds.length > 0) {
      params.genreIds = derivedGenreIds.join(',');
    }
    if (movie?.imdb_id) {
      params.imdbId = movie.imdb_id;
    }
    const upcomingEpisodesPayload = buildUpcomingEpisodesPayload();
    if (upcomingEpisodesPayload) {
      params.upcomingEpisodes = upcomingEpisodesPayload;
    }
    return { params, releaseYear };
  };

  const handlePlayMovie = () => {
    if (!movie || isLaunchingPlayer) return;
    const { params } = buildRouteParams(normalizedMediaType);
    setIsLaunchingPlayer(true);

    try {
      if (normalizedMediaType === 'tv') {
        const initialEpisode = findInitialEpisode();
        if (!initialEpisode) {
          Alert.alert('Episodes loading', 'Please wait while we fetch the first episode details.');
          return;
        }
        params.seasonNumber = initialEpisode.season.season_number?.toString() ?? '';
        params.seasonTmdbId = initialEpisode.season.id?.toString() ?? '';
        params.episodeNumber = initialEpisode.episode.episode_number?.toString() ?? '';
        params.episodeTmdbId = initialEpisode.episode.id?.toString() ?? '';
        if (initialEpisode.season?.name) {
          params.seasonTitle = initialEpisode.season.name;
        }
        const episodeCount = Array.isArray(initialEpisode.season?.episodes)
          ? initialEpisode.season.episodes.length
          : undefined;
        if (typeof episodeCount === 'number' && episodeCount > 0) {
          params.seasonEpisodeCount = episodeCount.toString();
        }
      }
      if (contentHint) {
        params.contentHint = contentHint;
      }

      router.push({
        pathname: '/video-player',
        params,
      });
    } finally {
      setIsLaunchingPlayer(false);
    }
  };

  const handlePlayEpisode = (episode: any, season: any) => {
    if (!movie || !season) return;
    const { params } = buildRouteParams('tv');
    const seasonNumber = season?.season_number ?? episode?.season_number ?? 1;
    const episodeNumber = episode?.episode_number ?? 1;

    params.seasonNumber = seasonNumber.toString();
    if (season?.id) params.seasonTmdbId = season.id.toString();
    params.episodeNumber = episodeNumber.toString();
    if (episode?.id) params.episodeTmdbId = episode.id.toString();
    if (season?.name) params.seasonTitle = season.name;
    const episodeCount = Array.isArray(season?.episodes) ? season.episodes.length : undefined;
    if (typeof episodeCount === 'number' && episodeCount > 0) {
      params.seasonEpisodeCount = episodeCount.toString();
    }
    if (contentHint) {
      params.contentHint = contentHint;
    }

    router.push({
      pathname: '/video-player',
      params,
    });
  };

  const handleDownload = async () => {
    if (!movie || downloadState !== 'idle') return;
    const payload = buildDownloadPayload();
    if (!payload) {
      Alert.alert('Download unavailable', 'We could not find an episode to download yet.');
      return;
    }
    const title = movie.title || movie.name || 'Download';
    const sessionId = `${movie.id ?? 'title'}-${Date.now()}`;
    const episodeLabel =
      payload.type === 'show'
        ? `S${String(payload.season.number).padStart(2, '0')}E${String(payload.episode.number).padStart(2, '0')}`
        : null;
    const subtitleParts = [
      payload.type === 'show' ? 'Episode' : 'Movie',
      episodeLabel,
      runtimeMinutes ? `${runtimeMinutes}m` : null,
    ].filter(Boolean);
    const subtitle = subtitleParts.length ? subtitleParts.join(' • ') : null;
    const baseEvent = {
      sessionId,
      title,
      mediaId: movie.id ?? undefined,
      mediaType: normalizedMediaType,
      subtitle,
      runtimeMinutes,
      seasonNumber: payload.type === 'show' ? payload.season.number : undefined,
      episodeNumber: payload.type === 'show' ? payload.episode.number : undefined,
    };
    emitDownloadEvent({
      ...baseEvent,
      status: 'preparing',
      progress: 0,
    });
    let cleanupPath: string | null = null;
    try {
      setDownloadStateSafe('preparing');
      setDownloadProgressSafe(0);
      const playback = await scrapeDownload(payload, { debugTag: `[download] ${title}` });
      const downloadsRoot = await ensureDownloadDir();

      if (playback.stream.type === 'hls') {
        const sessionName = `${movie.id ?? 'title'}-${Date.now()}`;
        cleanupPath = `${downloadsRoot}/${sessionName}`;
        setDownloadStateSafe('downloading');
        const hlsResult = await downloadHlsPlaylist({
          playlistUrl: playback.uri,
          headers: playback.headers,
          rootDir: downloadsRoot,
          sessionName,
          onProgress: (completed, total) => {
            if (total > 0) {
              const progress = completed / total;
              setDownloadProgressSafe(progress);
              emitDownloadEvent({
                ...baseEvent,
                status: 'downloading',
                progress,
              });
            }
          },
        });
        cleanupPath = null;
        await persistDownloadRecord({
          mediaId: movie.id,
          title,
          mediaType: normalizedMediaType,
          localUri: hlsResult.playlistPath,
          containerPath: hlsResult.directory,
          createdAt: Date.now(),
          bytesWritten: hlsResult.totalBytes,
          runtimeMinutes,
          releaseDate: releaseDateValue,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          overview: movie.overview ?? null,
          seasonNumber: payload.type === 'show' ? payload.season.number : undefined,
          episodeNumber: payload.type === 'show' ? payload.episode.number : undefined,
          sourceUrl: playback.uri,
          downloadType: 'hls',
          segmentCount: hlsResult.segmentCount,
        });
        emitDownloadEvent({
          ...baseEvent,
          status: 'completed',
          progress: 1,
        });
      } else {
        const extension = guessFileExtension(playback.uri);
        const suffix =
          payload.type === 'show'
            ? `s${String(payload.season.number).padStart(2, '0')}e${String(payload.episode.number).padStart(2, '0')}`
            : 'movie';
        const fileName = `${movie.id ?? 'title'}-${suffix}-${Date.now()}.${extension}`;
        const destination = `${downloadsRoot}/${fileName}`;
        cleanupPath = destination;
        setDownloadStateSafe('downloading');
        const resumable = FileSystem.createDownloadResumable(
          playback.uri,
          destination,
          playback.headers ? { headers: playback.headers } : undefined,
          (progress) => {
            if (progress.totalBytesExpectedToWrite > 0) {
              const ratio = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              setDownloadProgressSafe(ratio);
              emitDownloadEvent({
                ...baseEvent,
                status: 'downloading',
                progress: ratio,
              });
            }
          },
        );
        downloadResumableRef.current = resumable;
        const downloadResult = await resumable.downloadAsync();
        downloadResumableRef.current = null;
        if (!downloadResult || downloadResult.status >= 400) {
          throw new Error('Download did not complete. Please try again.');
        }
        cleanupPath = null;
        const fileInfo = await FileSystem.getInfoAsync(destination);
        await persistDownloadRecord({
          mediaId: movie.id,
          title,
          mediaType: normalizedMediaType,
          localUri: downloadResult.uri,
          containerPath: destination,
          createdAt: Date.now(),
          bytesWritten: fileInfo.size ?? undefined,
          runtimeMinutes,
          releaseDate: releaseDateValue,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          overview: movie.overview ?? null,
          seasonNumber: payload.type === 'show' ? payload.season.number : undefined,
          episodeNumber: payload.type === 'show' ? payload.episode.number : undefined,
          sourceUrl: playback.uri,
          downloadType: 'file',
        });
        emitDownloadEvent({
          ...baseEvent,
          status: 'completed',
          progress: 1,
        });
      }
      setDownloadStateSafe('idle');
      setDownloadProgressSafe(0);
      if (isMountedRef.current) {
        Alert.alert('Download complete', `${title} is now available offline.`, [
          { text: 'OK', style: 'default' },
          {
            text: 'Go to downloads',
            onPress: () => router.push('/downloads'),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Download failed', err);
      if (isMountedRef.current) {
        Alert.alert('Download failed', err?.message || 'Unable to save this title for offline viewing right now.');
      }
      setDownloadStateSafe('idle');
      setDownloadProgressSafe(0);
      downloadResumableRef.current = null;
      if (cleanupPath) {
        FileSystem.deleteAsync(cleanupPath, { idempotent: true }).catch(() => {});
      }
      emitDownloadEvent({
        ...baseEvent,
        status: 'error',
        progress: 0,
        errorMessage: err?.message || 'Download failed',
      });
    }
  };

  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        <MovieHeader
          movie={movie}
          isLoading={isLoading}
          onWatchTrailer={onWatchTrailer}
          onBack={onBack}
          onAddToMyList={() => movie && onAddToMyList(movie)}
          onPlayMovie={handlePlayMovie}
          isPStreamPlaying={false}
          accentColor="#e50914"
          isPlayLoading={isLaunchingPlayer}
          onDownload={handleDownload}
          downloadStatus={downloadState}
          downloadProgress={downloadState === 'downloading' ? downloadProgress : null}
        />

        <View style={[styles.section, styles.sectionFirst]}>
          <MovieInfo movie={movie} isLoading={isLoading} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trailers</Text>
          <TrailerList trailers={trailers} isLoading={isLoading} onWatchTrailer={onWatchTrailer} />
        </View>

        {mediaType === 'tv' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            <EpisodeList
              seasons={seasons}
              onPlayEpisode={handlePlayEpisode}
              disabled={isLoading || isLaunchingPlayer}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More like this</Text>
          <RelatedMovies
            relatedMovies={relatedMovies}
            isLoading={isLoading}
            onSelectRelated={onSelectRelated}
          />
        </View>

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <CastList cast={cast} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    paddingBottom: 40,
    paddingTop: 0,
  },
  section: {
    paddingHorizontal: 18,
    marginTop: 16,
  },
  sectionFirst: {
    marginTop: -12,
  },
  lastSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
});

export default MovieDetailsView;

function determineContentHint(media?: Media | null): string | undefined {
  if (!media) return undefined;
  const genreIds = Array.isArray(media.genre_ids) ? media.genre_ids : [];
  const explicitGenres: string[] = Array.isArray((media as any)?.genres)
    ? (media as any).genres.map((g: any) => (g?.name || '').toLowerCase())
    : [];
  const originCountries: string[] = Array.isArray((media as any)?.origin_country)
    ? (media as any).origin_country
    : [];
  const originalLanguage = (media as any)?.original_language;
  const titleCheck = `${media.title || ''} ${media.name || ''}`.toLowerCase();
  const ANIMATION_GENRE_ID = 16;
  if (
    genreIds.includes(ANIMATION_GENRE_ID) ||
    explicitGenres.some(name => name.includes('animation') || name.includes('anime')) ||
    originCountries.includes('JP') ||
    originalLanguage === 'ja' ||
    titleCheck.includes('anime')
  ) {
    return 'anime';
  }
  return undefined;
}
