import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { IMAGE_BASE_URL } from '../../constants/api';
import { Media } from '../../types';
import PulsePlaceholder from './PulsePlaceholder'; // Corrected import

interface Props {
  relatedMovies: Media[];
  isLoading: boolean;
  onSelectRelated: (id: number) => void;
}

const RelatedMovies: React.FC<Props> = ({ relatedMovies, isLoading, onSelectRelated }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Related Movies</Text>

      <View style={styles.roundedCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <View key={idx} style={styles.relatedMovieCard}>
                <PulsePlaceholder style={styles.relatedPlaceholder} />
              </View>
            ))
          ) : (
            relatedMovies.map((relatedMovie) => (
              <TouchableOpacity
                key={relatedMovie.id}
                style={styles.relatedMovieCard}
                onPress={() => onSelectRelated(relatedMovie.id)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: `${IMAGE_BASE_URL}${relatedMovie.poster_path}` }}
                  style={styles.relatedMovieImage}
                />
                <Text style={styles.relatedMovieTitle} numberOfLines={1} ellipsizeMode="tail">
                  {relatedMovie.title || relatedMovie.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  roundedCard: {
    backgroundColor: 'rgba(20,20,22,0.6)',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  row: {
    paddingVertical: 6,
  },
  relatedMovieCard: {
    width: 140,
    marginRight: 14,
    alignItems: 'center',
  },
  relatedMovieImage: {
    width: 140,
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  relatedPlaceholder: {
    width: 140,
    height: 200,
    borderRadius: 10,
  },
  relatedMovieTitle: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    width: 140,
  },
});

export default RelatedMovies;
