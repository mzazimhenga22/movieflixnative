import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type RtcEngine from 'react-native-agora';
import { RtcSurfaceView } from 'react-native-agora';
import type { User } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthChange } from '../messaging/controller';
import {
  createLiveStreamSession,
  endLiveStream,
} from '@/lib/live/liveService';
import type { LiveStreamSession } from '@/lib/live/types';
import { destroyLiveEngine, getLiveEngine } from '@/lib/live/agoraLiveClient';

const GoLiveScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('Movie night with friends');
  const [coverUrl, setCoverUrl] = useState('');
  const [session, setSession] = useState<LiveStreamSession | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const engineRef = useRef<RtcEngine | null>(null);
  const handlerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => setUser(authUser));
    return () => unsubscribe();
  }, []);

  const cleanupEngine = useCallback(async () => {
    const engine = engineRef.current;
    if (engine && handlerRef.current) {
      engine.unregisterEventHandler(handlerRef.current);
      handlerRef.current = null;
    }
    if (engine) {
      try {
        await engine.leaveChannel();
      } catch (err) {
        console.warn('Failed to leave live channel', err);
      }
    }
    engineRef.current = null;
    await destroyLiveEngine();
    setJoined(false);
  }, []);

  const handleStartLive = useCallback(async () => {
    if (!user) {
      Alert.alert('Please sign in', 'You need an account to go live.');
      return;
    }
    if (isJoining || joined) return;
    setIsJoining(true);

    try {
      const sessionPayload = await createLiveStreamSession({
        hostId: user.uid,
        hostName: user.displayName ?? user.email ?? 'Host',
        title: title.trim() || 'Live on MovieFlix',
        coverUrl: coverUrl.trim() || null,
      });
      setSession(sessionPayload);
      const engine = await getLiveEngine('broadcaster');
      engineRef.current = engine;
      const handler = {
        onJoinChannelSuccess: () => {
          setJoined(true);
        },
        onLeaveChannel: () => {
          setJoined(false);
        },
      };
      handlerRef.current = handler;
      engine.registerEventHandler(handler);
      await engine.joinChannel(
        sessionPayload.token || null,
        sessionPayload.channelName,
        null,
        sessionPayload.agoraUid,
      );
    } catch (err) {
      console.error('Failed to start live stream', err);
      Alert.alert(
        'Unable to go live',
        err instanceof Error ? err.message : 'Please try again shortly.',
      );
      await cleanupEngine();
      setSession(null);
    } finally {
      setIsJoining(false);
    }
  }, [cleanupEngine, coverUrl, title, user, isJoining, joined]);

  const handleEndLive = useCallback(async () => {
    if (session) {
      try {
        await endLiveStream(session.streamId, user?.uid ?? null);
      } catch (err) {
        console.warn('Failed to update live stream status', err);
      }
    }
    await cleanupEngine();
    setSession(null);
    router.back();
  }, [cleanupEngine, router, session, user?.uid]);

  useEffect(() => {
    return () => {
      void (async () => {
        if (session) {
          await endLiveStream(session.streamId, user?.uid ?? null);
        }
        await cleanupEngine();
      })();
    };
  }, [cleanupEngine, session, user?.uid]);

  return (
    <LinearGradient
      colors={['#1a0f1d', '#05050a']}
      style={StyleSheet.absoluteFill}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backLabel}>Feed</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.previewContainer}>
          {joined && session ? (
            <RtcSurfaceView
              style={styles.preview}
              canvas={{ uid: session.agoraUid }}
              zOrderMediaOverlay
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.8)" />
              <Text style={styles.previewHint}>
                {isJoining
                  ? 'Starting camera…'
                  : 'Tap “Go Live” to open your camera'}
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

        <TouchableOpacity
          style={[styles.goLiveButton, (isJoining || joined) && styles.disabledBtn]}
          onPress={joined ? handleEndLive : handleStartLive}
          disabled={isJoining}
        >
          <Ionicons name={joined ? 'square' : 'radio'} size={20} color="#fff" />
          <Text style={styles.goLiveLabel}>
            {joined ? 'End Stream' : isJoining ? 'Starting…' : 'Go Live'}
          </Text>
        </TouchableOpacity>
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
});

export default GoLiveScreen;
