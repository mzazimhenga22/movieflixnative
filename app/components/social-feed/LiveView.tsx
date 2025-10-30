import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type LiveStream = {
  id: string;
  title: string;
  hostName: string;
  viewers: number;
  thumbnailUrl: string;
};

// Mock data - replace with real data from your API
const LIVE_STREAMS: LiveStream[] = [
  {
    id: '1',
    title: 'Movie Night: Discussing Latest Releases',
    hostName: 'MovieBuff',
    viewers: 1234,
    thumbnailUrl: 'https://example.com/thumbnail1.jpg',
  },
  {
    id: '2',
    title: 'Live Movie Review: Blockbuster Analysis',
    hostName: 'CinematicCritic',
    viewers: 856,
    thumbnailUrl: 'https://example.com/thumbnail2.jpg',
  },
];

export default function LiveView() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 75, 75, 0.15)', 'rgba(255, 75, 75, 0.05)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Now</Text>
          <TouchableOpacity style={styles.goLiveButton}>
            <BlurView intensity={30} tint="dark" style={styles.goLiveBlur}>
              <Ionicons name="radio" size={20} color="#ff4b4b" />
              <Text style={styles.goLiveText}>Go Live</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {LIVE_STREAMS.map((stream) => (
          <TouchableOpacity key={stream.id} style={styles.streamCard}>
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: stream.thumbnailUrl }}
                style={styles.thumbnail}
                defaultSource={require('../../../assets/images/default-thumbnail.webp')}
              />
              <BlurView intensity={60} tint="dark" style={styles.liveIndicator}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.liveText}>LIVE</Text>
                <Text style={styles.viewerCount}>
                  <Ionicons name="eye" size={12} color="#fff" /> {stream.viewers}
                </Text>
              </BlurView>
            </View>
            <BlurView intensity={30} tint="dark" style={styles.streamInfo}>
              <Text style={styles.streamTitle}>{stream.title}</Text>
              <Text style={styles.hostName}>{stream.hostName}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  goLiveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  goLiveBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  goLiveText: {
    color: '#ff4b4b',
    fontWeight: '600',
  },
  streamCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4b4b',
  },
  liveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  streamInfo: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});