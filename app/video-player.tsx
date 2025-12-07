import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatusSuccess } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';

const TEST_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const VideoPlayerScreen = () => {
  const router = useRouter();
  const videoRef = useRef<Video | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const [brightness, setBrightness] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

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

  // auto-hide controls when playing
  useEffect(() => {
    if (!showControls || !isPlaying) return;
    const timeout = setTimeout(() => setShowControls(false), 3500);
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

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

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchLayer}
        onPress={() => setShowControls(prev => !prev)}
      >
        <Video
          ref={videoRef}
          source={{ uri: TEST_VIDEO }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls={false}
          onPlaybackStatusUpdate={handleStatusUpdate}
        />

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
                  <Text style={styles.netflixN}>N</Text>
                  <Text style={styles.title}>Missing</Text>
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
                <TouchableOpacity
                  style={styles.roundButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* MIDDLE CONTROLS */}
            <View style={styles.middleRow}>
              {/* Brightness */}
              <View style={styles.brightnessCard}>
                <Ionicons name="sunny-outline" size={18} color="#fff" />
                <Slider
                  style={styles.brightnessSlider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={brightness}
                  onValueChange={setBrightness}
                  minimumTrackTintColor="#fff"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#fff"
                />
                <Text style={styles.brightnessLabel}>Brightness</Text>
              </View>

              {/* Central playback controls */}
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

              <View style={styles.middleRightPlaceholder} />
            </View>

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
  netflixN: {
    color: '#e50914',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 4,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // MIDDLE
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brightnessCard: {
    width: 80,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  brightnessSlider: {
    width: '100%',
    marginTop: 6,
    marginBottom: 4,
  },
  brightnessLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default VideoPlayerScreen;
