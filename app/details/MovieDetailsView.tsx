import React from 'react';
import { StyleSheet, View, ScrollView, Text, Alert } from 'react-native';
import { Media, CastMember } from '../../types';
import MovieHeader from './MovieHeader';
import MovieInfo from './MovieInfo';
import TrailerList from './TrailerList';
import RelatedMovies from './RelatedMovies';
import EpisodeList from './EpisodeList';
import CastList from './CastList';
import { usePStream, PStreamPlayback } from '../../src/pstream/usePStream';
import { useRouter } from 'expo-router';

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
  const { loading, scrape } = usePStream();

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

  const buildRouteParams = (targetMediaType: string) => {
    const releaseYear = computeReleaseYear() ?? new Date().getFullYear();
    const params: Record<string, string> = {
      title: movie?.title || movie?.name || 'Now Playing',
      mediaType: targetMediaType,
      tmdbId: movie?.id?.toString() ?? '',
      releaseYear: releaseYear.toString(),
    };
    if (movie?.imdb_id) {
      params.imdbId = movie.imdb_id;
    }
    const upcomingEpisodesPayload = buildUpcomingEpisodesPayload();
    if (upcomingEpisodesPayload) {
      params.upcomingEpisodes = upcomingEpisodesPayload;
    }
    return { params, releaseYear };
  };

  const pushToVideoPlayer = (playback: PStreamPlayback, params: Record<string, string>) => {
    const nextParams = { ...params };
    nextParams.videoUrl = playback.uri;
    if (playback.headers) {
      nextParams.videoHeaders = encodeURIComponent(JSON.stringify(playback.headers));
    }
    if (playback.stream?.type) {
      nextParams.streamType = playback.stream.type;
    }

    router.push({
      pathname: '/video-player',
      params: nextParams,
    });
  };

  const handlePlayMovie = async () => {
    if (!movie || loading) return;
    const normalizedMediaType = typeof mediaType === 'string' ? mediaType : 'movie';
    const { params, releaseYear } = buildRouteParams(normalizedMediaType);

    try {
      let playback: PStreamPlayback;
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
        playback = await scrape({
          type: 'show',
          title: movie?.name || movie?.title || 'TV Show',
          tmdbId: movie.id?.toString() ?? '',
          imdbId: movie.imdb_id ?? undefined,
          releaseYear,
          season: {
            number: initialEpisode.season.season_number,
            tmdbId: initialEpisode.season.id?.toString() ?? '',
            title: initialEpisode.season.name ?? `Season ${initialEpisode.season.season_number}`,
            episodeCount: initialEpisode.season.episodes?.length,
          },
          episode: {
            number: initialEpisode.episode.episode_number,
            tmdbId: initialEpisode.episode.id?.toString() ?? '',
          },
        });
      } else {
        playback = await scrape({
          type: 'movie',
          title: movie?.title || movie?.name || 'Movie',
          tmdbId: movie.id?.toString() ?? '',
          imdbId: movie.imdb_id ?? undefined,
          releaseYear,
        });
      }

      pushToVideoPlayer(playback, params);
    } catch (err: any) {
      Alert.alert('Playback unavailable', err?.message || 'No playable sources were found.');
    }
  };

  const handlePlayEpisode = async (episode: any, season: any) => {
    if (!movie || loading || !season) return;
    const { params, releaseYear } = buildRouteParams('tv');
    const seasonNumber = season?.season_number ?? episode?.season_number ?? 1;
    const episodeNumber = episode?.episode_number ?? 1;

    params.seasonNumber = seasonNumber.toString();
    if (season?.id) params.seasonTmdbId = season.id.toString();
    params.episodeNumber = episodeNumber.toString();
    if (episode?.id) params.episodeTmdbId = episode.id.toString();

    try {
      const playback = await scrape({
        type: 'show',
        title: movie?.name || movie?.title || 'TV Show',
        tmdbId: movie.id?.toString() ?? '',
        imdbId: movie.imdb_id ?? undefined,
        releaseYear,
        season: {
          number: seasonNumber,
          tmdbId: season?.id?.toString() ?? '',
          title: season?.name ?? `Season ${seasonNumber}`,
          episodeCount: season?.episodes?.length,
        },
        episode: {
          number: episodeNumber,
          tmdbId: episode?.id?.toString() ?? '',
        },
      });

      pushToVideoPlayer(playback, params);
    } catch (err: any) {
      Alert.alert('Episode unavailable', err?.message || 'Unable to load this episode.');
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
          isPlayLoading={loading}
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
            <EpisodeList seasons={seasons} onPlayEpisode={handlePlayEpisode} disabled={loading} />
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
