import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RTCView } from 'react-native-webrtc';
import type { User } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccent } from '../components/AccentContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthChange } from '../messaging/controller';
import {
  createLiveStreamSession,
  endLiveStream,
  listenToLiveStream,
} from '@/lib/live/liveService';
import type { LiveStreamSession, LiveStream } from '@/lib/live/types';
import {
  initializeBroadcaster,
  createBroadcastOffer,
  getBroadcasterStream,
  closeBroadcaster,
  handleViewerAnswer,
  addIceCandidateToBroadcaster,
  setIceCandidateCallback,
} from '@/lib/live/webrtcLiveClient';
import { sendOffer, sendIceCandidate } from '@/lib/calls/callService';
import { mediaDevices } from 'react-native-webrtc';

const GoLiveScreen = () => {
  const router = useRouter();
  const { accentColor } = useAccent();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('Movie night with friends');
  const [coverUrl, setCoverUrl] = useState('');
  const [session, setSession] = useState<LiveStreamSession | null>(null);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [broadcasterStream, setBroadcasterStream] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewStream, setPreviewStream] = useState<any>(null);
  const [cameraFront, setCameraFront] = useState(true);

  const { height: screenHeight } = Dimensions.get('window');
  const bottomNavHeight = 72 + insets.bottom; // Approximate bottom nav height

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => setUser(authUser));
    return () => unsubscribe();
  }, []);

  const startPreview = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 30 },
          facingMode: cameraFront ? 'user' : 'environment',
        },
      };
      const stream = await mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);
      setPreviewMode(true);
    } catch (err) {
      Alert.alert('Camera Error', 'Unable to access camera');
    }
  }, [cameraFront]);

  const switchCamera = useCallback(async () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track: any) => track.stop());
    }
    setCameraFront(!cameraFront);
    // Restart preview with new camera
    setTimeout(() => {
      startPreview();
    }, 100);
  }, [previewStream, cameraFront, startPreview]);

  const stopPreview = useCallback(() => {
    if (previewStream) {
      previewStream.getTracks().forEach((track: any) => track.stop());
      setPreviewStream(null);
    }
    setPreviewMode(false);
  }, [previewStream]);

  const handleStartLive = useCallback(async () => {
    if (!user) {
      Alert.alert('Please sign in', 'You need an account to go live.');
      return;
    }
    if (isJoining || joined) return;
    setIsJoining(true);

    // Stop preview stream before starting broadcast
    if (previewStream) {
      previewStream.getTracks().forEach((track: any) => track.stop());
      setPreviewStream(null);
    }
    setPreviewMode(false);

    // Wait for camera to be fully released
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Create live stream session
      const sessionPayload = await createLiveStreamSession({
        hostId: user.uid,
        hostName: user.displayName ?? user.email ?? 'Host',
        title: title.trim() || 'Live on MovieFlix',
        coverUrl: coverUrl.trim() || null,
      });
      setSession(sessionPayload);
      console.log('Live stream session created:', sessionPayload);

      // Initialize WebRTC broadcaster
      console.log('Initializing broadcaster...');
      const { peerConnection, stream } = await initializeBroadcaster();
      console.log('Broadcaster initialized, peerConnection:', !!peerConnection, 'stream:', !!stream);
      setBroadcasterStream(stream);

      // Set up ICE candidate callback
      setIceCandidateCallback(async (candidate: any) => {
        await sendIceCandidate(sessionPayload.streamId, user.uid, candidate);
      });

      // Listen to the live stream for viewer interactions
      const unsubscribe = listenToLiveStream(sessionPayload.streamId, (liveStream) => {
        setStream(liveStream);
      });

      // Small delay to ensure WebRTC is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create offer for broadcasting
      console.log('Creating broadcast offer...');
      const offer = await createBroadcastOffer();
      console.log('Broadcast offer created:', !!offer);

      console.log('Sending offer...');
      await sendOffer(sessionPayload.streamId, user.uid, offer);

      setJoined(true);
      console.log('Live stream started successfully');

      // Cleanup function for when component unmounts
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Failed to start live stream:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      Alert.alert(
        'Unable to go live',
        `${errorMessage}. Please check your camera permissions and try again.`,
      );
      // Cleanup on error
      try {
        closeBroadcaster();
      } catch (cleanupErr) {
        console.warn('Error during cleanup:', cleanupErr);
      }
      setSession(null);
      setBroadcasterStream(null);
    } finally {
      setIsJoining(false);
    }
  }, [coverUrl, title, user, isJoining, joined]);

  const handleEndLive = useCallback(async () => {
    if (session) {
      try {
        await endLiveStream(session.streamId, user?.uid ?? null);
      } catch (err) {
        console.warn('Failed to update live stream status', err);
      }
    }
    closeBroadcaster();
    setSession(null);
    setStream(null);
    setBroadcasterStream(null);
    setJoined(false);
    router.back();
  }, [router, session, user?.uid]);

  useEffect(() => {
    return () => {
      void (async () => {
        if (session) {
          await endLiveStream(session.streamId, user?.uid ?? null);
        }
        closeBroadcaster();
      })();
    };
  }, [session, user?.uid]);

  return (
    <LinearGradient
      colors={[accentColor, '#05050a']}
      style={StyleSheet.absoluteFill}
    >
      <SafeAreaView style={[styles.safeArea, { paddingBottom: bottomNavHeight + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backLabel}>Feed</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.previewContainer, { maxHeight: screenHeight * 0.5 }]}>
          {joined && broadcasterStream ? (
            <RTCView
              streamURL={broadcasterStream.toURL()}
              style={styles.preview}
              objectFit="cover"
            />
          ) : previewMode && previewStream ? (
            <RTCView
              streamURL={previewStream.toURL()}
              style={styles.preview}
              objectFit="cover"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.8)" />
              <Text style={styles.previewHint}>
                {isJoining
                  ? 'Starting camera…'
                  : previewMode
                  ? 'Adjust your settings'
                  : 'Tap "Go Live" to open your camera'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Live title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What are we watching?"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
          />
          <Text style={styles.label}>Cover image URL</Text>
          <TextInput
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder="Optional thumbnail"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
          />
        </View>

        {/* Broadcaster controls overlay */}
        {joined && (
          <View style={styles.broadcasterOverlay}>
            {/* End stream button */}
            <TouchableOpacity
              style={styles.endStreamButton}
              onPress={handleEndLive}
            >
              <Ionicons name="square" size={20} color="#fff" />
              <Text style={styles.endStreamLabel}>End Stream</Text>
            </TouchableOpacity>

            {/* Live indicator */}
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.liveText, { color: accentColor }]}>LIVE</Text>
              <Text style={styles.viewerCountText}>
                {stream?.viewersCount ?? 0} watching
              </Text>
            </View>
          </View>
        )}

        {!joined && !previewMode && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.goLiveButton, { backgroundColor: accentColor }]}
              onPress={startPreview}
            >
              <Ionicons name="videocam" size={20} color="#fff" />
              <Text style={styles.goLiveLabel}>Start Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {previewMode && !joined && (
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.startStreamButton, isJoining && styles.disabledBtn]}
              onPress={handleStartLive}
              disabled={isJoining}
            >
              <Ionicons name="radio" size={20} color="#fff" />
              <Text style={styles.startStreamLabel}>
                {isJoining ? 'Starting…' : 'Start Streaming'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopPreview}
            >
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.controlLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  screenTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  previewHint: {
    color: 'rgba(255,255,255,0.7)',
  },
  form: {
    gap: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4b4b',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  disabledBtn: {
    opacity: 0.8,
  },
  goLiveLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  broadcasterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  endStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
    gap: 8,
  },
  endStreamLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4b4b',
  },
  liveText: {
    color: '#ff4b4b',
    fontSize: 14,
    fontWeight: '700',
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  startStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4b4b',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  startStreamLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default GoLiveScreen;
