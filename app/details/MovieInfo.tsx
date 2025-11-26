import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Media } from '../../types';
import PulsePlaceholder from './PulsePlaceholder'; // Corrected import

interface Props {
  movie: Media | null;
  isLoading: boolean;
}

const MovieInfo: React.FC<Props> = ({ movie, isLoading }) => {
  return (
    <View style={styles.contentContainer}>
      {isLoading ? (
        <PulsePlaceholder style={styles.titlePlaceholder} />
      ) : (
        <Text style={styles.title}>{movie?.title || movie?.name}</Text>
      )}

      {isLoading ? (
        <PulsePlaceholder style={styles.datePlaceholder} />
      ) : (
        <Text style={styles.releaseDate}>Release Date: {movie?.release_date || movie?.first_air_date || 'N/A'}</Text>
      )}

      {isLoading ? (
        <>
          <PulsePlaceholder style={styles.overviewPlaceholderLine} />
          <PulsePlaceholder style={[styles.overviewPlaceholderLine, { width: '92%' }]} />
          <PulsePlaceholder style={[styles.overviewPlaceholderLine, { width: '85%' }]} />
        </>
      ) : (
        <Text style={styles.overview}>{movie?.overview}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  titlePlaceholder: {
    width: '60%',
    height: 28,
    borderRadius: 8,
    marginBottom: 8,
  },
  datePlaceholder: {
    width: 120,
    height: 14,
    borderRadius: 6,
    marginBottom: 12,
  },
  releaseDate: {
    color: '#cfcfcf',
    fontSize: 13,
    marginBottom: 12,
  },
  overview: {
    color: '#dcdcdc',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  overviewPlaceholderLine: {
    width: '100%',
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
});

export default MovieInfo;
