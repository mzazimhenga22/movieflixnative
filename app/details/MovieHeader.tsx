import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGE_BASE_URL } from '../../constants/api';
import { Media } from '../../types';
import { PulsePlaceholder } from './PulsePlaceholder';

const { width } = Dimensions.get('window');
const BACKDROP_HEIGHT = 460;

interface Props {
  movie: Media | null;
  isLoading: boolean;
  onWatchTrailer: () => void;
  onBack: () => void;
}

const MovieHeader: React.FC<Props> = ({ movie, isLoading, onWatchTrailer, onBack }) => {
  const backdropUri = movie ? `${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}` : null;

  return (
    <View style={styles.backdropContainer}>
      {backdropUri ? (
        <Image source={{ uri: backdropUri }} style={styles.backdropImage} />
      ) : (
        <PulsePlaceholder style={styles.backdropPlaceholder} />
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>

        {isLoading ? (
          <PulsePlaceholder style={styles.titlePlaceholderSmall} />
        ) : (
          <Text style={styles.topTitle} numberOfLines={1} ellipsizeMode="tail">
            {movie?.title || movie?.name}
          </Text>
        )}
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', '#0f0f10']}
        locations={[0, 0.55, 1]}
        style={styles.gradientOverlay}
      />

      <TouchableOpacity style={styles.mainPlayButton} onPress={onWatchTrailer}>
        <View style={styles.mainPlayOuter}>
          <FontAwesome name="play-circle" size={66} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtonsContainer}>
        {['share-alt', 'plus', 'download', 'star'].map((name, i) => (
          <TouchableOpacity key={i} style={styles.actionItem}>
            <FontAwesome name={name as any} size={20} color="white" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdropContainer: {
    width: '100%',
    height: BACKDROP_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  backdropPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 22,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 0,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 6,
    borderRadius: 18,
  },
  topTitle: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: '600',
    zIndex: 25,
    textAlign: 'center',
  },
  titlePlaceholderSmall: {
    width: 140,
    height: 18,
    borderRadius: 6,
  },
  mainPlayButton: {
    position: 'absolute',
    zIndex: 10,
    alignSelf: 'center',
  },
  mainPlayOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'center',
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 18,
    left: '7%',
    right: '7%',
    width: '86%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(75, 0, 0, 0.45)',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 6,
    zIndex: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});

export default MovieHeader;