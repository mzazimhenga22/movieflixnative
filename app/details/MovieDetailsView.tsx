import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Media, CastMember } from '../../types';
import MovieHeader from './MovieHeader';
import MovieInfo from './MovieInfo';
import TrailerList from './TrailerList';
import RelatedMovies from './RelatedMovies';
import EpisodeList from './EpisodeList';
import CastList from './CastList';
import { usePStream } from '../../src/pstream/usePStream';
import { Video } from 'expo-av';

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
  const { loading, error, result: pstreamPlayUrl, scrape } = usePStream();
  const [currentPlayUrl, setCurrentPlayUrl] = useState<string | null>(null);
  const [showPStreamPlayer, setShowPStreamPlayer] = useState(false);

  useEffect(() => {
    if (pstreamPlayUrl) {
      setCurrentPlayUrl(pstreamPlayUrl);
      setShowPStreamPlayer(true);
    }
  }, [pstreamPlayUrl]);

  const handlePlayMovie = async () => {
    if (!movie) return;

    const mediaTypeScrape = mediaType === 'tv' ? 'show' : 'movie';
    const tmdbId = String(movie.id);

    await scrape({
      type: mediaTypeScrape,
      tmdbId: tmdbId,
      // For TV shows, you might need to select a default season/episode or allow user to choose
      // For now, let's assume season 1, episode 1 if it's a TV show and no specific selection is made
      season: mediaTypeScrape === 'show' ? 1 : undefined,
      episode: mediaTypeScrape === 'show' ? 1 : undefined,
    });
  };

  const handleClosePlayer = () => {
    setCurrentPlayUrl(null);
    setShowPStreamPlayer(false);
  };

  return (
    <View style={styles.fullContainer}>
      {showPStreamPlayer && currentPlayUrl ? (
        <View style={styles.videoPlayerContainer}>
          <Video
            style={styles.videoPlayer}
            source={{ uri: currentPlayUrl }}
            useNativeControls
            resizeMode="contain"
            shouldPlay={true}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && !status.isPlaying) {
                // Optionally handle end of playback
              }
            }}
          />
          <MovieHeader
            movie={movie}
            isLoading={isLoading}
            onWatchTrailer={onWatchTrailer}
            onBack={handleClosePlayer} // Use handleClosePlayer to exit video and go back
            onAddToMyList={() => movie && onAddToMyList(movie)}
            onPlayMovie={handlePlayMovie} // Pass the scraper function
            isPStreamPlaying={true}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          <MovieHeader
            movie={movie}
            isLoading={isLoading}
            onWatchTrailer={onWatchTrailer}
            onBack={onBack}
            onAddToMyList={() => movie && onAddToMyList(movie)}
            onPlayMovie={handlePlayMovie} // Pass the scraper function
            isPStreamPlaying={false}
          />
          <MovieInfo movie={movie} isLoading={isLoading} />
          <TrailerList trailers={trailers} isLoading={isLoading} onWatchTrailer={onWatchTrailer} />
          {mediaType === 'tv' && <EpisodeList seasons={seasons} />}
          <RelatedMovies relatedMovies={relatedMovies} isLoading={isLoading} onSelectRelated={onSelectRelated} />
          <CastList cast={cast} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#0f0f10',
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  videoPlayerContainer: {
    width: '100%',
    height: 250, // Adjust height as needed for the video player
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
});

export default MovieDetailsView;
