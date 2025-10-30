
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import FeatureCard from '../components/interactive/FeatureCard';

const { width } = Dimensions.get('window');

const InteractiveScreen = () => {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Interactive Features</Text>
          <TouchableOpacity>
            <MaterialCommunityIcons name="cog" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Local Storage Usage Card */}
        <View style={styles.localStorageCard}>
          <BlurView intensity={80} tint="dark" style={styles.blurView} />
          <MaterialCommunityIcons name="sd" size={40} color="#FF4500" style={styles.localStorageIcon} />
          <View style={styles.localStorageTextContent}>
            <Text style={styles.localStorageTitle}>Local Storage Usage</Text>
            <Text style={styles.localStorageUsage}>0 B • 0 files</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarFill} />
            </View>
          </View>
          <TouchableOpacity style={styles.allocateButton}>
            <Text style={styles.allocateButtonText}>Allocate</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Features Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.row}>
            <FeatureCard
              iconName="account-group"
              title="Watch Party"
              description="Host live watch parties with synchronized playback and in-app chat."
              onPress={() => console.log('Watch Party')}
            />
            <FeatureCard
              iconName="comment-question"
              title="In-Playback Trivia"
              description="Engage with trivia and challenges during key moments."
              onPress={() => console.log('In-Playback Trivia')}
            />
          </View>

          <View style={styles.row}>
            <FeatureCard
              iconName="cube-scan"
              title="Augmented Reality Mode"
              description="Experience AR with movie posters and interactive objects."
              onPress={() => console.log('Augmented Reality Mode')}
            />
            <FeatureCard
              iconName="format-list-checks"
              title="Personalized Watchlists"
              description="Get personalized movie journeys based on your viewing history."
              onPress={() => console.log('Personalized Watchlists')}
            />
          </View>

          <View style={styles.row}>
            <FeatureCard
              iconName="movie-open-play"
              title="Behind-the-Scenes"
              description="Discover exclusive content and interactive Easter egg hunts."
              onPress={() => console.log('Behind-the-Scenes')}
            />
            <FeatureCard
              iconName="palette"
              title="Customizable UI Themes"
              description="Switch between dark mode, cinema mode, and more."
              onPress={() => console.log('Customizable UI Themes')}
            />
          </View>

          <View style={styles.row}>
            <FeatureCard
              iconName="microphone"
              title="Voice Command"
              description="Control the app hands-free with your voice."
              onPress={() => console.log('Voice Command')}
            />
            <View style={{flex:1, marginHorizontal: 7.5}} />
          </View>

          {/* Social Reactions - large card */}
          <FeatureCard
            iconName="emoticon-happy"
            title="Social Reactions"
            description="Share live reactions during movies with friends and other viewers."
            isLarge={true}
            onPress={() => router.push('/social-feed')}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 80,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  header: {
    color: '#FF4500',
    fontSize: 26,
    fontWeight: 'bold',
  },
  localStorageCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    overflow: 'hidden',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  localStorageIcon: {
    marginRight: 15,
  },
  localStorageTextContent: {
    flex: 1,
  },
  localStorageTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  localStorageUsage: {
    color: '#BBBBBB',
    fontSize: 14,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: '#4a4a4a',
    borderRadius: 2.5,
    width: '80%',
  },
  progressBarFill: {
    width: '0%', // Placeholder for now
    height: '100%',
    backgroundColor: '#FF4500',
    borderRadius: 2.5,
  },
  allocateButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  allocateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  featuresGrid: {
    paddingHorizontal: 7.5, // Half of card margin
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default InteractiveScreen;
