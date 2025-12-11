import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime: number;
  still_path: string | null;
  season_number?: number;
}

interface Season {
  id: number;
  name: string;
  season_number?: number;
  episodes: Episode[];
}

interface EpisodeListProps {
  seasons: Season[];
  onPlayEpisode?: (episode: Episode, season: Season) => void;
  disabled?: boolean;
}

const EpisodeList: React.FC<EpisodeListProps> = ({ seasons, onPlayEpisode, disabled }) => {
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(seasons.length > 0 ? seasons[0] : null);

  const handleSeasonChange = (season: Season) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSeason(season);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seasons & Episodes</Text>
      <View style={styles.dropdownContainer}>
        {seasons.map((season) => (
          <TouchableOpacity
            key={season.id}
            style={[
              styles.dropdownButton,
              selectedSeason?.id === season.id && styles.dropdownButtonSelected,
            ]}
            onPress={() => handleSeasonChange(season)}
          >
            <Text style={styles.dropdownButtonText}>{season.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedSeason && (
        <View style={styles.episodeListContainer}>
          {selectedSeason.episodes.map((episode) => {
            const posterUrl = episode.still_path
              ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
              : 'https://via.placeholder.com/130x75?text=No+Image';
            return (
              <View key={episode.id} style={styles.episodeCard}>
                <Image source={{ uri: posterUrl }} style={styles.episodePoster} />
                <View style={styles.episodeDetails}>
                  <View style={styles.episodeHeader}>
                    <Text style={styles.episodeName} numberOfLines={1}>
                      {episode.episode_number}. {episode.name}
                    </Text>
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => selectedSeason && onPlayEpisode?.(episode, selectedSeason)}
                    >
                      <FontAwesome
                        name="play-circle"
                        size={28}
                        color={disabled ? 'rgba(255,255,255,0.4)' : 'white'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.episodeOverview} numberOfLines={2}>
                    {episode.overview}
                  </Text>
                  <Text style={styles.episodeRuntime}>{episode.runtime} min</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dropdownContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dropdownButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 10,
  },
  dropdownButtonSelected: {
    backgroundColor: 'red',
  },
  dropdownButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  episodeListContainer: {
    marginTop: 10,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  episodePoster: {
    width: 130,
    height: 75,
    backgroundColor: '#222',
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  episodeDetails: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  episodeName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  episodeOverview: {
    color: '#ccc',
    fontSize: 12,
    marginVertical: 4,
  },
  episodeRuntime: {
    color: '#ccc',
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default EpisodeList;
