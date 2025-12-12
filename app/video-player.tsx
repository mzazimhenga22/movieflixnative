import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
const FALLBACK_EPISODE_IMAGE = 'https://via.placeholder.com/160x90?text=Episode';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  TextInput,
  FlatList,
  Image,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatusSuccess, AVPlaybackSource } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../constants/firebase';
import { useUser } from '../hooks/use-user';
import { usePStream } from '../src/pstream/usePStream';
import type { Media } from '../types';
import { buildProfileScopedKey, getStoredActiveProfile, type StoredProfile } from '../lib/profileStorage';
import { syncMovieMatchProfile } from '../lib/movieMatchSync';

type UpcomingEpisode = {
  id?: number;
  title?: string;
  seasonName?: string;
  episodeNumber?: number;
  overview?: string;
  runtime?: number;
  stillPath?: string | null;
  seasonNumber?: number;
  seasonTmdbId?: number;
  episodeTmdbId?: number;
  seasonEpisodeCount?: number;
};

type CaptionSource = {
  id: string;
  type: 'srt' | 'vtt';
  url: string;
  language?: string;
  display?: string;
};

type PlaybackSource = {
  uri: string;
  headers?: Record<string, string>;
  streamType?: string;
  captions?: CaptionSource[];
};

type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

type AudioTrackOption = {
  id: string;
  name?: string;
  language?: string;
  groupId?: string;
  isDefault?: boolean;
};

type QualityOption = {
  id: string;
  label: string;
  uri: string;
  resolution?: string;
  bandwidth?: number;
};

const SOURCE_BASE_ORDER = [
  'cuevana3',
  'ridomovies',
  'hdrezka',
  'warezcdn',
  'insertunit',
  'soapertv',
  'autoembed',
  'myanime',
  'tugaflix',
  'ee3',
  'fsharetv',
  'vidsrc',
  'zoechip',
  'mp4hydra',
  'embedsu',
  'slidemovies',
  'iosmirror',
  'iosmirrorpv',
  'vidapiclick',
  'coitus',
  'streambox',
  'nunflix',
  '8stream',
  'wecima',
  'animeflv',
  'cinemaos',
  'nepu',
  'pirxcy',
  'vidsrcvip',
  'madplay',
  'rgshows',
  'vidify',
  'zunime',
  'vidnest',
  'animetsu',
  'lookmovie',
  'turbovid',
  'pelisplushd',
  'primewire',
  'movies4f',
  'debrid',
  'cinehdplus',
];

const GENERAL_PRIORITY_SOURCE_IDS = [
  'zoechip',
  'vidsrc',
  'vidsrcvip',
  'warezcdn',
  'lookmovie',
  'pirxcy',
  'insertunit',
  'streambox',
  'cuevana3',
  'primewire',
  'debrid',
  'movies4f',
  'hdrezka',
  'soapertv',
];

const ANIME_PRIORITY_SOURCE_IDS = ['animetsu', 'animeflv', 'zunime', 'myanime'];

const CONTROLS_HIDE_DELAY_PLAYING = 10500;
const CONTROLS_HIDE_DELAY_PAUSED = 16500;
const SURFACE_DOUBLE_TAP_MS = 350;
const buildScrapeDebugTag = (kind: string, title: string) => (__DEV__ ? `[${kind}] ${title}` : undefined);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type SlidableVerticalControlProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: number;
  onValueChange: (val: number) => void;
  onInteraction?: () => void;
  height?: number;
};

