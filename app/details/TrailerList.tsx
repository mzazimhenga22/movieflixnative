import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PulsePlaceholder from './PulsePlaceholder'; // Corrected import

interface Video {
  key: string;
  name: string;
}

interface Props {
  trailers: Video[];
  isLoading: boolean;
  onWatchTrailer: (key: string) => void;
}

const TrailerList: React.FC<Props> = ({ trailers, isLoading, onWatchTrailer }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trailers</Text>

      <View style={styles.roundedCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, idx) => (
              <View key={idx} style={styles.trailerCard}>
                <PulsePlaceholder style={styles.trailerThumbPlaceholder} />
              </View>
            ))
          ) : (
            trailers.map((video) => (
              <TouchableOpacity
                key={video.key}
                style={styles.trailerCard}
                onPress={() => onWatchTrailer(video.key)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg` }}
                  style={styles.trailerThumbnail}
                />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.trailerGradient} />
                <FontAwesome name="play-circle" size={34} color="white" style={styles.trailerPlayIcon} />
                <Text style={styles.trailerTitle} numberOfLines={1} ellipsizeMode="tail">
                  {video.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    paddingHorizontal:18
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  roundedCard: {
    backgroundColor: 'rgba(20,20,22,0.6)',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  row: {
    paddingVertical: 6,
  },
  trailerCard: {
    width: 220,
    height: 130,
    marginRight: 14,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  trailerThumbnail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  trailerThumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  trailerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  trailerPlayIcon: {
    position: 'absolute',
    alignSelf: 'center',
    top: '36%',
    opacity: 1,
  },
  trailerTitle: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TrailerList;
