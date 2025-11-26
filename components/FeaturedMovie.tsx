import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Animated, Easing } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGE_BASE_URL } from '@/constants/api';
import { Media } from '@/types';
import { useRouter } from 'expo-router';

interface FeaturedMovieProps {
  movie: Media;
  getGenreNames: (genreIds: number[]) => string;
}

const FeaturedMovie: React.FC<FeaturedMovieProps> = ({ movie, getGenreNames }) => {
  const slideAnim = useRef(new Animated.Value(250)).current; // Start position (off-screen below)
  const router = useRouter();

  useEffect(() => {
    slideAnim.setValue(250); // Reset to start position for the new movie
    Animated.timing(slideAnim, {
      toValue: 0, // Animate to final position (on-screen)
      duration: 700,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [movie]);

  const handlePress = () => {
    if (movie) {
      router.push(`/details/${movie.id}?mediaType=${movie.media_type || 'movie'}`);
    }
  };

  if (!movie) return null;

  return (
    <View style={styles.cardContainer}>
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <LinearGradient
            colors={['#1C1C1E', '#000000']}
            style={styles.featuredMovieCard}
          >
            <Image
              source={{ uri: `${IMAGE_BASE_URL}${movie.poster_path}` }}
              style={styles.featuredMovieImage}
            />
            <View style={styles.overlay}>
              <View style={styles.detailsRow}>
                <View style={styles.detailsContainer}>
                  <Text style={styles.featuredMovieTitle}>{movie.title || movie.name}</Text>
                  <Text style={styles.featuredMovieInfo}>Release Date: {movie.release_date || movie.first_air_date}</Text>
                  <Text style={styles.featuredMovieInfo}>Genres: {getGenreNames(movie.genre_ids || [])}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={16} color="gold" />
                  <Text style={styles.ratingText}>{(movie.vote_average || 0).toFixed(1)}</Text>
                </View>
              </View>
              <View style={styles.featuredMovieActions}>
                <TouchableOpacity style={styles.watchTrailerButton}>
                  <FontAwesome name="play-circle" size={20} color="white" />
                  <Text style={styles.watchTrailerButtonText}>Watch Trailer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.favoriteButton}>
                  <FontAwesome name="heart-o" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 15,
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    height: 250,
  },
  featuredMovieCard: {
    height: 250,
    justifyContent: 'flex-end',
  },
  featuredMovieImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
    opacity: 0.3,
  },
  overlay: {
    padding: 15,
    backgroundColor: 'transparent',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 10,
  },
  featuredMovieTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  featuredMovieInfo: {
    color: 'white',
    fontSize: 14,
    marginBottom: 3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 5,
  },
  ratingText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuredMovieActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  watchTrailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  watchTrailerButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
});

export default FeaturedMovie;
