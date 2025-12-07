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
import PulsePlaceholder from './PulsePlaceholder';

const { width } = Dimensions.get('window');
const BACKDROP_HEIGHT = 460;

interface Props {
  movie: Media | null;
  isLoading: boolean;
  onWatchTrailer: () => void;
  onBack: () => void;
  onAddToMyList: () => void;
  onPlayMovie: () => void; // New prop for playing movie via p-stream
  isPStreamPlaying: boolean; // New prop to indicate if p-stream is playing
  accentColor: string;
}

const MovieHeader: React.FC<Props> = ({
  movie,
  isLoading,
  onWatchTrailer,
  onBack,
  onAddToMyList,
  onPlayMovie,
  isPStreamPlaying,
  accentColor,
}) => {
  const backdropUri = movie ? `${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}` : null;

  return (
    <View style={styles.backdropContainer}>
      <LinearGradient
        colors={[accentColor, '#0a0f1f', '#05060f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.baseGradient}
        pointerEvents="none"
      />
      {backdropUri ? (
        <Image source={{ uri: backdropUri }} style={styles.backdropImage} />
      ) : (
        <PulsePlaceholder style={styles.backdropPlaceholder} />
      )}
      <LinearGradient
        colors={['rgba(5,6,15,0.12)', 'rgba(5,6,15,0.6)', 'rgba(5,6,15,0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdropTint}
        pointerEvents="none"
      />

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
        colors={['rgba(5,6,15,0)', 'rgba(5,6,15,0.6)', '#05060f']}
        locations={[0, 0.5, 1]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      <TouchableOpacity
        style={styles.mainPlayButton}
        onPress={isPStreamPlaying ? onBack : onPlayMovie}
        accessibilityLabel={isPStreamPlaying ? 'Close player' : 'Play movie'}
      >
        <View style={styles.mainPlayOuter}>
          <FontAwesome
            name={isPStreamPlaying ? 'compress' : 'play-circle'}
            size={66}
            color="rgba(255,255,255,0.96)"
          />
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtonsContainer}>
        {[
          { key: 'trailer', icon: 'play', label: 'Trailer' },
          { key: 'my-list', icon: 'plus', label: 'My List' },
          { key: 'download', icon: 'download', label: 'Download' },
          { key: 'rate', icon: 'star', label: 'Rate' },
        ].map((btn, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionItem}
            onPress={() => {
              if (btn.key === 'my-list') {
                onAddToMyList();
              } else if (btn.key === 'trailer') {
                onWatchTrailer();
              }
            }}
          >
            <FontAwesome name={btn.icon as any} size={18} color="white" />
            <Text style={styles.actionLabel}>{btn.label}</Text>
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
    backgroundColor: '#05060f',
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
  baseGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'rgba(0,0,0,0.18)',
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
    backgroundColor: 'rgba(5,6,15,0.6)',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 6,
    zIndex: 15,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  actionLabel: {
    color: '#f5f5f5',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MovieHeader;
