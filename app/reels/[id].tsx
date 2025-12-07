import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { API_BASE_URL, API_KEY } from '../../constants/api';
import { getAccentFromPosterPath } from '../../constants/theme';

type VideoResult = {
  key: string;
  site: string;
  type: string;
  name: string;
};

type ReelItem = { id: number; mediaType: string; title: string; posterPath?: string | null };

const { height } = Dimensions.get('window');

const ReelPlayerScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { id, mediaType, title, list } = params;

  const queue: ReelItem[] = useMemo(() => {
    if (typeof list === 'string') {
      try {
        const parsed = JSON.parse(decodeURIComponent(list));
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 30).map((item) => ({
            id: Number(item.id),
            mediaType: (item.mediaType || 'movie') as string,
            title: item.title || 'Reel',
            posterPath: item.posterPath || item.poster_path || null,
          }));
        }
      } catch (e) {
        console.warn('Failed to parse reel queue', e);
      }
    }

    if (id && mediaType) {
      return [
        {
          id: Number(id),
          mediaType: mediaType as string,
          title: (title as string) || 'Reel',
        },
      ];
    }

    return [];
  }, [id, mediaType, title, list]);

  const initialIndex = useMemo(() => {
    const idx = queue.findIndex((item) => String(item.id) === String(id));
    return idx >= 0 ? idx : 0;
  }, [queue, id]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const listRef = useRef<FlatList<ReelItem> | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      const first = viewableItems[0]?.index;
      if (typeof first === 'number') {
        setCurrentIndex(first);
      }
    }
  }).current;

  const currentItem = queue[currentIndex];
  const accentColor = getAccentFromPosterPath(currentItem?.posterPath);

  const openDetails = () => {
    if (!currentItem) return;
    router.replace(`/details/${currentItem.id}?mediaType=${currentItem.mediaType}`);
  };

  return (
    <ScreenWrapper style={styles.wrapper}>
      <LinearGradient
        colors={[accentColor, 'rgba(5,6,15,0.6)']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {currentItem?.title || 'Reel'}
        </Text>
        <TouchableOpacity onPress={openDetails} style={styles.moreButton}>
          <Ionicons name="open-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={queue}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <ReelSlide
            item={item}
            active={index === currentIndex}
            onOpenDetails={openDetails}
            onAutoPlayNext={() => {
              const nextIndex = index + 1;
              if (index === currentIndex && nextIndex < queue.length) {
                setCurrentIndex(nextIndex);
                listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
              }
            }}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
    </ScreenWrapper>
  );
};

const ReelSlide = ({
  item,
  active,
  onOpenDetails,
  onAutoPlayNext,
}: {
  item: ReelItem;
  active: boolean;
  onOpenDetails: () => void;
  onAutoPlayNext: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      setVideoKey(null);
      setPlaying(false);

      try {
        const res = await fetch(
          `${API_BASE_URL}/${item.mediaType}/${item.id}/videos?api_key=${API_KEY}`
        );
        const json = await res.json();
        const results: VideoResult[] = json?.results || [];

        const trailer =
          results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
          results.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
          results.find((v) => v.site === 'YouTube');

        if (!mounted) return;

        if (!trailer?.key) {
          setError('No trailer available for this title.');
          setVideoKey(null);
        } else {
          setVideoKey(trailer.key);
        }
      } catch (e) {
        console.error('Failed to load reel video', e);
        if (mounted) setError('Unable to load trailer. Try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchVideos();
    return () => {
      mounted = false;
    };
  }, [item.id, item.mediaType]);

  useEffect(() => {
    if (active && videoKey && !loading && !error) {
      // Ensure the active reel starts playing as soon as it is ready
      setMuted(true);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }, [active, videoKey, loading, error]);

  const onError = () => {
    Alert.alert('Playback issue', 'Trouble loading the trailer. Redirecting to details.', [
      { text: 'Go to details', onPress: onOpenDetails },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.slide}>
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.metaText}>Loading trailer...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onOpenDetails} style={styles.fallbackBtn}>
            <Text style={styles.fallbackText}>Open details</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && videoKey && (
        <View style={styles.playerFrame}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setMuted((m) => !m)}
          />

          <YoutubePlayer
            ref={playerRef}
            height={height}
            play={playing}
            mute={muted}
            videoId={videoKey}
            forceAndroidAutoplay
            onError={onError}
            onChangeState={(state: string) => {
              // console.log('YT state', state);
              if (state === 'ended') {
                onAutoPlayNext();
              }
            }}
            initialPlayerParams={{
              controls: 0,
              modestbranding: true,
              rel: false,
              showinfo: false,
              playsinline: true,
              loop: true,
              playlist: videoKey || undefined,
              // Some platforms respect this, some ignore it
              // @ts-ignore
              autoplay: 1,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />

          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(5,6,15,0.85)']}
            locations={[0, 0.55, 1]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          <View style={styles.metaOverlay}>
            <Text style={styles.metaTitle} numberOfLines={2}>
              {item.title || 'Reel'}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
              </View>
              <View style={[styles.tag, styles.accentTag]}>
                <Text style={styles.tagText}>Trailer</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'black',
  },
  header: {
    position: 'absolute',
    top: 18,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  moreButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginHorizontal: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  playerFrame: {
    flex: 1,
    marginTop: 0,
    overflow: 'hidden',
    borderRadius: 0,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  metaOverlay: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    gap: 12,
  },
  metaTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  accentTag: {
    backgroundColor: 'rgba(229,9,20,0.25)',
    borderColor: 'rgba(229,9,20,0.45)',
  },
  tagText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  metaText: {
    color: '#e6e6e6',
    marginTop: 12,
  },
  errorText: {
    color: '#ffb3b3',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 12,
  },
  fallbackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#e50914',
    borderRadius: 12,
  },
  fallbackText: {
    color: '#fff',
    fontWeight: '700',
  },
  slide: {
    height,
  },
});

export default ReelPlayerScreen;
