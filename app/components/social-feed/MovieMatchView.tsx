import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MovieMatch = {
  id: string;
  title: string;
  genre: string;
  matchScore: number;
  posterUrl: string;
  userCount: number;
};

// Mock data - replace with real data from your API
const MOVIE_MATCHES: MovieMatch[] = [
  {
    id: '1',
    title: 'The Matrix',
    genre: 'Sci-Fi',
    matchScore: 98,
    posterUrl: 'https://example.com/matrix.jpg',
    userCount: 1250,
  },
  {
    id: '2',
    title: 'Pulp Fiction',
    genre: 'Crime Drama',
    matchScore: 95,
    posterUrl: 'https://example.com/pulp-fiction.jpg',
    userCount: 980,
  },
];

export default function MovieMatchView() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 75, 75, 0.15)', 'rgba(255, 75, 75, 0.05)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Movie Match</Text>
          <Text style={styles.subtitle}>Find movie buddies with similar taste</Text>
        </View>

        <TouchableOpacity style={styles.createMatchButton}>
          <BlurView intensity={30} tint="dark" style={styles.createMatchBlur}>
            <Ionicons name="add-circle" size={24} color="#ff4b4b" />
            <Text style={styles.createMatchText}>Create New Match Room</Text>
          </BlurView>
        </TouchableOpacity>

        {MOVIE_MATCHES.map((match) => (
          <TouchableOpacity key={match.id} style={styles.matchCard}>
            <BlurView intensity={30} tint="dark" style={styles.cardContent}>
              <Image
                source={{ uri: match.posterUrl }}
                style={styles.poster}
                defaultSource={require('../../../assets/images/default-poster.webp')}
              />
              <View style={styles.matchInfo}>
                <Text style={styles.movieTitle}>{match.title}</Text>
                <Text style={styles.movieGenre}>{match.genre}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.matchScore}>
                    <Text style={styles.scoreNumber}>{match.matchScore}%</Text>
                    <Text style={styles.scoreLabel}>match</Text>
                  </View>
                  <View style={styles.userCount}>
                    <Ionicons name="people" size={16} color="#fff" />
                    <Text style={styles.countText}>{match.userCount}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
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
  createMatchButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createMatchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  createMatchText: {
    color: '#ff4b4b',
    fontSize: 16,
    fontWeight: '600',
  },
  matchCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 16,
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  matchScore: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4b4b',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 14,
  },
});
