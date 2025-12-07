import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

type RecommendedMovie = {
  id: string;
  title: string;
  genre: string;
  rating: number;
  matchPercentage: number;
};

// Mock data - replace with real data from your API
const RECOMMENDED_MOVIES: RecommendedMovie[] = [
  { id: '1', title: 'Inception', genre: 'Sci-Fi', rating: 4.8, matchPercentage: 95 },
  { id: '2', title: 'The Dark Knight', genre: 'Action', rating: 4.9, matchPercentage: 92 },
  { id: '3', title: 'Interstellar', genre: 'Sci-Fi', rating: 4.7, matchPercentage: 88 },
];

export default function RecommendedView() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 75, 75, 0.15)', 'rgba(255, 75, 75, 0.05)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Match</Text>
          <Text style={styles.subtitle}>Movies picked just for you</Text>
        </View>

        {RECOMMENDED_MOVIES.map((movie) => (
          <TouchableOpacity key={movie.id} style={styles.movieCard}>
            <BlurView intensity={30} tint="dark" style={styles.cardContent}>
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                <Text style={styles.movieGenre}>{movie.genre}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>{movie.rating}</Text>
                </View>
              </View>
              <View style={styles.matchContainer}>
                <Text style={styles.matchPercentage}>{movie.matchPercentage}%</Text>
                <Text style={styles.matchLabel}>match</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  movieCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  movieGenre: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    color: '#FFD700',
    fontWeight: '600',
  },
  matchContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    padding: 12,
    borderRadius: 12,
  },
  matchPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4b4b',
  },
  matchLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
