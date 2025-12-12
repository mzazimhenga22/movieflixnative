import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { IMAGE_BASE_URL } from '../../../constants/api';
import { firestore } from '../../../constants/firebase';
import { useUser } from '../../../hooks/use-user';
import type { Media } from '../../../types';
import { buildProfileScopedKey, getStoredActiveProfile, type StoredProfile } from '../../../lib/profileStorage';

type RemoteEntry = {
  tmdbId?: number | string;
  title?: string;
  mediaType?: string;
  genres?: number[];
  progress?: number;
  posterPath?: string | null;
  releaseYear?: string | number | null;
  updatedAt?: number;
  id?: string | number;
};

type RemoteMatchProfile = {
  id: string;
  userId?: string;
  profileId?: string;
  profileName?: string;
  avatarColor?: string;
  photoURL?: string | null;
  entries?: RemoteEntry[];
  topGenres?: number[];
  movieCount?: number;
  showCount?: number;
};

type ComputedMatch = {
  id: string;
  profileName: string;
  avatarColor?: string;
  photoURL?: string | null;
  matchScore: number;
  sharedTitles: string[];
  sharedGenres: number[];
  rankLabel: 'Top 5' | 'Top 10' | 'Rising';
  bestPick?: RemoteEntry;
  vibe: 'cinephile' | 'bingewatcher' | 'trendsetter';
};

const MIN_PROGRESS = 0.7;

const GENRE_LABELS: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Doc',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const vibeLabel: Record<ComputedMatch['vibe'], string> = {
  cinephile: 'Cinephile',
  bingewatcher: 'Binge watcher',
  trendsetter: 'Trendsetter',
};

const getGenreName = (id: number) => GENRE_LABELS[id] ?? `Genre ${id}`;

const formatSharedTitles = (titles: string[]) => {
  if (!titles.length) return 'Shared picks ready';
  if (titles.length === 1) return `Both loved ${titles[0]}`;
  if (titles.length === 2) return `Shared: ${titles.join(' & ')}`;
  return `Shared: ${titles.slice(0, 2).join(', ')} +${titles.length - 2}`;
};

const deriveVibe = (profile: RemoteMatchProfile, totalEntries: number): ComputedMatch['vibe'] => {
  const movies = profile.movieCount ?? 0;
  const shows = profile.showCount ?? 0;
  if (movies >= shows * 1.5) return 'cinephile';
  if (shows > movies) return 'bingewatcher';
  return totalEntries > 20 ? 'trendsetter' : 'cinephile';
};

