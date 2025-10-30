import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ImageBackground, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGE_BASE_URL } from '@/constants/api';
import { Media } from '@/types';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface SongListProps {
  title: string;
  songs: Media[];
}

const SongList: React.FC<SongListProps> = ({ title, songs }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const topSongs = songs.slice(0, 5); // Display a maximum of 5 cards
  const router = useRouter();

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Subtract the horizontal padding from the width to get the correct card width
    const cardWidth = width - 30; 
    const index = Math.round(scrollPosition / cardWidth);
    setActiveIndex(index);
  };

  const handleWatchPress = (song: Media) => {
    const query = `${song.title || song.name} official music video`;
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    WebBrowser.openBrowserAsync(youtubeUrl);
  };

  const handleCardPress = (movieId: number) => {
    router.push(`/details/${movieId}`);
  };

  if (!topSongs || topSongs.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.sliderContainer}
      >
        {topSongs.map((song) => (
          <TouchableOpacity key={song.id} style={styles.card} onPress={() => handleCardPress(song.id)}>
            <ImageBackground
              source={{ uri: `${IMAGE_BASE_URL}${song.poster_path}` }}
              style={styles.imageBackground}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.songTitle}>{song.title || song.name}</Text>
                  <Text style={styles.movieSubTitle}>From the movie</Text>
                  <TouchableOpacity style={styles.watchButton} onPress={() => handleWatchPress(song)}>
                    <FontAwesome name="youtube-play" size={20} color="white" />
                    <Text style={styles.watchButtonText}>Watch Now</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {topSongs.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === activeIndex ? '#FF4500' : '#888' },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  sliderContainer: {
    paddingHorizontal: 15,
  },
  card: {
    width: width - 60,
    height: 180,
    marginHorizontal: 15,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    padding: 15,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  songTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  movieSubTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 10,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  watchButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default SongList;
