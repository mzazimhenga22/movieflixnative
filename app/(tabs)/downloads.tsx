import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../components/ScreenWrapper';
import { IMAGE_BASE_URL } from '../../constants/api';
import { getAccentFromPosterPath } from '../../constants/theme';
import { DownloadEvent, getActiveDownloads, subscribeToDownloadEvents } from '../../lib/downloadEvents';
import { getProfileScopedKey } from '../../lib/profileStorage';
import { DownloadItem } from '../../types';
import { useAccent } from '../components/AccentContext';

type GroupedDownloads = {
  type: 'movie' | 'show';
  title: string;
  items: DownloadItem[];
};

const DownloadsScreen = () => {
  const { setAccentColor } = useAccent();
  const router = useRouter();
  const accentColor = getAccentFromPosterPath('/downloads/accent') || '#150a13';
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (accentColor) {
      setAccentColor(accentColor);
    }
  }, [accentColor, setAccentColor]);

  const loadDownloads = useCallback(async () => {
    try {
      const key = await getProfileScopedKey('downloads');
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setDownloads(JSON.parse(stored) as DownloadItem[]);
      } else {
        setDownloads([]);
      }
    } catch (err) {
      console.error('Failed to load downloads', err);
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadDownloads();
    }, [loadDownloads])
  );

  const handleDownloadEvent = useCallback(
    (event: DownloadEvent) => {
      setActiveDownloads((prev) => {
        const filtered = prev.filter((entry) => entry.sessionId !== event.sessionId);
        if (event.status === 'completed' || event.status === 'error') {
          return filtered;
        }
        return [...filtered, event];
      });
      if (event.status === 'completed' || event.status === 'error') {
        loadDownloads();
      }
    },
    [loadDownloads]
  );

  useEffect(() => {
    setActiveDownloads(getActiveDownloads());
    const unsubscribe = subscribeToDownloadEvents(handleDownloadEvent);
    return unsubscribe;
  }, [handleDownloadEvent]);

  const formatBytes = useCallback((bytes?: number) => {
    if (!bytes || bytes <= 0) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  const handlePlay = useCallback(
    (item: DownloadItem) => {
      router.push({
        pathname: '/video-player',
        params: {
          title: item.title,
          videoUrl: item.localUri,
          mediaType: item.mediaType,
          tmdbId: item.mediaId ? item.mediaId.toString() : undefined,
          releaseYear: item.releaseDate ? item.releaseDate.slice(0, 4) : undefined,
          streamType: item.downloadType === 'hls' ? 'hls' : undefined,
        },
      });
    },
    [router]
  );

  const removeDownload = useCallback(async (item: DownloadItem) => {
    try {
      const target = item.containerPath ?? item.localUri;
      await FileSystem.deleteAsync(target, { idempotent: true });
    } catch (err) {
      console.warn('Failed to delete file', err);
    }
    setDownloads((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      const key = await getProfileScopedKey('downloads');
      const stored = await AsyncStorage.getItem(key);
      const existing: DownloadItem[] = stored ? JSON.parse(stored) : [];
      const next = existing.filter((entry) => entry.id !== item.id);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to update downloads cache', err);
    }
  }, []);

  const confirmDelete = useCallback(
    (item: DownloadItem) => {
      Alert.alert(
        'Remove download?',
        `${item.title} will be deleted from this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void removeDownload(item);
            },
          },
        ],
      );
    },
    [removeDownload]
  );

  // --- Group TV shows ---
  const groupedDownloads: GroupedDownloads[] = [];
  const showMap = new Map<string, DownloadItem[]>();

  downloads.forEach((item) => {
    if (item.mediaType === 'tv') {
      const key = item.title || 'Untitled Show';
      const arr = showMap.get(key) || [];
      arr.push(item);
      showMap.set(key, arr);
    } else {
      groupedDownloads.push({ type: 'movie', title: item.title, items: [item] });
    }
  });

  showMap.forEach((episodes, title) => {
    groupedDownloads.push({ type: 'show', title, items: episodes });
  });

  const renderDownloadItem = (item: DownloadItem) => {
    const subtitleParts = [
      item.mediaType === 'tv' ? 'Episode' : 'Movie',
      item.seasonNumber && item.episodeNumber
        ? `S${String(item.seasonNumber).padStart(2, '0')}E${String(item.episodeNumber).padStart(2, '0')}`
        : null,
      item.runtimeMinutes ? `${item.runtimeMinutes}m` : null,
      formatBytes(item.bytesWritten),
    ].filter(Boolean);
    const subtitle = subtitleParts.join(' • ');
    const downloadedAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null;

    return (
      <View style={styles.downloadCard}>
        <TouchableOpacity onPress={() => handlePlay(item)} style={styles.posterWrap}>
          {item.posterPath ? (
            <Image source={{ uri: `${IMAGE_BASE_URL}${item.posterPath}` }} style={styles.poster} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="download" size={24} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.downloadMeta}>
          <Text style={styles.downloadTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {subtitle ? <Text style={styles.downloadSubtitle}>{subtitle}</Text> : null}
          {item.overview ? (
            <Text style={styles.downloadOverview} numberOfLines={2}>
              {item.overview}
            </Text>
          ) : null}
          {downloadedAt ? <Text style={styles.downloadTimestamp}>Saved {downloadedAt}</Text> : null}
          <View style={styles.downloadActions}>
            <TouchableOpacity style={styles.downloadAction} onPress={() => handlePlay(item)}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.downloadActionText}>Watch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadAction, styles.deleteButton]}
              onPress={() => confirmDelete(item)}
            >
              <Ionicons name="trash" size={16} color="#ff6b6b" />
              <Text style={[styles.downloadActionText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderGroup = ({ item }: { item: GroupedDownloads }) => {
    if (item.type === 'movie') {
      return renderDownloadItem(item.items[0]);
    }

    // TV show folder
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.headerTitle, { fontSize: 18, marginBottom: 8, color: '#fff' }]}>{item.title}</Text>
        {item.items.map((episode) => (
          <View key={episode.id} style={{ marginBottom: 8 }}>
            {renderDownloadItem(episode)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[accentColor, '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      />
      <LinearGradient
        colors={['rgba(125,216,255,0.2)', 'rgba(255,255,255,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bgOrbPrimary}
      />
      <LinearGradient
        colors={['rgba(113,0,255,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.bgOrbSecondary}
      />

      <View style={[styles.container, { paddingBottom: 24 + (insets.bottom || 0) + 96 }]}> 
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={['#e50914', '#b20710']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGlow}
          />
          <View style={styles.headerCard}>
            <View style={styles.headerTitleRow}>
              <View style={styles.accentDot} />
              <View>
                <Text style={styles.headerEyebrow}>Offline shelf</Text>
                <Text style={styles.headerTitle}>Downloads</Text>
              </View>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {downloads.length > 0 ? `${downloads.length} saved` : 'Synced'}
                </Text>
              </View>
              <View style={[styles.pill, styles.pillGhost]}>
                <Text style={styles.pillText}>HD ready</Text>
              </View>
            </View>
          </View>
        </View>

        {activeDownloads.length > 0 && (
          <View style={styles.activeDownloadsCard}>
            <Text style={styles.activeDownloadsTitle}>Active downloads</Text>
            {activeDownloads.map((item) => {
              const ratio = Math.min(1, Math.max(0, item.progress ?? 0));
              return (
                <View key={item.sessionId} style={styles.activeDownloadRow}>
                  <View style={styles.activeDownloadMeta}>
                    <View style={styles.activeDownloadTextBlock}>
                      <Text style={styles.activeDownloadName} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.activeDownloadSubtitle}>
                        {item.subtitle ?? (item.status === 'preparing' ? 'Preparing...' : 'Downloading')}
                      </Text>
                    </View>
                    <Text style={styles.activeDownloadPercent}>
                      {item.progress != null ? `${Math.round(ratio * 100)}%` : '...'}
                    </Text>
                  </View>
                  <View style={styles.activeDownloadProgress}>
                    <View
                      style={[
                        styles.activeDownloadProgressFill,
                        { width: `${ratio * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {downloads.length === 0 ? (
          <View style={styles.glassCard}>
            <LinearGradient
              colors={['rgba(229,9,20,0.22)', 'rgba(255,255,255,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlight}
            />
            <Text style={styles.title}>{loading ? 'Checking downloads...' : 'Nothing saved yet'}</Text>
            <Text style={styles.subtitle}>
              {loading
                ? 'Give us a moment while we look for offline titles.'
                : 'Grab movies and shows to watch offline. They will land here.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedDownloads}
            keyExtractor={(item, idx) => item.title + idx}
            renderItem={renderGroup}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.downloadsList,
              { paddingBottom: Math.max(120, 40) + (insets.bottom || 0) },
            ]}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};
const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -60,
    left: -40,
    opacity: 0.6,
    transform: [{ rotate: '15deg' }],
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -90,
    right: -20,
    opacity: 0.55,
    transform: [{ rotate: '-12deg' }],
  },
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
    gap: 16,
  },
  headerWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  headerCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#fefefe',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  glassCard: {
    width: '100%',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  downloadsList: {
    paddingBottom: 40,
  },
  activeDownloadsCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(5,6,15,0.78)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  activeDownloadsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  activeDownloadRow: {
    marginBottom: 12,
  },
  activeDownloadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeDownloadTextBlock: {
    flex: 1,
    flexDirection: 'column',
  },
  activeDownloadName: {
    flex: 1,
    marginRight: 10,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeDownloadSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
  },
  activeDownloadPercent: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginBottom: 4,
  },
  activeDownloadProgress: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  activeDownloadProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#e50914',
  },
  downloadCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(5,6,15,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 16,
    overflow: 'hidden',
  },
  posterWrap: {
    width: 110,
  },
  poster: {
    width: 110,
    height: 165,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  posterPlaceholder: {
    width: 110,
    height: 165,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  downloadMeta: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  downloadTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  downloadSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  downloadOverview: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    lineHeight: 16,
  },
  downloadTimestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  downloadActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  downloadAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  downloadActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,107,107,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.4)',
  },
  deleteButtonText: {
    color: '#ffb0b0',
  },
  title: {
    color: '#fefefe',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e4e6f0',
    fontSize: 14,
    lineHeight: 20,
  },
});


export default DownloadsScreen;