const resolvePosterUri = (path?: string | null) => {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${IMAGE_BASE_URL}${path}`;
};

const computeMatches = (
  localEntries: Media[],
  remoteProfiles: RemoteMatchProfile[],
  currentUserId?: string,
  currentProfileId?: string,
): ComputedMatch[] => {
  if (localEntries.length === 0) return [];

  const localIds = new Set(
    localEntries.map((entry) => String(entry.id ?? entry.tmdbId ?? entry.title ?? entry.name)),
  );
  const localGenres = new Set<number>();
  localEntries.forEach((entry) => {
    (entry.genre_ids ?? []).forEach((genre) => {
      if (typeof genre === 'number') {
        localGenres.add(genre);
      }
    });
  });
  const baseCount = Math.max(localIds.size, 1);

  const matches: ComputedMatch[] = [];

  remoteProfiles.forEach((profile) => {
    if (!Array.isArray(profile.entries) || profile.entries.length === 0) return;
    if (currentUserId && profile.userId === currentUserId) {
      if (!profile.profileId || profile.profileId === currentProfileId) {
        return;
      }
    }
    const remoteQualified = profile.entries.filter((entry) => (entry.progress ?? 1) >= MIN_PROGRESS);
    if (!remoteQualified.length) return;

    const remoteIds = new Set(
      remoteQualified.map((entry) => String(entry.tmdbId ?? entry.title ?? entry.id)),
    );
    const sharedTitleIds = [...localIds].filter((id) => remoteIds.has(id));

    const remoteGenres = new Set<number>();
    remoteQualified.forEach((entry) => {
      (entry.genres ?? []).forEach((genre) => {
        if (typeof genre === 'number') {
          remoteGenres.add(genre);
        }
      });
    });
    const sharedGenreIds = [...localGenres].filter((genre) => remoteGenres.has(genre));

    if (!sharedTitleIds.length && !sharedGenreIds.length) return;

    const titleOverlap = sharedTitleIds.length / Math.max(baseCount, remoteIds.size || 1);
    const genreOverlap =
      sharedGenreIds.length / Math.max(localGenres.size || 1, remoteGenres.size || 1);
    const volumeBonus = Math.min(0.15, (remoteQualified.length || 1) / 60);
    const rawScore = Math.min(1, titleOverlap * 0.7 + genreOverlap * 0.3 + volumeBonus);
    const matchScore = Math.round(rawScore * 100);
    if (matchScore < 20) return;

    const sharedTitles = remoteQualified
      .filter((entry) => sharedTitleIds.includes(String(entry.tmdbId ?? entry.title ?? entry.id)))
      .map((entry) => entry.title || 'Untitled');
    const bestPick = remoteQualified.find((entry) =>
      sharedTitleIds.includes(String(entry.tmdbId ?? entry.title ?? entry.id)),
    );

    matches.push({
      id: profile.id,
      profileName: profile.profileName || 'Movie lover',
      avatarColor: profile.avatarColor,
      photoURL: profile.photoURL ?? null,
      matchScore,
      sharedTitles,
      sharedGenres: sharedGenreIds,
      bestPick,
      rankLabel: 'Rising',
      vibe: deriveVibe(profile, remoteQualified.length),
    });
  });

  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches.map((match, index) => ({
    ...match,
    rankLabel: index < 5 ? 'Top 5' : index < 10 ? 'Top 10' : 'Rising',
  }));
};

export default function MovieMatchView() {
  const router = useRouter();
  const { user } = useUser();
  const [profileMeta, setProfileMeta] = useState<StoredProfile | null>(null);
  const [localQualified, setLocalQualified] = useState<Media[]>([]);
  const [localTotals, setLocalTotals] = useState({ total: 0, qualified: 0 });
  const [activeProfileId, setActiveProfileId] = useState('default');
  const [remoteProfiles, setRemoteProfiles] = useState<RemoteMatchProfile[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [localLoading, setLocalLoading] = useState(true);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);

  const loadLocalHistory = useCallback(async () => {
    setLocalLoading(true);
    try {
      const profile = await getStoredActiveProfile();
      setProfileMeta(profile ?? null);
      const key = buildProfileScopedKey('watchHistory', profile?.id ?? undefined);
      const stored = await AsyncStorage.getItem(key);
      const parsed: Media[] = stored ? JSON.parse(stored) : [];
      const qualified = parsed.filter(
        (entry) => (entry.watchProgress?.progress ?? 0) >= MIN_PROGRESS,
      );
      setActiveProfileId(profile?.id ?? 'default');
      setLocalQualified(qualified);
      setLocalTotals({ total: parsed.length, qualified: qualified.length });
    } catch (err) {
      console.warn('[MovieMatch] failed to load local history', err);
      setLocalQualified([]);
      setLocalTotals({ total: 0, qualified: 0 });
    } finally {
      setLocalLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocalHistory();
    }, [loadLocalHistory]),
  );

  useEffect(() => {
    const profilesRef = collection(firestore, 'movieMatchProfiles');
    const q = query(profilesRef, orderBy('updatedAt', 'desc'), limit(80));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            userId: data.userId,
            profileId: data.profileId,
            profileName: data.profileName,
            avatarColor: data.avatarColor,
            photoURL: data.photoURL,
            entries: Array.isArray(data.entries) ? data.entries : [],
            topGenres: data.topGenres,
            movieCount: data.movieCount,
            showCount: data.showCount,
          } as RemoteMatchProfile;
        });
        setRemoteProfiles(docs);
        setRemoteLoading(false);
        setErrorCopy(null);
      },
      (err) => {
        console.warn('[MovieMatch] failed to fetch profiles', err);
        setRemoteProfiles([]);
        setRemoteLoading(false);
        setErrorCopy('Unable to load community data right now.');
      },
    );

    return () => unsubscribe();
  }, []);

  const matches = useMemo(
    () => computeMatches(localQualified, remoteProfiles, user?.uid ?? undefined, activeProfileId),
    [localQualified, remoteProfiles, user?.uid, activeProfileId],
  );

  const viewerName = profileMeta?.name || user?.displayName || 'You';
  const heroMatch = matches[0] ?? null;
  const topFive = matches.filter((match) => match.rankLabel === 'Top 5');
  const topTen = matches.filter((match) => match.rankLabel === 'Top 10');
  const rising = matches.filter((match) => match.rankLabel === 'Rising');

  const loading = localLoading || remoteLoading;
  const subtitleCopy =
    localTotals.qualified > 0
      ? `${viewerName}, comparing ${localTotals.qualified} of your recent plays with ${
          matches.length || 'new'
        } film fans`
      : 'Watch at least 70% of a title to unlock Movie Match insights.';

  const renderAvatar = (match: ComputedMatch, size = 48) => {
    const initial = match.profileName.charAt(0).toUpperCase();
    if (match.photoURL) {
      return <Image source={{ uri: match.photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View
        style={[
          styles.avatarFallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: match.avatarColor || '#222',
          },
        ]}
      >
        <Text style={styles.avatarFallbackText}>{initial}</Text>
      </View>
    );
  };

  const handleStartParty = () => {
    router.push('/watchparty');
  };

  const renderMatchCard = (match: ComputedMatch) => (
    <TouchableOpacity key={match.id} style={styles.matchCard}>
      <BlurView intensity={30} tint="dark" style={styles.cardContent}>
        <View style={styles.cardAvatarCol}>
          {renderAvatar(match, 48)}
          <View style={[styles.rankChip, match.rankLabel === 'Top 5' ? styles.rankChipTop : match.rankLabel === 'Top 10' ? styles.rankChipTen : styles.rankChipRising]}>
            <Text style={styles.rankChipText}>{match.rankLabel}</Text>
          </View>
        </View>
        <View style={styles.matchInfo}>
          <Text style={styles.matchTitle}>{match.profileName}</Text>
          <Text style={styles.matchSubtitle}>{formatSharedTitles(match.sharedTitles)}</Text>
          <View style={styles.genreChipRow}>
            {match.sharedGenres.slice(0, 3).map((genre) => (
              <View key={`${match.id}-${genre}`} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{getGenreName(genre)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.vibeCopy}>{vibeLabel[match.vibe]}</Text>
        </View>
        <View style={styles.scoreColumn}>
          <Text style={styles.scoreNumber}>{match.matchScore}%</Text>
          <Text style={styles.scoreLabel}>match</Text>
          {match.bestPick?.title ? (
            <Text numberOfLines={1} style={styles.scoreHint}>
              {match.bestPick.title}
            </Text>
          ) : null}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: ComputedMatch[]) => {
    if (!data.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map(renderMatchCard)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(255, 75, 75, 0.15)', 'rgba(255, 75, 75, 0.05)']} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Movie Match</Text>
          <Text style={styles.subtitle}>{subtitleCopy}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Qualified titles</Text>
            <Text style={styles.summaryValue}>{localTotals.qualified}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Top 5 unlocked</Text>
            <Text style={styles.summaryValue}>{topFive.length}</Text>
          </View>
          <TouchableOpacity style={[styles.summaryCard, styles.refreshCard]} onPress={loadLocalHistory}>
            <Ionicons name="refresh" size={18} color="#ff4b4b" />
            <Text style={[styles.summaryLabel, styles.refreshText]}>Refresh tastes</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loaderText}>Analyzing community watch data…</Text>
          </View>
        )}

        {!loading && errorCopy && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorCopy}</Text>
          </View>
        )}

        {!loading && !errorCopy && matches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Finish at least 70% of a movie or episode and we’ll start surfacing viewers with the same taste.
            </Text>
          </View>
        )}

        {!loading && !errorCopy && matches.length > 0 && (
          <>
            {heroMatch && (
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={['rgba(10,10,20,0.9)', 'rgba(255,75,75,0.25)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroContent}>
                  <View style={styles.heroAvatar}>{renderAvatar(heroMatch, 64)}</View>
                  <View style={styles.heroMeta}>
                    <Text style={styles.heroLabel}>Best match</Text>
                    <Text style={styles.heroName}>{heroMatch.profileName}</Text>
                    <Text style={styles.heroScore}>{heroMatch.matchScore}% shared taste</Text>
                    <Text style={styles.heroShared}>{formatSharedTitles(heroMatch.sharedTitles)}</Text>
                    <View style={styles.heroChips}>
                      {heroMatch.sharedGenres.slice(0, 3).map((genre) => (
                        <View key={`hero-${genre}`} style={styles.heroChip}>
                          <Text style={styles.heroChipText}>{getGenreName(genre)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  {heroMatch.bestPick?.posterPath ? (
                    <Image
                      source={{ uri: resolvePosterUri(heroMatch.bestPick.posterPath) }}
                      style={styles.heroPoster}
                    />
                  ) : null}
                </View>
                <View style={styles.heroActions}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleStartParty}>
                    <Text style={styles.primaryBtnText}>Start watch party</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/messaging')}>
                    <Text style={styles.secondaryBtnText}>Ping matches</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.avatarStackRow}>
              {matches.slice(0, 6).map((match, index) => (
                <View key={`stack-${match.id}`} style={[styles.avatarStackItem, { marginLeft: index === 0 ? 0 : -16 }]}>
                  {renderAvatar(match, 40)}
                </View>
              ))}
            </View>

            {renderSection('Top 5 Taste Twins', topFive)}
            {renderSection('Top 10 Vibe Board', topTen)}
            {renderSection('Rising Curators', rising)}
          </>
        )}
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
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  refreshCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,75,75,0.4)',
    backgroundColor: 'rgba(255,75,75,0.08)',
  },
  refreshText: {
    color: '#ff4b4b',
    fontWeight: '700',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loaderText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  errorCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,75,75,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,75,75,0.3)',
  },
  errorText: {
    color: '#ff9b9b',
  },
  emptyState: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroContent: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
  },
  heroAvatar: {
    marginRight: 16,
  },
  heroMeta: {
    flex: 1,
  },
  heroPoster: {
    width: 70,
    height: 105,
    borderRadius: 12,
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  heroName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  heroScore: {
    color: '#ffb3b3',
    marginTop: 2,
    fontWeight: '600',
  },
  heroShared: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  heroChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroChipText: {
    color: '#fff',
    fontSize: 12,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#ff4b4b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  avatarStackRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  avatarStackItem: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#05060f',
  },
  matchCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
  },
  cardAvatarCol: {
    alignItems: 'center',
    marginRight: 12,
  },
  rankChip: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankChipTop: {
    backgroundColor: 'rgba(255,75,75,0.2)',
  },
  rankChipTen: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rankChipRising: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rankChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  matchSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  genreChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  genreChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  genreChipText: {
    color: '#fff',
    fontSize: 11,
  },
  vibeCopy: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  scoreColumn: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  scoreNumber: {
    color: '#ff4b4b',
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  scoreHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontWeight: '700',
  },
});
