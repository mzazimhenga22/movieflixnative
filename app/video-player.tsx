import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatusSuccess, AVPlaybackSource } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../constants/firebase';
import { useUser } from '../hooks/use-user';
import { usePStream } from '../src/pstream/usePStream';

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
};

type PlaybackSource = {
  uri: string;
  headers?: Record<string, string>;
  streamType?: string;
};

const VideoPlayerScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roomCode = typeof params.roomCode === 'string' ? params.roomCode : undefined;
  const passedVideoUrl = typeof params.videoUrl === 'string' ? params.videoUrl : undefined;
  const passedStreamType = typeof params.streamType === 'string' ? params.streamType : undefined;
  const rawHeaders = typeof params.videoHeaders === 'string' ? params.videoHeaders : undefined;
  const rawTitle = typeof params.title === 'string' ? params.title : undefined;
  const displayTitle = rawTitle && rawTitle.trim().length > 0 ? rawTitle : 'Now Playing';
  const rawMediaType = typeof params.mediaType === 'string' ? params.mediaType : undefined;
  const isTvShow = rawMediaType === 'tv';
  const tmdbId = typeof params.tmdbId === 'string' ? params.tmdbId : undefined;
  const imdbId = typeof params.imdbId === 'string' ? params.imdbId : undefined;
  const imdbId = typeof params.imdbId === 'string' ? params.imdbId : undefined;
  const parsedReleaseYear = typeof params.releaseYear === 'string' ? parseInt(params.releaseYear, 10) : undefined;
  const releaseYear = typeof parsedReleaseYear === 'number' && Number.isFinite(parsedReleaseYear)
    ? parsedReleaseYear
    : undefined;
  const upcomingEpisodes = useMemo<UpcomingEpisode[]>(() => {
    const serialized = typeof params.upcomingEpisodes === 'string' ? params.upcomingEpisodes : undefined;
    if (!serialized) return [];
    try {
      const parsed = JSON.parse(serialized);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.upcomingEpisodes]);
  const parsedVideoHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!rawHeaders) return undefined;
    try {
      return JSON.parse(decodeURIComponent(rawHeaders));
    } catch {
      return undefined;
    }
  }, [rawHeaders]);
  const { loading: scrapingEpisode, scrape: scrapeEpisode } = usePStream();
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const videoRef = useRef<Video | null>(null);
  const [activeTitle, setActiveTitle] = useState(displayTitle);

  useEffect(() => {
    setActiveTitle(displayTitle);
  }, [displayTitle]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);

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

  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(() =>
    passedVideoUrl ? { uri: passedVideoUrl, headers: parsedVideoHeaders, streamType: passedStreamType } : null,
  );
  const [videoReloadKey, setVideoReloadKey] = useState(0);
  useEffect(() => {
    setPlaybackSource(
      passedVideoUrl ? { uri: passedVideoUrl, headers: parsedVideoHeaders, streamType: passedStreamType } : null,
    );
    setVideoReloadKey((prev) => prev + 1);
  }, [passedVideoUrl, parsedVideoHeaders, passedStreamType]);
  const [episodeQueue, setEpisodeQueue] = useState(upcomingEpisodes);
  useEffect(() => {
    setEpisodeQueue(upcomingEpisodes);
    if (!upcomingEpisodes.length) {
      setEpisodeDrawerOpen(false);
    }
  }, [upcomingEpisodes]);
  const isHlsSource = useMemo(() => {
    if (!playbackSource?.uri) return false;
    if (playbackSource.streamType === 'hls') return true;
    return playbackSource.uri.toLowerCase().includes('.m3u8');
  }, [playbackSource]);
  const videoPlaybackSource: AVPlaybackSource | null = useMemo(() => {
    if (!playbackSource) return null;
    const base: any = {
      uri: playbackSource.uri,
      headers: playbackSource.headers,
    };
    if (isHlsSource) {
      base.overrideFileExtensionAndroid = '.m3u8';
    }
    return base;
  }, [playbackSource, isHlsSource]);

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
    if (!showControls || !isPlaying || episodeDrawerOpen) return;
    const timeout = setTimeout(() => setShowControls(false), 3500);
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying, episodeDrawerOpen]);

  const handleStatusUpdate = (status: AVPlaybackStatusSuccess | any) => {
    if (!status || !status.isLoaded) return;

    setIsPlaying(status.isPlaying ?? false);

    if (!isSeeking) {
      setSeekPosition(status.positionMillis || 0);
    }

    setPositionMillis(status.positionMillis || 0);

    if (status.durationMillis) {
      setDurationMillis(status.durationMillis);
    }
  };

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

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

  const currentTimeLabel = `${formatTime(positionMillis)} / ${
    durationMillis ? formatTime(durationMillis) : '0:00'
  }`;

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

  const handleEpisodePlay = async (episode: UpcomingEpisode, index: number) => {
    if (!isTvShow) return;
    if (!tmdbId) {
      Alert.alert('Missing episode info', 'Unable to load this episode right now.');
      return;
    }
    if (scrapingEpisode) return;
    const nextTitle = episode.title || episode.seasonName || displayTitle;
    try {
      const playback = await scrapeEpisode({
        type: 'show',
        title: displayTitle,
        tmdbId,
        imdbId,
        releaseYear: releaseYear ?? new Date().getFullYear(),
        season: {
          number: episode.seasonNumber ?? 1,
          tmdbId: episode.seasonTmdbId?.toString() ?? '',
          title: episode.seasonName ?? `Season ${episode.seasonNumber ?? ''}`,
        },
        episode: {
          number: episode.episodeNumber ?? 1,
          tmdbId: episode.episodeTmdbId?.toString() ?? '',
        },
      });

      setPlaybackSource({
        uri: playback.uri,
        headers: playback.headers,
        streamType: playback.stream?.type,
      });
      setVideoReloadKey((prev) => prev + 1);
      setActiveTitle(nextTitle);
      setEpisodeDrawerOpen(false);
      setShowControls(true);
      setEpisodeQueue((prev) => prev.slice(index + 1));
      setSeekPosition(0);
      setPositionMillis(0);
    } catch (err: any) {
      Alert.alert('Episode unavailable', err?.message || 'Unable to load this episode.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchLayer}
        onPress={() => {
          if (episodeDrawerOpen) return;
          setShowControls((prev) => !prev);
        }}
      >
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
            <Text style={styles.videoFallbackText}>No video stream available.</Text>
            <TouchableOpacity style={styles.videoFallbackButton} onPress={() => router.back()}>
              <Text style={styles.videoFallbackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

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
                  <Ionicons name="thumbs-down-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.roundButton}>
                  <Ionicons name="thumbs-up-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.roundButton}>
                  <Ionicons name="tv-outline" size={20} color="#fff" />
                </TouchableOpacity>
                {roomCode ? (
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => setShowChat((prev) => !prev)}
                  >
                    <Ionicons
                      name={showChat ? 'chatbubble-ellipses-outline' : 'chatbubble-outline'}
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                ) : null}
                {isTvShow && episodeQueue.length > 0 ? (
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => setEpisodeDrawerOpen((prev) => !prev)}
                  >
                    <Ionicons name="list" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* MIDDLE CONTROLS + CHAT */}
            <View style={styles.middleRow}>
              {/* Brightness */}
              <View style={styles.brightnessCard}>
                <Ionicons name="sunny-outline" size={18} color="#fff" />
                <View style={styles.brightnessSliderContainer}>
                  <Slider
                    style={styles.brightnessSlider}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    value={brightness}
                    onValueChange={setBrightness}
                    minimumTrackTintColor="#e50914"
                    maximumTrackTintColor="rgba(229,9,20,0.35)"
                    thumbTintColor="#e50914"
                  />
                </View>
                <Text style={styles.brightnessLabel}>Brightness</Text>
              </View>

              {/* Central playback controls */}
              <View style={styles.centerControlsWrap}>
                <View style={styles.centerControls}>
                  <TouchableOpacity
                    style={styles.iconCircleSmall}
                    onPress={() => seekBy(-10000)}
                  >
                    <Ionicons
                      name="play-back-outline"
                      size={22}
                      color="#fff"
                    />
                    <Text style={styles.seekLabel}>10s</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.iconCircle}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={32}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconCircleSmall}
                    onPress={() => seekBy(10000)}
                  >
                    <Ionicons
                      name="play-forward-outline"
                      size={22}
                      color="#fff"
                    />
                    <Text style={styles.seekLabel}>10s</Text>
                  </TouchableOpacity>
                </View>
              </View>

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

              <View style={styles.volumeCard}>
                <Ionicons name="volume-high-outline" size={18} color="#fff" />
                <View style={styles.brightnessSliderContainer}>
                  <Slider
                    style={styles.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    value={volume}
                    onValueChange={setVolume}
                    minimumTrackTintColor="#e50914"
                    maximumTrackTintColor="rgba(229,9,20,0.35)"
                    thumbTintColor="#e50914"
                  />
                </View>
                <Text style={styles.brightnessLabel}>Volume</Text>
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
                            {(episode.seasonName ?? `Season ${episode.seasonNumber ?? ''}`)?.trim() || 'Season'} � Ep {fallbackEpisodeNumber}
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

            {/* BOTTOM BAR */}
            <View style={styles.bottomControls}>
              {/* Progress */}
              <View style={styles.progressRow}>
                <Slider
                  style={styles.progressBar}
                  minimumValue={0}
                  maximumValue={durationMillis || 1}
                  value={seekPosition}
                  onSlidingStart={() => setIsSeeking(true)}
                  onValueChange={setSeekPosition}
                  onSlidingComplete={async val => {
                    setIsSeeking(false);
                    await videoRef.current?.setPositionAsync(val);
                  }}
                  minimumTrackTintColor="#e50914"
                  maximumTrackTintColor="rgba(255,255,255,0.25)"
                  thumbTintColor="#e50914"
                />
                <Text style={styles.timeText}>{currentTimeLabel}</Text>
              </View>

              {/* Bottom actions */}
              <View style={styles.bottomActions}>
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={handleRateToggle}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.bottomText}>
                    {`Speed (${playbackRate.toFixed(1)}x)`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomButton}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.bottomText}>Lock</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomButton}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.bottomText}>Audio & Subtitles</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
    justifyContent: 'space-between',
  },
  brightnessCard: {
    width: 60,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
  },
  brightnessSliderContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  brightnessSlider: {
    width: 170,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  brightnessLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  volumeCard: {
    width: 60,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
  },
  volumeSlider: {
    width: 170,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControlsWrap: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  iconCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  seekLabel: {
    position: 'absolute',
    bottom: 6,
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  middleRightPlaceholder: {
    width: 80,
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
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 4,
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
});

export default VideoPlayerScreen;
