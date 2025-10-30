import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Media } from '../../types';
import MovieHeader from './MovieHeader';
import MovieInfo from './MovieInfo';
import TrailerList from './TrailerList';
import RelatedMovies from './RelatedMovies';

interface Video {
  key: string;
  name: string;
}

interface Props {
  movie: Media | null;
  trailers: Video[];
  relatedMovies: Media[];
  isLoading: boolean;
  onWatchTrailer: (key?: string) => void;
  onBack: () => void;
  onSelectRelated: (id: number) => void;
}

const MovieDetailsView: React.FC<Props> = ({
  movie,
  trailers,
  relatedMovies,
  isLoading,
  onWatchTrailer,
  onBack,
  onSelectRelated,
}) => {
  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        <MovieHeader
          movie={movie}
          isLoading={isLoading}
          onWatchTrailer={() => onWatchTrailer()}
          onBack={onBack}
        />
        <MovieInfo movie={movie} isLoading={isLoading} />
        <TrailerList trailers={trailers} isLoading={isLoading} onWatchTrailer={onWatchTrailer} />
        <RelatedMovies relatedMovies={relatedMovies} isLoading={isLoading} onSelectRelated={onSelectRelated} />
      </ScrollView>
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
});

export default MovieDetailsView;
