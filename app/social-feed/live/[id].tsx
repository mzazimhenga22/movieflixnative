import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RtcSurfaceView } from 'react-native-agora';
import type RtcEngine from 'react-native-agora';
import type { User } from 'firebase/auth';
import { onAuthChange } from '../../messaging/controller';
import {
  joinLiveStream,
  leaveLiveStream,
  listenToLiveStream,
} from '@/lib/live/liveService';
import type { LiveStream } from '@/lib/live/types';
import { destroyLiveEngine, getLiveEngine } from '@/lib/live/agoraLiveClient';

const LiveRoomScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const engineRef = useRef<RtcEngine | null>(null);
  const handlerRef = useRef<any>(null);
  const joinedRef = useRef(false);
  const incrementedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => setUser(authUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = listenToLiveStream(String(id), (live) => {
      setStream(live);
    });
    return () => unsubscribe();
  }, [id]);

  const cleanup = useCallback(async () => {
    const engine = engineRef.current;
    if (engine && handlerRef.current) {
      engine.unregisterEventHandler(handlerRef.current);
      handlerRef.current = null;
    }
    if (engine) {
      try {
        await engine.leaveChannel();
      } catch (err) {
        console.warn('Failed to leave live room', err);
      }
    }
    engineRef.current = null;
    setJoined(false);
    setRemoteUids([]);
    joinedRef.current = false;
    await destroyLiveEngine();
    if (id && incrementedRef.current) {
      try {
        await leaveLiveStream(String(id));
      } catch (err) {
        console.warn('Failed to decrement viewer count', err);
      } finally {
        incrementedRef.current = false;
      }
    }
  }, [id]);

  useEffect(() => {
    if (!stream || stream.status !== 'live') return;
    if (!user?.uid || !id || joinedRef.current) return;
    joinedRef.current = true;

    const joinAsync = async () => {
      setIsJoining(true);
      try {
        const { token, agoraUid, channelName } = await joinLiveStream(
          String(id),
          user.uid,
        );
        incrementedRef.current = true;
        const engine = await getLiveEngine('audience');
        engineRef.current = engine;
        const handler = {
          onJoinChannelSuccess: () => {
            setJoined(true);
            setIsJoining(false);
          },
          onUserJoined: (_channel: string, uid: number) => {
            setRemoteUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
          },
          onUserOffline: (_channel: string, uid: number) => {
            setRemoteUids((prev) => prev.filter((id) => id !== uid));
          },
          onLeaveChannel: () => {
            setJoined(false);
            setRemoteUids([]);
          },
        };
        handlerRef.current = handler;
        engine.registerEventHandler(handler);
        await engine.joinChannel(token || null, channelName, null, agoraUid);
      } catch (err) {
        console.error('Failed to join live stream', err);
        setIsJoining(false);
        joinedRef.current = false;
      }
    };

    joinAsync();
  }, [id, stream, user?.uid]);

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, [cleanup]);

  const handleClose = useCallback(async () => {
    await cleanup();
    router.back();
  }, [cleanup, router]);

  const ended = stream && stream.status === 'ended';

  return (
    <LinearGradient colors={['#06060f', '#020203']} style={StyleSheet.absoluteFill}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.roomTitle}>{stream?.title ?? 'Live room'}</Text>
            <Text style={styles.roomSubtitle}>
              {stream?.hostName ?? 'Someone live'} ·{' '}
              {Math.max(stream?.viewersCount ?? 0, 0)} watching
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          {ended && (
            <View style={styles.centerMessage}>
              <Ionicons name="stop-circle-outline" size={56} color="#fff" />
              <Text style={styles.endTitle}>Live has ended</Text>
              <Text style={styles.endSubtitle}>Thanks for stopping by.</Text>
            </View>
          )}

          {!ended && (
            <>
              {remoteUids.length > 0 ? (
                <RtcSurfaceView
                  style={styles.remoteVideo}
                  canvas={{ uid: remoteUids[0] }}
                />
              ) : (
                <View style={styles.centerMessage}>
                  {isJoining ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.endSubtitle}>Joining room…</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={56} color="#fff" />
                      <Text style={styles.endSubtitle}>Waiting for host…</Text>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 16,
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
    marginLeft: 4,
    fontWeight: '600',
  },
  roomTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  roomSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  body: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  endTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  endSubtitle: {
    color: 'rgba(255,255,255,0.7)',
  },
});

export default LiveRoomScreen;
