import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { IMAGE_BASE_URL } from '@/constants/api';
import { Media } from '@/types';
import { useRouter } from 'expo-router';

interface MovieListProps {
  title: string;
  movies: Media[];
  carousel?: boolean; // Make carousel optional
}

const MovieList: React.FC<MovieListProps> = ({ title, movies, carousel = true }) => {
  const router = useRouter();

  const handlePress = (movieId: number, mediaType: 'movie' | 'tv' | undefined) => {
    router.push(`/details/${movieId}?mediaType=${mediaType || 'movie'}`);
  };

  // Return null if movies array is empty or undefined
  if (!movies || movies.length === 0) {
    return null;
  }

  const renderCarouselItem = ({ item }: { item: Media }) => (
    <TouchableOpacity style={styles.carouselMovieCard} onPress={() => handlePress(item.id, item.media_type)}>
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
        style={styles.carouselMovieImage}
      />
      <Text style={styles.movieTitle} numberOfLines={1}>
        {item.title || item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderVerticalItem = (item: Media) => (
    <TouchableOpacity key={item.id} style={styles.verticalMovieCard} onPress={() => handlePress(item.id, item.media_type)}>
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
        style={styles.verticalMovieImage}
      />
      <View style={styles.verticalMovieInfo}>
        <Text style={styles.verticalMovieTitle}>{item.title || item.name}</Text>
        <Text style={styles.verticalMovieOverview} numberOfLines={3}>
          {item.overview}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {carousel && (
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {carousel ? (
        <FlatList
          data={movies}
          renderItem={renderCarouselItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        />
      ) : (
        <View style={styles.verticalListContainer}>
          {movies.map(renderVerticalItem)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#FF4500',
    fontSize: 14,
  },
  movieTitle: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  // Carousel-specific styles
  carouselContent: {
    paddingLeft: 15,
    paddingVertical: 10,
  },
  carouselMovieCard: {
    marginRight: 15,
    width: 140,
  },
  carouselMovieImage: {
    width: 140,
    height: 210,
    borderRadius: 10,
  },
  // Vertical list-specific styles
  verticalListContainer: {
    paddingHorizontal: 15,
  },
  verticalMovieCard: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    overflow: 'hidden',
  },
  verticalMovieImage: {
    width: 100,
    height: 150,
  },
  verticalMovieInfo: {
    flex: 1,
    padding: 12,
  },
  verticalMovieTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  verticalMovieOverview: {
    color: '#b3b3b3',
    fontSize: 12,
  },
});

export default MovieList;
