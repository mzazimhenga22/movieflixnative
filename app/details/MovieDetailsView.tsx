import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { Media, CastMember } from '../../types';
import MovieHeader from './MovieHeader';
import MovieInfo from './MovieInfo';
import TrailerList from './TrailerList';
import RelatedMovies from './RelatedMovies';
import EpisodeList from './EpisodeList';
import CastList from './CastList';
import { usePStream } from '../../src/pstream/usePStream';
import { Video } from 'expo-av';
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
    router.push('/video-player');
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
            shouldPlay
          />
          <MovieHeader
            movie={movie}
            isLoading={isLoading}
            onWatchTrailer={onWatchTrailer}
            onBack={handleClosePlayer}
            onAddToMyList={() => movie && onAddToMyList(movie)}
            onPlayMovie={handlePlayMovie}
            isPStreamPlaying
            accentColor="#e50914"
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
            onPlayMovie={handlePlayMovie}
            isPStreamPlaying={false}
            accentColor="#e50914"
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
              <EpisodeList seasons={seasons} />
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
      )}
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
  videoPlayerContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
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
