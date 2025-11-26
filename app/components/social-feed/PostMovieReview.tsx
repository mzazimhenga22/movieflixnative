import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function PostMovieReview() {
  const router = useRouter();

  const handlePostReview = () => {
    // Navigate to review posting screen
    router.push('/post-review');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePostReview}>
      {Platform.OS !== 'web' && (
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="film-outline" size={24} color="#fff" />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>Post Movie Review</Text>
          <Text style={styles.subtitle}>Share your thoughts about a movie</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    overflow: 'hidden',
    backgroundColor: Platform.select({
      web: 'rgba(255,255,255,0.04)',
      default: 'transparent',
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff4b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
});
