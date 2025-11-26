// MainVideoPlayer.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Video,
  ResizeMode,
  AVPlaybackStatus,
  AVPlaybackStatusSuccess,
} from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';

// Import your control components (assumed to exist in same folder)
import { Timer } from './Timer';
import { ProgressBar } from './ProgressBar';
import { PlayPauseButton } from './PlayPauseButton';
import { PipButton } from './PipButton';
import { PlaybackSpeedButton } from './PlaybackSpeedButton';
import { FullscreenButton } from './FullscreenButton';
import { MuteButton } from './MuteButton';
import { SeekButton } from './SeekButton';

export interface MainVideoPlayerProps {
  videoSource: string;
}

export function MainVideoPlayer({ videoSource }: MainVideoPlayerProps) {
  const video = useRef<Video | null>(null);
  const { width, height } = useWindowDimensions();

  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // lock to landscape when mounted; restore when unmounted
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
        );
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      if (!mounted) return;
      (async () => {
        try {
          await ScreenOrientation.unlockAsync();
        } catch (e) {
          // ignore
        }
      })();
      mounted = false;
    };
  }, []);

  // Hide the status bar for a true full-screen experience
  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  const isPlaying = !!(status && status.isLoaded && status.isPlaying);
  const isMuted = !!(status && status.isLoaded && status.isMuted);

  // Play / Pause
  const handlePlayPause = useCallback(async () => {
    if (!video.current || !status || !status.isLoaded) return;
    try {
      if (status.isPlaying) {
        await video.current.pauseAsync();
      } else {
        await video.current.playAsync();
      }
    } catch (e) {
      // handle error/log if needed
    }
  }, [status]);

  // Seek via +/- seconds
  const handleSeek = useCallback(
    async (seconds: number) => {
      if (!video.current || !status || !status.isLoaded) return;
      const current = status.positionMillis ?? 0;
      const target = Math.max(0, current + seconds * 1000);
      await video.current.setPositionAsync(target);
    },
    [status]
  );

  // Slider value change (position in ms)
  const handleSliderValueChange = useCallback(
    async (positionMillis: number) => {
      if (!video.current || !status || !status.isLoaded) return;
      await video.current.setPositionAsync(positionMillis);
    },
    [status]
  );

  // PiP toggle (iOS / Android support depends on device)
  const handlePipToggle = useCallback(async () => {
    if (!video.current) return;
    try {
      if (!isPipActive) {
        // @ts-ignore - presentPictureInPictureAsync may be non-typed
        await (video.current as any).presentPictureInPictureAsync();
      } else {
        // @ts-ignore
        await (video.current as any).dismissPictureInPictureAsync();
      }
    } catch (e) {
      // ignore or show UI hint
    }
  }, [isPipActive]);

  // Playback speed cycle
  const playbackSpeeds = [0.5, 1.0, 1.5, 2.0];
  const handlePlaybackSpeedChange = useCallback(async () => {
    if (!video.current) return;
    const currentIndex = playbackSpeeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
    const nextSpeed = playbackSpeeds[nextIndex];
    try {
      await video.current.setRateAsync(nextSpeed, true);
      setPlaybackSpeed(nextSpeed);
    } catch (e) {
      // ignore
    }
  }, [playbackSpeed]);

  // Fullscreen toggle - uses native fullscreen player
  const handleFullscreenToggle = useCallback(async () => {
    if (!video.current) return;
    try {
      if (!isFullscreen) {
        // present native fullscreen
        // @ts-ignore
        await video.current.presentFullscreenPlayer();
      } else {
        // @ts-ignore
        await video.current.dismissFullscreenPlayer();
      }
    } catch (e) {
      // ignore
    }
  }, [isFullscreen]);

  // Mute toggle
  const handleMuteToggle = useCallback(async () => {
    if (!video.current || !status || !status.isLoaded) return;
    try {
      await video.current.setIsMutedAsync(!status.isMuted);
    } catch (e) {
      // ignore
    }
  }, [status]);

  // Progress / status update handler
  const onPlaybackStatusUpdate = useCallback((playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
  }, []);

  // onPictureInPictureStatusUpdate - update PiP state
  const onPictureInPictureStatusUpdate = useCallback((event: { isPictureInPictureActive?: boolean }) => {
    setIsPipActive(!!event.isPictureInPictureActive);
  }, []);

  // onFullscreenUpdate - update local fullscreen flag.
  // expo-av sends numeric codes; simplest safe check used here:
  const onFullscreenUpdate = useCallback(({ fullscreenUpdate }: any) => {
    // Keep the simple rule: treat codes < 2 as 'presented' like previous implementation
    setIsFullscreen(typeof fullscreenUpdate === 'number' ? fullscreenUpdate < 2 : false);
  }, []);

  // Helpers to safely extract duration and position
  const durationMillis =
    (status && status.isLoaded && (status as AVPlaybackStatusSuccess).durationMillis) || 0;
  const positionMillis = (status && status.isLoaded && status.positionMillis) || 0;

  return (
    <View style={styles.container}>
      {/* Video element covers full window by width/height + absolute positioning */}
      <Video
        ref={(ref) => {
          // keep the typed ref
          video.current = ref;
        }}
        style={styles.video} // Changed: removed dynamic width/height
        source={{ uri: videoSource }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        // @ts-ignore - these event props exist at runtime though typings are incomplete
        onPictureInPictureStatusUpdate={onPictureInPictureStatusUpdate}
        onFullscreenUpdate={onFullscreenUpdate}
        allowsPictureInPicture
        useNativeControls={false} // we use custom controls
      />

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay}>
        <View style={styles.bottomControlsContainer}>
          <View style={styles.bottomRowControls}>
            <PlayPauseButton isPlaying={isPlaying} onPress={handlePlayPause} />

            <SeekButton isForward={false} onPress={() => handleSeek(-10)} />
            <SeekButton isForward={true} onPress={() => handleSeek(10)} />

            <ProgressBar
              positionMillis={positionMillis}
              durationMillis={durationMillis}
              onValueChange={handleSliderValueChange}
            />

            <Timer positionMillis={positionMillis} durationMillis={durationMillis} />

            <MuteButton isMuted={isMuted} onPress={handleMuteToggle} />

            <PlaybackSpeedButton currentSpeed={playbackSpeed} onPress={handlePlaybackSpeedChange} />

            <PipButton isPipActive={isPipActive} onPress={handlePipToggle} />

            <FullscreenButton isFullscreen={isFullscreen} onPress={handleFullscreenToggle} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%', // Added to ensure container takes full width
    height: '100%', // Added to ensure container takes full height
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0, // Added to ensure video fills horizontally
    bottom: 0, // Added to ensure video fills vertically
  },
  controlsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // give the overlay some safe vertical padding for touch targets
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomControlsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});

export default MainVideoPlayer;