const SlidableVerticalControl: React.FC<SlidableVerticalControlProps> = ({
  icon,
  label,
  value,
  onValueChange,
  onInteraction,
  height = 150,
}) => {
  const startValueRef = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startValueRef.current = value;
          onInteraction?.();
        },
        onPanResponderMove: (_evt, gesture) => {
          const delta = -gesture.dy / height;
          const next = clamp01(startValueRef.current + delta);
          onValueChange(next);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [height, onInteraction, onValueChange, value],
  );

  const percentageLabel = `${Math.round(value * 100)}%`;

  return (
    <View {...panResponder.panHandlers}>
      <LinearGradient
        colors={['rgba(32,34,45,0.95)', 'rgba(14,16,26,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.glassCard}
      >
        <View style={styles.glassCardHeader}>
          <MaterialCommunityIcons name={icon} size={22} color="#fff" />
          <Text style={styles.glassCardLabel}>{label}</Text>
        </View>
        <View style={[styles.verticalSliderWrap, { height }]}>
          <View style={styles.sliderValueChip}>
            <Text style={styles.sliderValueText}>{percentageLabel}</Text>
          </View>
          <View pointerEvents="none">
            <Slider
              style={styles.verticalSlider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={value}
              onValueChange={onValueChange}
              minimumTrackTintColor="#ff5f6d"
    if (!tmdbId) return null;
    const numeric = parseInt(tmdbId, 10);
    return Number.isFinite(numeric) ? numeric : null;
  }, [tmdbId]);
  const parsedVideoHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!rawHeaders) return undefined;
    try {
      return JSON.parse(decodeURIComponent(rawHeaders));
    } catch {
      return undefined;
    }
  }, [rawHeaders]);
  const { loading: scrapingInitial, scrape: scrapeInitial } = usePStream();
  const { loading: scrapingEpisode, scrape: scrapeEpisode } = usePStream();
  const isFetchingStream = scrapingInitial || scrapingEpisode;
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(() =>
    passedVideoUrl ? { uri: passedVideoUrl, headers: parsedVideoHeaders, streamType: passedStreamType } : null,
  );
  const [watchHistoryKey, setWatchHistoryKey] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<StoredProfile | null>(null);
  const videoRef = useRef<Video | null>(null);
  const [activeTitle, setActiveTitle] = useState(displayTitle);

  useEffect(() => {
    setActiveTitle(displayTitle);
  }, [displayTitle]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [controlsSession, setControlsSession] = useState(0);
  const lastSurfaceTapRef = useRef(0);

  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const [brightness, setBrightness] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const { user } = useUser();
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; user: string; text: string; createdAt?: any; avatar?: string | null }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [showChat, setShowChat] = useState(true);

  const [videoReloadKey, setVideoReloadKey] = useState(0);
  const watchHistoryEntry = useMemo<Media | null>(() => {
    if (!parsedTmdbNumericId) return null;
    const releaseDateForEntry = rawReleaseDateParam ?? (releaseYear ? `${releaseYear}` : undefined);
    return {
      id: parsedTmdbNumericId,
      title: displayTitle,
      name: displayTitle,
      poster_path: rawPosterPath,
      backdrop_path: rawBackdropPath,
      overview: rawOverview,
      media_type: normalizedMediaType,
      release_date: releaseDateForEntry,
      first_air_date: releaseDateForEntry,
      genre_ids: parsedGenreIds,
      vote_average: voteAverageValue,
      seasonNumber: initialSeasonNumber,
      episodeNumber: initialEpisodeNumber,
      seasonTitle: initialSeasonTitleValue,
    };
  }, [
    parsedTmdbNumericId,
    displayTitle,
    rawPosterPath,
    rawBackdropPath,
    rawOverview,
    normalizedMediaType,
    rawReleaseDateParam,
    releaseYear,
    parsedGenreIds,
    voteAverageValue,
    initialSeasonNumber,
    initialEpisodeNumber,
    initialSeasonTitleValue,
  ]);
  const watchEntryRef = useRef<Media | null>(null);
  const watchHistoryPersistRef = useRef(0);
  const [captionSources, setCaptionSources] = useState<CaptionSource[]>([]);
  const captionCacheRef = useRef<Record<string, CaptionCue[]>>({});
  const captionCuesRef = useRef<CaptionCue[]>([]);
  const captionIndexRef = useRef(0);
  const masterPlaylistRef = useRef<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<'off' | string>('off');
  const [captionLoadingId, setCaptionLoadingId] = useState<string | null>(null);
  const [activeCaptionText, setActiveCaptionText] = useState<string | null>(null);
  const [audioTrackOptions, setAudioTrackOptions] = useState<AudioTrackOption[]>([]);
  const [selectedAudioKey, setSelectedAudioKey] = useState<string>('auto');
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQualityId, setSelectedQualityId] = useState<string>('auto');
  const [qualityOverrideUri, setQualityOverrideUri] = useState<string | null>(null);
  const [qualityLoadingId, setQualityLoadingId] = useState<string | null>(null);
  const [isBufferingVideo, setIsBufferingVideo] = useState(false);
  const [avDrawerOpen, setAvDrawerOpen] = useState(false);
  useEffect(() => {
    watchEntryRef.current = watchHistoryEntry;
  }, [watchHistoryEntry]);
  const bumpControlsLife = useCallback(() => setControlsSession(prev => prev + 1), []);
  const sourceOrder = useMemo(() => buildSourceOrder(preferAnimeSources), [preferAnimeSources]);
  const updateActiveCaption = useCallback(
    (position: number, resetIndex = false) => {
      if (selectedCaptionId === 'off') {
        if (resetIndex || captionCuesRef.current.length) {
          setActiveCaptionText(null);
          captionIndexRef.current = 0;
          captionCuesRef.current = [];
        }
        return;
      }
      const cues = captionCuesRef.current;
      if (!cues.length) {
        setActiveCaptionText(null);
        return;
      }
      let idx = resetIndex ? 0 : captionIndexRef.current;
      if (idx >= cues.length) idx = cues.length - 1;
      while (idx > 0 && position < cues[idx].start) {
        idx -= 1;
      }
      while (idx < cues.length - 1 && position > cues[idx].end) {
        idx += 1;
      }
      const cue = cues[idx];
      if (position >= cue.start && position <= cue.end) {
        setActiveCaptionText((prev) => (prev === cue.text ? prev : cue.text));
      } else {
        setActiveCaptionText((prev) => (prev === null ? prev : null));
      }
      captionIndexRef.current = idx;
    },
    [selectedCaptionId],
  );
  useEffect(() => {
    setPlaybackSource(
      passedVideoUrl ? { uri: passedVideoUrl, headers: parsedVideoHeaders, streamType: passedStreamType } : null,
    );
    setScrapeError(null);
    setCaptionSources([]);
    setSelectedCaptionId('off');
    captionCuesRef.current = [];
    captionCacheRef.current = {};
    setActiveCaptionText(null);
    setAudioTrackOptions([]);
    setSelectedAudioKey('auto');
    setQualityOptions([]);
    setSelectedQualityId('auto');
    setQualityOverrideUri(null);
    setQualityLoadingId(null);
    setVideoReloadKey((prev) => prev + 1);
  }, [passedVideoUrl, parsedVideoHeaders, passedStreamType]);
  useEffect(() => {
    masterPlaylistRef.current = playbackSource?.uri ?? null;
  }, [playbackSource?.uri]);
  useEffect(() => {
    let active = true;
    const syncHistoryKey = async () => {
      try {
        const profile = await getStoredActiveProfile();
        if (!active) return;
        setActiveProfile(profile ?? null);
        setWatchHistoryKey(buildProfileScopedKey('watchHistory', profile?.id ?? undefined));
      } catch {
        if (active) {
          setActiveProfile(null);
          setWatchHistoryKey('watchHistory');
        }
      }
    };
    syncHistoryKey();
    return () => {
      active = false;
    };
  }, []);
  const [episodeQueue, setEpisodeQueue] = useState(upcomingEpisodes);
  useEffect(() => {
    setEpisodeQueue(upcomingEpisodes);
    if (!upcomingEpisodes.length) {
      setEpisodeDrawerOpen(false);
    }
  }, [upcomingEpisodes]);
  useEffect(() => {
    if (playbackSource || !tmdbId || !rawMediaType) return;
    let isCancelled = false;

    const fetchPlaybackFromMetadata = async () => {
      const fallbackYear = releaseYear ?? new Date().getFullYear();
      const mediaTitle = displayTitle || 'Now Playing';
      const normalizedTmdbId = tmdbId || '';
      const normalizedImdbId = imdbId || undefined;
      try {
        setScrapeError(null);
        if (rawMediaType === 'tv') {
          const seasonNumber = Number.isFinite(seasonNumberParam) ? (seasonNumberParam as number) : 1;
          const episodeNumber = Number.isFinite(episodeNumberParam) ? (episodeNumberParam as number) : 1;
          const seasonTitle = seasonTitleParam || `Season ${seasonNumber}`;
          const baseEpisodeCount =
            typeof seasonEpisodeCountParam === 'number' && seasonEpisodeCountParam > 0
              ? seasonEpisodeCountParam
              : undefined;
          const payload = {
            type: 'show',
            title: mediaTitle,
            tmdbId: normalizedTmdbId,
            imdbId: normalizedImdbId,
            releaseYear: fallbackYear,
            season: {
              number: seasonNumber,
              tmdbId: seasonTmdbId ?? '',
              title: seasonTitle,
              ...(baseEpisodeCount ? { episodeCount: baseEpisodeCount } : {}),
            },
            episode: {
              number: episodeNumber,
              tmdbId: episodeTmdbId ?? '',
            },
          } as const;
          console.log('[VideoPlayer] Initial TV scrape payload', payload);
          const debugTag = buildScrapeDebugTag('initial-tv', mediaTitle);
          const playback = await scrapeInitial(payload, { sourceOrder, debugTag });
          if (isCancelled) return;
          setPlaybackSource({
            uri: playback.uri,
            headers: playback.headers,
            streamType: playback.stream?.type,
            captions: playback.stream?.captions,
          });
          setCaptionSources(playback.stream?.captions ?? []);
          setSelectedCaptionId('off');
          captionCacheRef.current = {};
          captionCuesRef.current = [];
          setActiveCaptionText(null);
          setAudioTrackOptions([]);
          setSelectedAudioKey('auto');
          setQualityOptions([]);
          setSelectedQualityId('auto');
          setQualityOverrideUri(null);
          setQualityLoadingId(null);
          setVideoReloadKey((prev) => prev + 1);
          setActiveTitle(
            episodeNumber
              ? `${mediaTitle} • S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
              : mediaTitle,
          );
        } else {
          const payload = {
            type: 'movie',
            title: mediaTitle,
            tmdbId: normalizedTmdbId,
            imdbId: normalizedImdbId,
            releaseYear: fallbackYear,
          } as const;
          console.log('[VideoPlayer] Initial movie scrape payload', payload);
          const debugTag = buildScrapeDebugTag('initial-movie', mediaTitle);
          const playback = await scrapeInitial(payload, { sourceOrder, debugTag });
          if (isCancelled) return;
          setPlaybackSource({
            uri: playback.uri,
            headers: playback.headers,
            streamType: playback.stream?.type,
            captions: playback.stream?.captions,
          });
          setCaptionSources(playback.stream?.captions ?? []);
          setSelectedCaptionId('off');
          captionCacheRef.current = {};
          captionCuesRef.current = [];
          setActiveCaptionText(null);
          setAudioTrackOptions([]);
          setSelectedAudioKey('auto');
          setQualityOptions([]);
          setSelectedQualityId('auto');
          setQualityOverrideUri(null);
          setQualityLoadingId(null);
          setVideoReloadKey((prev) => prev + 1);
          setActiveTitle(mediaTitle);
        }
      } catch (err: any) {
        console.error('[VideoPlayer] Initial scrape failed', err);
        if (isCancelled) return;
        const message = err?.message || 'Unable to load this title.';
        setScrapeError(message);
        Alert.alert('Playback unavailable', message, [
          {
            text: 'Go back',
            onPress: () => router.back(),
            style: 'destructive',
          },
          {
            text: 'Stay',
            style: 'cancel',
          },
        ]);
      }
    };

    fetchPlaybackFromMetadata();
    return () => {
      isCancelled = true;
    };
  }, [
    playbackSource,
    tmdbId,
    rawMediaType,
    releaseYear,
    displayTitle,
    imdbId,
    seasonNumberParam,
    episodeNumberParam,
    seasonTmdbId,
    episodeTmdbId,
    seasonTitleParam,
    seasonEpisodeCountParam,
    scrapeInitial,
    router,
    sourceOrder,
  ]);
  const isHlsSource = useMemo(() => {
    const activeUri = qualityOverrideUri ?? playbackSource?.uri;
    if (!activeUri) return false;
    if (playbackSource?.streamType === 'hls') return true;
    return activeUri.toLowerCase().includes('.m3u8');
  }, [playbackSource, qualityOverrideUri]);
  const videoPlaybackSource: AVPlaybackSource | null = useMemo(() => {
    if (!playbackSource) return null;
    const uri = qualityOverrideUri ?? playbackSource.uri;
    const base: any = {
      uri,
      headers: playbackSource.headers,
    };
    if (isHlsSource) {
      base.overrideFileExtensionAndroid = '.m3u8';
    }
    return base;
  }, [playbackSource, isHlsSource, qualityOverrideUri]);
  const isInitialStreamPending = !playbackSource && !!tmdbId && !!rawMediaType && !scrapeError;
  const shouldShowMovieFlixLoader =
    !!qualityLoadingId ||
    isFetchingStream ||
    isInitialStreamPending ||
    (videoPlaybackSource && isBufferingVideo && !scrapeError);
  let loaderMessage = 'Fetching stream...';
  if (qualityLoadingId) {
    loaderMessage = 'Switching quality...';
  } else if (isFetchingStream) {
    loaderMessage = scrapingEpisode ? 'Loading next episode...' : 'Fetching stream...';
  } else if (isInitialStreamPending) {
    loaderMessage = 'Preparing stream...';
  } else if (videoPlaybackSource && isBufferingVideo) {
    loaderMessage = 'Buffering stream...';
  }
  const isBlockingLoader = Boolean(qualityLoadingId || isFetchingStream || isInitialStreamPending);
  const loaderVariant: 'solid' | 'transparent' = isBlockingLoader ? 'solid' : 'transparent';
  const hasSubtitleOptions = captionSources.length > 0;
  const hasAudioOptions = audioTrackOptions.length > 0;
  const hasQualityOptions = qualityOptions.length > 0;
  const avControlsEnabled = hasSubtitleOptions || hasAudioOptions || hasQualityOptions;

  useEffect(() => {
    if (!avControlsEnabled && avDrawerOpen) {
      setAvDrawerOpen(false);
    }
  }, [avControlsEnabled, avDrawerOpen]);

  useEffect(() => {
    if (!showControls && avDrawerOpen) {
      setAvDrawerOpen(false);
    }
  }, [showControls, avDrawerOpen]);

  useEffect(() => {
    if (!isHlsSource || !playbackSource?.uri) {
      setAudioTrackOptions([]);
      setQualityOptions([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const manifestUrl = masterPlaylistRef.current ?? playbackSource.uri;
    const fetchManifest = async () => {
      try {
        const res = await fetch(manifestUrl, {
          headers: playbackSource.headers,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Manifest request failed (${res.status})`);
        }
        const text = await res.text();
        if (cancelled) return;
        setAudioTrackOptions(parseHlsAudioTracks(text));
        setQualityOptions(parseHlsQualityOptions(text, manifestUrl));
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to parse master manifest', err);
          setAudioTrackOptions([]);
          setQualityOptions([]);
        }
      }
    };

    fetchManifest();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isHlsSource, playbackSource?.uri, playbackSource?.headers]);

  // lock orientation + setup brightness
  useEffect(() => {
    const setup = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );

        await Brightness.requestPermissionsAsync();
        const current = await Brightness.getBrightnessAsync();
        setBrightness(current);
      } catch (e) {
        console.warn('Video setup error', e);
      }
    };

    setup();

    return () => {
      Brightness.restoreSystemBrightnessAsync();
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // apply brightness
  useEffect(() => {
    Brightness.setBrightnessAsync(brightness).catch(() => {});
  }, [brightness]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.setVolumeAsync(volume).catch(() => {});
  }, [volume]);

  // auto-hide controls when playing
  useEffect(() => {
    if (!showControls || episodeDrawerOpen) return;
    const delay = isPlaying ? CONTROLS_HIDE_DELAY_PLAYING : CONTROLS_HIDE_DELAY_PAUSED;
    const timeout = setTimeout(() => setShowControls(false), delay);
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying, episodeDrawerOpen, controlsSession]);

  const persistWatchProgress = useCallback(
    async (
      positionValue: number,
      durationValue: number,
      options: { force?: boolean; markComplete?: boolean } = {},
    ) => {
      if (!watchHistoryKey) return;
      const baseEntry = watchEntryRef.current;
      if (!baseEntry) return;
      if (!durationValue || durationValue <= 0) return;
      const now = Date.now();
      if (!options.force && !options.markComplete) {
        if (now - watchHistoryPersistRef.current < 15000) {
          return;
        }
        watchHistoryPersistRef.current = now;
      } else {
        watchHistoryPersistRef.current = now;
      }
      const progressValue = Math.min(Math.max(positionValue / durationValue, 0), 1);
      const shouldRemove = options.markComplete || progressValue >= 0.985;
      try {
        const raw = await AsyncStorage.getItem(watchHistoryKey);
        const parsed: Media[] = raw ? JSON.parse(raw) : [];
        const filtered = parsed.filter((entry) => entry?.id !== baseEntry.id);
        if (shouldRemove) {
          await AsyncStorage.setItem(watchHistoryKey, JSON.stringify(filtered));
          return;
        }
        const enriched: Media = {
          ...baseEntry,
          watchProgress: {
            positionMillis: positionValue,
            durationMillis: durationValue,
            progress: progressValue,
            updatedAt: now,
          },
        };
        const next = [enriched, ...filtered].slice(0, 40);
        await AsyncStorage.setItem(watchHistoryKey, JSON.stringify(next));
        if (progressValue >= 0.7 && user?.uid) {
          const profileName =
            activeProfile?.name ||
            user.displayName ||
            user.email?.split('@')[0] ||
            'Movie fan';
          const fallbackPhoto = (user as any)?.photoURL ?? null;
          void syncMovieMatchProfile({
            userId: user.uid,
            profileId: activeProfile?.id ?? 'default',
            profileName,
            avatarColor: activeProfile?.avatarColor ?? undefined,
            photoURL: activeProfile?.photoURL ?? fallbackPhoto ?? null,
            entry: {
              tmdbId: enriched.id,
              title: enriched.title || enriched.name || enriched.media_type || 'Now Playing',
              mediaType: enriched.media_type,
              progress: progressValue,
              genres: enriched.genre_ids,
              posterPath: enriched.poster_path ?? enriched.backdrop_path ?? null,
              releaseYear:
                typeof enriched.release_date === 'string'
                  ? enriched.release_date
                  : enriched.first_air_date ?? null,
            },
          });
        }
      } catch (err) {
        console.warn('Failed to update watch history', err);
      }
    },
    [watchHistoryKey, user?.uid, user?.displayName, user?.email, activeProfile?.id, activeProfile?.name, activeProfile?.avatarColor, activeProfile?.photoURL],
  );

  const handleStatusUpdate = (status: AVPlaybackStatusSuccess | any) => {
    if (!status || !status.isLoaded) return;

    setIsPlaying(status.isPlaying ?? false);
    setIsBufferingVideo(status.isBuffering ?? false);

    const currentPosition = status.positionMillis || 0;
    if (!isSeeking) {
      setSeekPosition(currentPosition);
    }

    setPositionMillis(currentPosition);
    updateActiveCaption(currentPosition);

    if (status.durationMillis) {
      setDurationMillis(status.durationMillis);
    }
    const derivedDuration = status.durationMillis ?? durationMillis;
    if (derivedDuration && derivedDuration > 0) {
      void persistWatchProgress(currentPosition, derivedDuration, {
        force: status.didJustFinish,
        markComplete: status.didJustFinish,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (positionMillis > 0 && durationMillis > 0) {
        void persistWatchProgress(positionMillis, durationMillis, { force: true });
      }
    };
  }, [positionMillis, durationMillis, persistWatchProgress]);

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    bumpControlsLife();
    if (isPlaying) {
      await video.pauseAsync();
      setShowControls(true);
    } else {
      await video.playAsync();
    }
  };

  const seekBy = async (deltaMillis: number) => {
    const video = videoRef.current;
    if (!video) return;

    bumpControlsLife();
    const next = Math.max(
      0,
      Math.min(positionMillis + deltaMillis, durationMillis)
    );
    await video.setPositionAsync(next);
    setSeekPosition(next);
  };

  const handleRateToggle = async () => {
    const video = videoRef.current;
    if (!video) return;

    bumpControlsLife();
    // cycle through 1x, 1.5x, 2x
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    await video.setRateAsync(nextRate, true);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentTimeLabel = formatTime(positionMillis);
  const totalTimeLabel = durationMillis ? formatTime(durationMillis) : '0:00';

  useEffect(() => {
    if (!isTvShow) {
      setEpisodeDrawerOpen(false);
    }
  }, [isTvShow]);

  useEffect(() => {
    if (!roomCode) return;

    const messagesRef = collection(firestore, 'watchParties', roomCode, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Array<{ id: string; user: string; text: string; createdAt?: any; avatar?: string | null }> = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        items.push({
          id: docSnap.id,
          user: data.userDisplayName || data.userName || data.user || 'Guest',
          text: data.text || '',
          createdAt: data.createdAt,
          avatar: data.userAvatar || null,
        });
      });
      setChatMessages(items);
    });

    return () => unsub();
  }, [roomCode]);

  const handleSurfacePress = useCallback(() => {
    if (episodeDrawerOpen) return;
    const now = Date.now();
    if (showControls && now - lastSurfaceTapRef.current < SURFACE_DOUBLE_TAP_MS) {
      setShowControls(false);
      return;
    }
    lastSurfaceTapRef.current = now;
    setShowControls(true);
    bumpControlsLife();
  }, [episodeDrawerOpen, showControls, bumpControlsLife]);

  const handleSendChat = async () => {
    if (!roomCode || !chatInput.trim() || chatSending) return;

    const text = chatInput.trim();
    setChatInput('');
    setChatSending(true);

    try {
      const messagesRef = collection(firestore, 'watchParties', roomCode, 'messages');
      await addDoc(messagesRef, {
        text,
        userId: user?.uid ?? null,
        userDisplayName: user?.displayName || user?.email || 'Guest',
        userAvatar: (user as any)?.photoURL ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to send chat message', err);
    } finally {
      setChatSending(false);
    }
  };

  const handleBrightnessChange = useCallback(
    (value: number) => {
      setBrightness(value);
      bumpControlsLife();
    },
    [bumpControlsLife],
  );

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolume(value);
      bumpControlsLife();
    },
    [bumpControlsLife],
  );

  const handleQualitySelect = useCallback(
    async (option: QualityOption | null) => {
      if (!playbackSource) return;
      if (!option) {
        if (selectedQualityId === 'auto' && !qualityOverrideUri) return;
        setQualityOverrideUri(null);
        setSelectedQualityId('auto');
        setVideoReloadKey((prev) => prev + 1);
        return;
      }
      if (selectedQualityId === option.id) return;
      setQualityLoadingId(option.id);
      try {
        await preloadQualityVariant(option.uri, playbackSource.headers);
        setQualityOverrideUri(option.uri);
        setSelectedQualityId(option.id);
        setVideoReloadKey((prev) => prev + 1);
      } catch (err) {
        console.warn('Quality preload failed', err);
        Alert.alert('Quality unavailable', 'Unable to switch to this quality right now.');
      } finally {
        setQualityLoadingId(null);
      }
    },
    [playbackSource, selectedQualityId, qualityOverrideUri],
  );

  const renderVerticalSlider = useCallback(
    (
      icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
      label: string,
      value: number,
      onValueChange: (val: number) => void,
    ) => {
      const percentageLabel = `${Math.round(value * 100)}%`;
      return (
        <LinearGradient
          colors={['rgba(32,34,45,0.95)', 'rgba(14,16,26,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glassCard}
        >
          <View style={styles.glassCardHeader}>
            <MaterialCommunityIcons name={icon} size={22} color="#fff" />
            <Text style={styles.glassCardLabel}>{label}</Text>
          </View>
          <View style={styles.verticalSliderWrap}>
            <View style={styles.sliderValueChip}>
              <Text style={styles.sliderValueText}>{percentageLabel}</Text>
            </View>
            <Slider
              style={styles.verticalSlider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={value}
              onValueChange={onValueChange}
              minimumTrackTintColor="#ff5f6d"
              maximumTrackTintColor="rgba(255,255,255,0.22)"
              thumbTintColor="#ffffff"
            />
          </View>
        </LinearGradient>
      );
    },
    [],
  );

  const getCaptionLabel = useCallback((caption: CaptionSource) => {
    if (caption.display) return caption.display;
    if (caption.language) return caption.language.toUpperCase();
    return 'Subtitle';
  }, []);

  const handleCaptionSelect = useCallback(
    async (captionId: string | 'off') => {
      bumpControlsLife();
      if (captionId === 'off') {
        setSelectedCaptionId('off');
        captionIndexRef.current = 0;
        captionCuesRef.current = [];
        setActiveCaptionText(null);
        return;
      }
      if (selectedCaptionId === captionId && captionCuesRef.current.length) {
        return;
      }
      const source = captionSources.find((item) => item.id === captionId);
      if (!source) return;
      setSelectedCaptionId(captionId);
      const cached = captionCacheRef.current[captionId];
      if (cached) {
        captionCuesRef.current = cached;
        captionIndexRef.current = 0;
        updateActiveCaption(positionMillis, true);
        return;
      }
      setCaptionLoadingId(captionId);
      try {
        const res = await fetch(source.url);
        const payload = await res.text();
        const cues = parseCaptionPayload(payload, source.type);
        captionCacheRef.current[captionId] = cues;
        captionCuesRef.current = cues;
        captionIndexRef.current = 0;
        updateActiveCaption(positionMillis, true);
      } catch (err) {
        console.warn('Failed to load captions', err);
        Alert.alert('Captions unavailable', 'Unable to load captions for this language right now.');
        setSelectedCaptionId('off');
        captionCuesRef.current = [];
        setActiveCaptionText(null);
      } finally {
        setCaptionLoadingId(null);
      }
    },
    [captionSources, positionMillis, selectedCaptionId, updateActiveCaption, bumpControlsLife],
  );

  const handleAudioSelect = useCallback(
    async (option: AudioTrackOption | null) => {
      bumpControlsLife();
      setSelectedAudioKey(option?.id ?? 'auto');
      const video = videoRef.current;
      if (!video) return;
      try {
        if (option?.language) {
          await (video as any).setStatusAsync({
            selectedAudioTrack: { type: 'language', value: option.language },
          });
        } else {
          await (video as any).setStatusAsync({
            selectedAudioTrack: { type: 'system' },
          });
        }
      } catch (err) {
        console.warn('Audio track switch failed', err);
      }
    },
    [bumpControlsLife],
  );

  const handleEpisodePlay = async (episode: UpcomingEpisode, index: number) => {
    if (!isTvShow) return;
    if (!tmdbId) {
      Alert.alert('Missing episode info', 'Unable to load this episode right now.');
      return;
    }
    if (scrapingEpisode) return;
    const nextTitle = episode.title || episode.seasonName || displayTitle;
    setScrapeError(null);
    try {
      const normalizedSeasonNumber =
        typeof episode.seasonNumber === 'number'
          ? episode.seasonNumber
          : typeof seasonNumberParam === 'number'
          ? seasonNumberParam
          : 1;

      const normalizedEpisodeNumber =
        typeof episode.episodeNumber === 'number'
          ? episode.episodeNumber
          : typeof episodeNumberParam === 'number'
          ? episodeNumberParam
          : 1;

      const derivedSeasonEpisodeCount =
        typeof episode.seasonEpisodeCount === 'number'
          ? episode.seasonEpisodeCount
          : typeof seasonEpisodeCountParam === 'number'
          ? seasonEpisodeCountParam
          : undefined;

      const payload = {
        type: 'show',
        title: displayTitle,
        tmdbId,
        imdbId,
        releaseYear: releaseYear ?? new Date().getFullYear(),
        season: {
          number: normalizedSeasonNumber,
          tmdbId: episode.seasonTmdbId?.toString() ?? '',
          title: episode.seasonName ?? seasonTitleParam ?? `Season ${normalizedSeasonNumber}`,
          ...(derivedSeasonEpisodeCount ? { episodeCount: derivedSeasonEpisodeCount } : {}),
        },
        episode: {
          number: normalizedEpisodeNumber,
          tmdbId: episode.episodeTmdbId?.toString() ?? '',
        },
      } as const;

      console.log('[VideoPlayer] Episode scrape payload', payload);
      const debugTag = buildScrapeDebugTag('episode', nextTitle || displayTitle);
      const playback = await scrapeEpisode(payload, { sourceOrder, debugTag });

      setPlaybackSource({
        uri: playback.uri,
        headers: playback.headers,
        streamType: playback.stream?.type,
        captions: playback.stream?.captions,
      });
      setCaptionSources(playback.stream?.captions ?? []);
      setSelectedCaptionId('off');
      captionCacheRef.current = {};
      captionCuesRef.current = [];
      setActiveCaptionText(null);
      setAudioTrackOptions([]);
      setSelectedAudioKey('auto');
      setQualityOptions([]);
      setSelectedQualityId('auto');
      setQualityOverrideUri(null);
      setQualityLoadingId(null);
      setVideoReloadKey((prev) => prev + 1);
      const nextSeasonTitle = episode.seasonName ?? seasonTitleParam ?? `Season ${normalizedSeasonNumber}`;
      const updatedEntryBase =
        watchEntryRef.current ??
        watchHistoryEntry ?? {
          id: parsedTmdbNumericId ?? (Number(tmdbId) || Date.now()),
          title: displayTitle,
          name: displayTitle,
        };
      watchEntryRef.current = {
        ...updatedEntryBase,
        title: displayTitle,
        name: displayTitle,
        seasonNumber: normalizedSeasonNumber,
        episodeNumber: normalizedEpisodeNumber,
        seasonTitle: nextSeasonTitle,
        episodeTitle: episode.title ?? updatedEntryBase.episodeTitle,
      };
      setActiveTitle(nextTitle);
      setEpisodeDrawerOpen(false);
      setShowControls(true);
      setEpisodeQueue((prev) => prev.slice(index + 1));
      setSeekPosition(0);
      setPositionMillis(0);
    } catch (err: any) {
      console.error('[VideoPlayer] Episode scrape failed', err);
      Alert.alert('Episode unavailable', err?.message || 'Unable to load this episode.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity activeOpacity={1} style={styles.touchLayer} onPress={handleSurfacePress}>
        {videoPlaybackSource ? (
          <Video
            key={videoReloadKey}
            ref={videoRef}
            source={videoPlaybackSource}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls={false}
            onPlaybackStatusUpdate={handleStatusUpdate}
          />
        ) : (
          <View style={styles.videoFallback}>
            {shouldShowMovieFlixLoader ? null : (
              <>
                <Text style={styles.videoFallbackText}>{scrapeError ?? 'No video stream available.'}</Text>
                <TouchableOpacity style={styles.videoFallbackButton} onPress={() => router.back()}>
                  <Text style={styles.videoFallbackButtonText}>Go Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {shouldShowMovieFlixLoader && <MovieFlixLoader message={loaderMessage} variant={loaderVariant} />}

        {showControls && (
          <View style={styles.overlay}>
            {/* Top fade */}
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent']}
              style={styles.topGradient}
            />

            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.bottomGradient}
            />

            {/* TOP BAR */}
            <View style={styles.topBar}>
              <View style={styles.topLeft}>
                <TouchableOpacity
                  style={styles.roundButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.titleWrap}>
                  <Text style={styles.title}>{activeTitle}</Text>
                  {roomCode ? (
                    <Text style={styles.roomCodeBadge}>Party #{roomCode}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.topRight}>
                <TouchableOpacity style={styles.roundButton}>
                  <MaterialCommunityIcons name="thumb-down-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.roundButton}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.roundButton}>
                  <MaterialCommunityIcons name="monitor-share" size={22} color="#fff" />
                </TouchableOpacity>
                {roomCode ? (
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => setShowChat((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name={showChat ? 'message-text-outline' : 'message-outline'}
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                ) : null}
                {isTvShow && episodeQueue.length > 0 ? (
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => setEpisodeDrawerOpen((prev) => !prev)}
                  >
                    <MaterialCommunityIcons name="playlist-play" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* MIDDLE CONTROLS + CHAT */}
            <View style={styles.middleRow}>
              <View style={[styles.sideCluster, styles.sideClusterLeft]}>
                <View style={styles.sideRail}>
                  {renderVerticalSlider('white-balance-sunny', 'Brightness', brightness, handleBrightnessChange)}
                </View>
              </View>

              {/* Central playback controls */}
              <View style={styles.centerControlsWrap}>
                <View style={styles.centerControls}>
                  <TouchableOpacity
                    style={styles.iconCircleSmall}
                    onPress={() => seekBy(-10000)}
                  >
                    <MaterialCommunityIcons name="rewind-10" size={26} color="#fff" />
                    <Text style={styles.seekLabel}>10s</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.iconCircle}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={42}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconCircleSmall}
                    onPress={() => seekBy(10000)}
                  >
                    <MaterialCommunityIcons name="fast-forward-10" size={26} color="#fff" />
                    <Text style={styles.seekLabel}>10s</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.sideCluster, styles.sideClusterRight]}>
                {/* Watch party chat (only when in a room) */}
                {roomCode && showChat ? (
                <View style={styles.chatPanel}>
                  <Text style={styles.chatTitle}>Party chat</Text>
                  <FlatList
                    data={chatMessages}
                    keyExtractor={(item) => item.id}
                    style={styles.chatList}
                    contentContainerStyle={styles.chatListContent}
                    renderItem={({ item }) => (
                      <View style={styles.chatMessageRow}>
                        {item.avatar ? (
                          <Image
                            source={{ uri: item.avatar }}
                            style={styles.chatAvatar}
                          />
                        ) : (
                          <View style={styles.chatAvatarFallback}>
                            <Text style={styles.chatAvatarFallbackText}>
                              {item.user.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.chatBubble}>
                          <Text style={styles.chatUser}>{item.user}</Text>
                          <Text style={styles.chatText}>{item.text}</Text>
                        </View>
                      </View>
                    )}
                  />
                  <View style={styles.chatInputRow}>
                    <TextInput
                      style={styles.chatInput}
                      placeholder="Say something…"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={handleSendChat}
                      editable={!chatSending}
                    />
                    <TouchableOpacity
                      style={styles.chatSendButton}
                      onPress={handleSendChat}
                      disabled={chatSending || !chatInput.trim()}
                    >
                      <Ionicons name="send" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                ) : (
                <View style={styles.middleRightPlaceholder} />
              )}

                <View style={[styles.sideRail, styles.rightSideRail]}>
                  {renderVerticalSlider('volume-high', 'Volume', volume, handleVolumeChange)}
                </View>
              </View>
            </View>

            {episodeDrawerOpen && isTvShow && episodeQueue.length > 0 && (
              <View style={styles.episodeDrawer}>
                <View style={styles.episodeDrawerHeader}>
                  <View>
                    <Text style={styles.episodeDrawerTitle}>Up Next</Text>
                    <Text style={styles.episodeDrawerSubtitle}>
                      {`${episodeQueue.length} episod${episodeQueue.length === 1 ? 'e' : 'es'}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.episodeDrawerClose}
                    onPress={() => setEpisodeDrawerOpen(false)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.episodeDrawerList}
                >
                  {episodeQueue.map((episode, index) => {
                    const key = `${episode.id ?? index}`;
                    const posterUri = episode.stillPath
                      ? `https://image.tmdb.org/t/p/w300${episode.stillPath}`
                      : FALLBACK_EPISODE_IMAGE;
                    const fallbackEpisodeNumber = episode.episodeNumber ?? index + 2;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={styles.episodeDrawerCard}
                        onPress={() => handleEpisodePlay(episode, index)}
                        disabled={scrapingEpisode}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: posterUri }} style={styles.episodeDrawerThumb} />
                        <View style={styles.episodeDrawerMeta}>
                          <Text style={styles.episodeDrawerSeason}>
                            {(episode.seasonName ?? `Season ${episode.seasonNumber ?? ''}`)?.trim() || 'Season'} · Ep {fallbackEpisodeNumber}
                          </Text>
                          <Text style={styles.episodeDrawerName} numberOfLines={1}>
                            {episode.title || 'Episode'}
                          </Text>
                          {episode.overview ? (
                            <Text style={styles.episodeDrawerOverview} numberOfLines={2}>
                              {episode.overview}
                            </Text>
                          ) : null}
                          {episode.runtime ? (
                            <Text style={styles.episodeDrawerRuntime}>{episode.runtime} min</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {avDrawerOpen && (
              <View style={styles.avDrawer}>
                <View style={styles.avDrawerHeader}>
                  <Text style={styles.avDrawerTitle}>Audio & Subtitles</Text>
                  <TouchableOpacity style={styles.avDrawerClose} onPress={() => setAvDrawerOpen(false)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.avDrawerColumns}>
                  <View style={styles.avDrawerColumn}>
                    <Text style={styles.avDrawerColumnTitle}>Subtitles</Text>
                    {hasSubtitleOptions ? (
                      <ScrollView style={styles.avDrawerList} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[
                            styles.avOptionRow,
                            selectedCaptionId === 'off' && styles.avOptionRowActive,
                          ]}
                          onPress={() => handleCaptionSelect('off')}
                        >
                          <View style={styles.avOptionIndicator}>
                            {selectedCaptionId === 'off' ? (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            ) : null}
                          </View>
                          <Text style={styles.avOptionLabel}>Off</Text>
                        </TouchableOpacity>
                        {captionSources.map((caption) => (
                          <TouchableOpacity
                            key={caption.id}
                            style={[
                              styles.avOptionRow,
                              selectedCaptionId === caption.id && styles.avOptionRowActive,
                            ]}
                            onPress={() => handleCaptionSelect(caption.id)}
                          >
                            <View style={styles.avOptionIndicator}>
                              {selectedCaptionId === caption.id ? (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              ) : null}
                            </View>
                            <Text style={styles.avOptionLabel}>{getCaptionLabel(caption)}</Text>
                            {captionLoadingId === caption.id ? (
                              <ActivityIndicator size="small" color="#fff" style={styles.avOptionSpinner} />
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.avEmptyCopy}>No subtitles detected</Text>
                    )}
                  </View>

                  <View style={styles.avDrawerColumn}>
                    <Text style={styles.avDrawerColumnTitle}>Audio</Text>
                    {hasAudioOptions ? (
                      <ScrollView style={styles.avDrawerList} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[
                            styles.avOptionRow,
                            selectedAudioKey === 'auto' && styles.avOptionRowActive,
                          ]}
                          onPress={() => handleAudioSelect(null)}
                        >
                          <View style={styles.avOptionIndicator}>
                            {selectedAudioKey === 'auto' ? (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            ) : null}
                          </View>
                          <Text style={styles.avOptionLabel}>Auto</Text>
                        </TouchableOpacity>
                        {audioTrackOptions.map((track) => (
                          <TouchableOpacity
                            key={track.id}
                            style={[
                              styles.avOptionRow,
                              selectedAudioKey === track.id && styles.avOptionRowActive,
                            ]}
                            onPress={() => handleAudioSelect(track)}
                          >
                            <View style={styles.avOptionIndicator}>
                              {selectedAudioKey === track.id ? (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              ) : null}
                            </View>
                            <Text style={styles.avOptionLabel}>
                              {track.name || track.language?.toUpperCase() || 'Audio'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.avEmptyCopy}>No alternate audio</Text>
                    )}
                  </View>

                  <View style={styles.avDrawerColumn}>
                    <Text style={styles.avDrawerColumnTitle}>Quality</Text>
                    {hasQualityOptions ? (
                      <ScrollView style={styles.avDrawerList} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[
                            styles.avOptionRow,
                            selectedQualityId === 'auto' && styles.avOptionRowActive,
                          ]}
                          onPress={() => handleQualitySelect(null)}
                        >
                          <View style={styles.avOptionIndicator}>
                            {selectedQualityId === 'auto' ? (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            ) : null}
                          </View>
                          <Text style={styles.avOptionLabel}>Auto</Text>
                        </TouchableOpacity>
                        {qualityOptions.map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.avOptionRow,
                              selectedQualityId === option.id && styles.avOptionRowActive,
                            ]}
                            onPress={() => handleQualitySelect(option)}
                          >
                            <View style={styles.avOptionIndicator}>
                              {selectedQualityId === option.id ? (
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.avOptionLabel}>{option.label}</Text>
                              {option.resolution ? (
                                <Text style={styles.avOptionSubLabel}>{option.resolution}</Text>
                              ) : null}
                            </View>
                            {qualityLoadingId === option.id ? (
                              <ActivityIndicator size="small" color="#fff" style={styles.avOptionSpinner} />
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.avEmptyCopy}>Single quality stream</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* BOTTOM BAR */}
            <View style={styles.bottomControls}>
              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.progressContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.progressGradient}
                  >
                    <Slider
                      style={styles.progressBar}
                      minimumValue={0}
                      maximumValue={durationMillis || 1}
                      value={seekPosition}
                      onSlidingStart={() => {
                        setIsSeeking(true);
                        bumpControlsLife();
                      }}
                      onValueChange={val => {
                        setSeekPosition(val);
                        bumpControlsLife();
                      }}
                      onSlidingComplete={async val => {
                        setIsSeeking(false);
                        await videoRef.current?.setPositionAsync(val);
                        bumpControlsLife();
                      }}
                      minimumTrackTintColor="#ff5f6d"
                      maximumTrackTintColor="rgba(255,255,255,0.2)"
                      thumbTintColor="#fff"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.timeText}>{currentTimeLabel}</Text>
                  <Text style={styles.timeText}>{totalTimeLabel}</Text>
                </View>
              </View>

              {/* Bottom actions */}
              <View style={styles.bottomActions}>
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={handleRateToggle}
                >
                  <MaterialCommunityIcons name="speedometer" size={18} color="#fff" />
                  <Text style={styles.bottomText}>
                    {`Speed (${playbackRate.toFixed(1)}x)`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomButton}>
                  <MaterialCommunityIcons name="lock-outline" size={18} color="#fff" />
                  <Text style={styles.bottomText}>Lock</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bottomButton, !avControlsEnabled && styles.bottomButtonDisabled]}
                  onPress={() => {
                    if (!avControlsEnabled) return;
                    bumpControlsLife();
                    setAvDrawerOpen((prev) => !prev);
                  }}
                  disabled={!avControlsEnabled}
                >
                  <MaterialCommunityIcons name="subtitles-outline" size={18} color="#fff" />
                  <Text style={styles.bottomText}>
                    {avDrawerOpen ? 'Hide' : 'Audio & Subtitles'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeCaptionText ? (
          <View pointerEvents="none" style={styles.subtitleWrapper}>
            <Text style={styles.subtitleText}>{activeCaptionText}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const MovieFlixLoader: React.FC<{ message: string; variant?: 'solid' | 'transparent' }> = ({
  message,
  variant = 'solid',
}) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.88,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [scale, opacity]);

  return (
    <View
      pointerEvents={variant === 'solid' ? 'auto' : 'none'}
      style={[styles.loaderOverlay, variant === 'transparent' && styles.loaderOverlayTransparent]}
    >
      <Animated.Text style={[styles.loaderTitle, { transform: [{ scale }], opacity }]}>
        MovieFlix
      </Animated.Text>
      <Text style={styles.loaderSubtitle}>{message}</Text>
    </View>
  );
};

function parseCaptionPayload(payload: string, type: 'srt' | 'vtt'): CaptionCue[] {
  const sanitized = payload.replace(/\r/g, '').replace('\uFEFF', '');
  const content = type === 'vtt' ? sanitized.replace(/^WEBVTT.*\n/, '') : sanitized;
  const blocks = content.split(/\n\n+/);
  const cues: CaptionCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (/^\d+$/.test(lines[0])) {
      lines.shift();
    }
    const timing = lines.shift();
    if (!timing || !timing.includes('-->')) continue;
    const [startRaw, endRaw] = timing.split('-->');
    const start = parseTimestampToMillis(startRaw);
    const end = parseTimestampToMillis(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const text = lines.join('\n').replace(/<[^>]+>/g, '').trim();
    if (!text) continue;
    cues.push({
      start,
      end,
      text,
    });
  }
  return cues.sort((a, b) => a.start - b.start);
}

function parseTimestampToMillis(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':');
  const secondsParts = parts.pop();
  if (!secondsParts) return NaN;
  const [secondsStr, milliStr = '0'] = secondsParts.split('.');
  const seconds = parseInt(secondsStr || '0', 10);
  const millis = parseInt(milliStr.padEnd(3, '0').slice(0, 3), 10);
  const minutes = parts.length ? parseInt(parts.pop() || '0', 10) : 0;
  const hours = parts.length ? parseInt(parts.pop() || '0', 10) : 0;
  return ((hours * 3600 + minutes * 60 + seconds) * 1000) + millis;
}

function parseHlsAudioTracks(manifest: string): AudioTrackOption[] {
  const lines = manifest.split('\n');
  const options: AudioTrackOption[] = [];
  const regex = /^#EXT-X-MEDIA:TYPE=AUDIO,(.*)$/i;
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const match = regex.exec(line);
    if (!match) return;
    const attrs = parseAttributeDictionary(match[1]);
    const groupId = stripQuotes(attrs['GROUP-ID']);
    const name = stripQuotes(attrs.NAME);
    const language = stripQuotes(attrs.LANGUAGE);
    options.push({
      id: `${groupId || 'audio'}:${language || idx}`,
      name,
      language,
      groupId,
      isDefault: attrs.DEFAULT === 'YES',
    });
  });
  return options;
}

function parseHlsQualityOptions(manifest: string, manifestUrl: string): QualityOption[] {
  const lines = manifest.split('\n');
  const options: QualityOption[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const [, attrString = ''] = line.split(':', 2);
    const attrs = parseAttributeDictionary(attrString);
    let j = i + 1;
    let uriLine: string | undefined;
    while (j < lines.length) {
      const candidate = lines[j].trim();
      j += 1;
      if (!candidate || candidate.startsWith('#')) continue;
      uriLine = candidate;
      break;
    }
    if (!uriLine) continue;
    const resolution = stripQuotes(attrs.RESOLUTION);
    const bandwidth = attrs.BANDWIDTH ? parseInt(attrs.BANDWIDTH, 10) : undefined;
    const label = buildQualityLabel(resolution, bandwidth);
    const uri = resolveRelativeUrl(uriLine, manifestUrl);
    options.push({
      id: `${bandwidth ?? 0}-${resolution ?? uri}`,
      label,
      uri,
      resolution,
      bandwidth,
    });
  }
  return options.sort((a, b) => {
    const aHeight = getResolutionHeight(a.resolution);
    const bHeight = getResolutionHeight(b.resolution);
    if (aHeight && bHeight) return bHeight - aHeight;
    if (a.bandwidth && b.bandwidth) return (b.bandwidth || 0) - (a.bandwidth || 0);
    return 0;
  });
}

function buildQualityLabel(resolution?: string, bandwidth?: number): string {
  const height = getResolutionHeight(resolution);
  if (height) {
    const kbps = bandwidth ? ` • ${formatBandwidth(bandwidth)}` : '';
    return `${height}p${kbps}`;
  }
  if (resolution) return resolution;
  if (bandwidth) return formatBandwidth(bandwidth);
  return 'Variant';
}

function getResolutionHeight(resolution?: string): number | null {
  if (!resolution) return null;
  const parts = resolution.split('x');
  if (parts.length !== 2) return null;
  const height = parseInt(parts[1], 10);
  return Number.isFinite(height) ? height : null;
}

function formatBandwidth(bandwidth: number): string {
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) return 'Stream';
  const kbpsValue = bandwidth / 1000;
  if (kbpsValue >= 1000) {
    return `${(kbpsValue / 1000).toFixed(1)} Mbps`;
  }
  return `${Math.round(kbpsValue)} kbps`;
}

function resolveRelativeUrl(target: string, base: string): string {
  try {
    return new URL(target, base).toString();
  } catch {
    return target;
  }
}

async function preloadQualityVariant(uri: string, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(uri, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Variant request failed (${res.status})`);
    }
    const manifest = await res.text();
    const firstSegment = manifest
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#'));
    if (firstSegment) {
      const absoluteSegment = resolveRelativeUrl(firstSegment, uri);
      fetch(absoluteSegment, { headers }).catch(() => {});
    }
  } finally {
    clearTimeout(timeout);
  }
}

function parseAttributeDictionary(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  let buffer = '';
  let inQuotes = false;
  const flush = () => {
    if (!buffer) return;
    const [key, value] = buffer.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
    buffer = '';
  };
  for (const char of input) {
    if (char === '"') {
      inQuotes = !inQuotes;
    }
    if (char === ',' && !inQuotes) {
      flush();
    } else {
      buffer += char;
    }
  }
  flush();
  return result;
}

function stripQuotes(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^"/, '').replace(/"$/, '');
}

function buildSourceOrder(preferAnime: boolean): string[] {
  const priority = preferAnime ? ANIME_PRIORITY_SOURCE_IDS : GENERAL_PRIORITY_SOURCE_IDS;
  const deprioritized = preferAnime ? GENERAL_PRIORITY_SOURCE_IDS : ANIME_PRIORITY_SOURCE_IDS;
  const combined = [
    ...priority,
    ...SOURCE_BASE_ORDER.filter(id => !priority.includes(id) && !deprioritized.includes(id)),
    ...deprioritized,
    ...SOURCE_BASE_ORDER,
  ];
  const seen = new Set<string>();
  return combined.filter(id => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  touchLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  videoFallbackText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  videoFallbackButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
  },
  videoFallbackButtonText: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10,12,25,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roomCodeBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // MIDDLE
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideCluster: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideClusterLeft: {
    justifyContent: 'flex-start',
  },
  sideClusterRight: {
    justifyContent: 'flex-end',
  },
  sideRail: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSideRail: {
    marginLeft: 16,
  },
  glassCard: {
    width: 86,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    backgroundColor: 'rgba(7,9,18,0.65)',
  },
  glassCardHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  glassCardLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  verticalSliderWrap: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderValueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  sliderValueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  verticalSlider: {
    width: 130,
    height: 36,
    transform: [{ rotate: '-90deg' }],
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControlsWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  iconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  seekLabel: {
    position: 'absolute',
    bottom: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },
  middleRightPlaceholder: {
    width: 220,
    height: 140,
  },
  chatPanel: {
    width: 220,
    height: 140,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  chatTitle: {
    color: '#ffffff',
    fontSize: 11,
    marginBottom: 4,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 4,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  chatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  chatAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarFallbackText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  chatBubble: {
    flex: 1,
  },
  chatUser: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  chatText: {
    color: '#ffffff',
    fontSize: 11,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chatInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#ffffff',
    fontSize: 11,
    marginRight: 6,
  },
  chatSendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BOTTOM
  bottomControls: {
    width: '100%',
  },
  progressRow: {
    width: '100%',
    marginBottom: 4,
  },
  progressContainer: {
    width: '100%',
    borderRadius: 999,
    padding: 3,
  },
  progressGradient: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(7,9,18,0.72)',
  },
  progressBar: {
    width: '100%',
    height: 32,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  bottomButtonDisabled: {
    opacity: 0.4,
  },
  bottomText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  episodeDrawer: {
    position: 'absolute',
    top: 90,
    right: 12,
    bottom: 140,
    width: 280,
    borderRadius: 18,
    backgroundColor: 'rgba(5,6,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  episodeDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  episodeDrawerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  episodeDrawerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  episodeDrawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  episodeDrawerList: {
    paddingBottom: 12,
  },
  episodeDrawerCard: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  episodeDrawerThumb: {
    width: 90,
    height: 90,
  },
  episodeDrawerMeta: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  episodeDrawerSeason: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 2,
  },
  episodeDrawerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  episodeDrawerOverview: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 4,
  },
  episodeDrawerRuntime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 6,
  },
  avDrawer: {
    position: 'absolute',
    bottom: 150,
    left: 12,
    right: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(5,6,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  avDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  avDrawerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  avDrawerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avDrawerColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avDrawerColumn: {
    flex: 1,
  },
  avDrawerColumnTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  avDrawerList: {
    maxHeight: 160,
  },
  avEmptyCopy: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  avOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avOptionRowActive: {
    backgroundColor: 'rgba(229,9,20,0.08)',
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  avOptionIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avOptionLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  avOptionSubLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  avOptionSpinner: {
    marginLeft: 6,
  },
  subtitleWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,6,15,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  loaderOverlayTransparent: {
    backgroundColor: 'rgba(5,6,15,0.45)',
  },
  loaderTitle: {
    color: '#e50914',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  loaderSubtitle: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default VideoPlayerScreen;
