import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import FeatureCard from '../components/interactive/FeatureCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ACCENT = '#E50914';

const InteractiveScreen = () => {
  const router = useRouter();
  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#2b0000', '#120206', '#06060a']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.header}>
              <Text style={{ color: ACCENT }}>• </Text>
              Interactive Features
            </Text>

            <TouchableOpacity style={styles.iconBtn}>
              <MaterialCommunityIcons name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Local Storage Usage Card (glassy + skeleton-like placeholders) */}
          <View style={styles.sectionWrapper}>
            <BlurView intensity={60} tint="dark" style={styles.glassCard}>
              <View style={styles.localStorageRow}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="sd" size={36} color={ACCENT} />
                </View>

                <View style={styles.localStorageTextContent}>
                  <Text style={styles.localStorageTitle}>Local Storage Usage</Text>
                  <Text style={styles.localStorageUsage}>34.2 MB • 12 files</Text>

                  {/* small skeleton like the home screen */}
                  <View style={styles.skelLineLarge} />
                  <View style={{ height: 8 }} />

                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: '36%' }]} />
                  </View>
                </View>

                <TouchableOpacity style={styles.allocateButton}>
                  <Text style={styles.allocateButtonText}>Allocate</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Features grid placed in glass panels to visually match Home */}
          <View style={styles.sectionWrapper}>
            <BlurView intensity={48} tint="dark" style={styles.glassCard}>
              <View style={styles.featuresGrid}>
                <View style={styles.row}>
                  <FeatureCard
                    iconName="account-group"
                    title="Watch Party"
                    description="Host live watch parties with synchronized playback and in-app chat."
                    onPress={() => router.push('/watch-party')}
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
                  <View style={{ flex: 1, marginHorizontal: 7.5 }} />
                </View>

                {/* Social Reactions - larger card separated visually */}
                <View style={{ marginTop: 12 }}>
                  <FeatureCard
                    iconName="emoticon-happy"
                    title="Social Reactions"
                    description="Share live reactions during movies with friends and other viewers."
                    isLarge={true}
                    onPress={() => router.push('/social-feed')}
                  />
                </View>
              </View>
            </BlurView>
          </View>

          {/* bottom spacing */}
          <View style={{ height: 90 }} />
        </ScrollView>
      </LinearGradient>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingHorizontal: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },

  sectionWrapper: {
    marginBottom: 14,
  },

  // Glass card matching HomeScreen / CategoriesScreen
  glassCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // Local storage row
  localStorageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(229,9,20,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.12)',
  },
  localStorageTextContent: {
    flex: 1,
  },
  localStorageTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  localStorageUsage: {
    color: '#CFCFCF',
    fontSize: 12,
    marginBottom: 8,
  },

  // skeleton-like lines that match home placeholders
  skelLineLarge: {
    height: 10,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    width: '80%',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },

  allocateButton: {
    marginLeft: 12,
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: ACCENT,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  allocateButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Features grid
  featuresGrid: {
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});

export default InteractiveScreen;
