import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../hooks/use-user';
import { createWatchParty, tryJoinWatchParty, type WatchParty } from '@/lib/watchparty/controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMAGE_BASE_URL } from '../../constants/api';
import { getAccentFromPosterPath } from '../../constants/theme';
import type { Media } from '../../types';
import { useAccent } from '../components/AccentContext';
import { getProfileScopedKey } from '../../lib/profileStorage';

const DEFAULT_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const WatchPartyScreen = () => {
  const router = useRouter();
  const { user } = useUser();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [myList, setMyList] = useState<Media[]>([]);
  const [selected, setSelected] = useState<Media | null>(null);
  const [currentParty, setCurrentParty] = useState<WatchParty | null>(null);
  const { accentColor, setAccentColor } = useAccent();
  const derivedAccent = useMemo(
    () => getAccentFromPosterPath(selected?.poster_path ?? myList[0]?.poster_path),
    [selected?.poster_path, myList],
  );

  useEffect(() => {
    if (derivedAccent) {
      setAccentColor(derivedAccent);
    }
  }, [derivedAccent, setAccentColor]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadList = async () => {
        try {
          const key = await getProfileScopedKey('myList');
          const stored = await AsyncStorage.getItem(key);
          if (!isActive) return;
          const parsed: Media[] = stored ? JSON.parse(stored) : [];
          setMyList(parsed);
          setSelected(parsed[0] ?? null);
        } catch (err) {
          if (isActive) {
            console.warn('Failed to load My List for watch party', err);
            setMyList([]);
            setSelected(null);
          }
        }
      };

      loadList();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleCreateParty = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to start a watch party.');
      return;
    }

    if (!selected) {
      Alert.alert('Pick a movie', 'Select a movie from your list to start the party.');
      return;
    }

    try {
      setBusy(true);
      const videoUrl = DEFAULT_VIDEO_URL; // TODO: map selected to a real playback URL
      const party = await createWatchParty(
        user.uid,
        videoUrl,
        selected?.title || selected?.name || null,
        selected?.media_type || null,
      );
      setCurrentParty(party);

      Alert.alert(
        'Watch Party Created',
        `Share this 6-digit code with your friends so they can join:\n\n${party.code}`,
        [
          {
            text: 'Start Watching',
            onPress: () =>
              router.push({
                pathname: '/video-player',
                params: {
                  roomCode: party.code,
                  videoUrl: party.videoUrl,
                  title: party.title || selected?.title || selected?.name || 'Watch Party',
                  mediaType: party.mediaType || selected?.media_type || 'movie',
                },
              }),
          },
        ]
      );
    } catch (err) {
      console.warn('Failed to create watch party', err);
      Alert.alert('Error', 'Unable to create watch party. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinParty = async () => {
    const trimmed = joinCode.trim();
    if (trimmed.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit party code.');
      return;
    }

    try {
      setBusy(true);
      const { party, status } = await tryJoinWatchParty(trimmed);

      if (status === 'not_found') {
        Alert.alert('Invalid code', 'We couldn’t find a watch party with that code. Double-check and try again.');
        return;
      }

      if (status === 'expired') {
        Alert.alert('Party expired', 'This watch party has expired. Ask your friend to create a new one.');
        return;
      }

      if (!party) {
        Alert.alert('Unable to join', 'Something went wrong joining this watch party.');
        return;
      }

      if (status === 'closed') {
        Alert.alert('Waiting for host', 'The host has not opened this watch party yet. Ask them to start the movie.');
        return;
      }

      if (status === 'full' || party.participantsCount >= party.maxParticipants) {
        Alert.alert(
          'Party is full',
          'This watch party has reached the free limit of viewers. Upgrade to Premium to host or join larger parties.'
        );
        return;
      }

      router.push({
        pathname: '/video-player',
        params: {
          roomCode: party.code,
          videoUrl: party.videoUrl,
          title: party.title || selected?.title || selected?.name || 'Watch Party',
          mediaType: party.mediaType || selected?.media_type || 'movie',
        },
      });
    } catch (err) {
      console.warn('Failed to join watch party', err);
      Alert.alert('Error', 'Unable to join this watch party. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[accentColor, '#0b0511', '#040406']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Watch Party</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start a Watch Party</Text>
          <Text style={styles.cardSubtitle}>
            Pick a movie, create a room and share a 6-digit code with your friends. Free parties support up to 4 viewers. Upgrade to Premium for larger rooms.
          </Text>
          {currentParty && (
            <View style={styles.codeBanner}>
              <Text style={styles.codeBannerLabel}>Your party code</Text>
              <Text style={styles.codeBannerValue}>{currentParty.code}</Text>
            </View>
          )}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Choose from your list</Text>
            <FlatList
              horizontal
              data={myList}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listRow}
              renderItem={({ item }) => {
                const isActive = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    style={[styles.movieCard, isActive && styles.movieCardActive]}
                  >
                    <Image
                      source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                      style={styles.poster}
                    />
                    <Text
                      style={styles.movieLabel}
                      numberOfLines={1}
                    >
                      {item.title || item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  Add movies to “My List” to start watch parties with them.
                </Text>
              }
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled, { backgroundColor: accentColor }]}
            onPress={handleCreateParty}
            disabled={busy}
          >
            <Ionicons name="play-circle" size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Create Party</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join with Code</Text>
          <Text style={styles.cardSubtitle}>
            Enter the 6-digit code from your friend. Codes expire after a while, and rooms can fill up once they hit the free viewer limit.
          </Text>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={6}
            keyboardType="number-pad"
            placeholder="123456"
            placeholderTextColor="#666"
            style={styles.codeInput}
          />
          <TouchableOpacity
            style={[styles.secondaryButton, busy && styles.disabled]}
            onPress={handleJoinParty}
            disabled={busy}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.secondaryButtonText}>Join Party</Text>
          </TouchableOpacity>

          <View style={[styles.premiumUpsell, { borderColor: accentColor }]}>
            <Text style={styles.premiumTitle}>Need bigger rooms?</Text>
            <Text style={styles.premiumSubtitle}>
              Premium members can host larger watch parties with more friends and exclusive features.
            </Text>
              <TouchableOpacity
                style={[styles.premiumButton, { backgroundColor: accentColor }]}
                onPress={() => router.push('/premium?source=watchparty')}
              >
              <Text style={styles.premiumButtonText}>See Premium options</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: 'rgba(8,8,14,0.68)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#AAAAAA',
    fontSize: 13,
    marginBottom: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#262626',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  codeInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: '#101010',
  },
  disabled: {
    opacity: 0.5,
  },
  listSection: {
    marginTop: 8,
    marginBottom: 14,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  listRow: {
    paddingVertical: 4,
  },
  movieCard: {
    width: 90,
    marginRight: 10,
  },
  movieCardActive: {
    transform: [{ scale: 1.03 }],
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  movieLabel: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  emptyListText: {
    color: '#888888',
    fontSize: 12,
  },
  codeBanner: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  codeBannerLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    marginBottom: 2,
  },
  codeBannerValue: {
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '600',
  },
  premiumUpsell: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#111015',
    borderWidth: 1,
  },
  premiumTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  premiumSubtitle: {
    color: '#BBBBBB',
    fontSize: 12,
    marginBottom: 8,
  },
  premiumButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WatchPartyScreen;
