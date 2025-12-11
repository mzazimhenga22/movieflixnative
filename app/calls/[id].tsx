import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RtcSurfaceView } from 'react-native-agora';
import { BlurView } from 'expo-blur';
import type { User } from 'firebase/auth';
import { onAuthChange } from '../messaging/controller';
import {
  listenToCall,
  joinCallAsParticipant,
  markParticipantLeft,
  endCall,
  updateParticipantMuteState,
} from '@/lib/calls/callService';
import type { CallSession } from '@/lib/calls/types';
import { getAgoraEngine, destroyAgoraEngine } from '@/lib/calls/agoraClient';
import CallControls from './components/CallControls';

type AgoraEngine = Awaited<ReturnType<typeof getAgoraEngine>>;

const CallScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [call, setCall] = useState<CallSession | null>(null);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [localUid, setLocalUid] = useState<number | null>(null);
  const [isJoining, setJoining] = useState(false);
  const [mutedAudio, setMutedAudio] = useState(false);
  const [mutedVideo, setMutedVideo] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<AgoraEngine | null>(null);
  const handlerRef = useRef<any>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = listenToCall(String(id), (session) => {
      setCall(session);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!call) return;
    setMutedVideo(call.type === 'voice');
  }, [call?.type]);

  const cleanupConnection = useCallback(
    async (endForAll = false) => {
      const engine = engineRef.current;
      if (engine && handlerRef.current) {
        engine.unregisterEventHandler(handlerRef.current);
        handlerRef.current = null;
      }
      if (engine) {
        try {
          await engine.leaveChannel();
        } catch (err) {
          console.warn('Failed to leave channel', err);
        }
      }
      engineRef.current = null;
      if (call?.id && user?.uid) {
        try {
          await markParticipantLeft(call.id, user.uid);
          if (endForAll) {
            await endCall(call.id, user.uid);
          }
        } catch (err) {
          console.warn('Failed to update call state', err);
        }
      }
    },
    [call?.id, user?.uid],
  );

  const handleHangUp = useCallback(async () => {
    const shouldEndForAll = call?.initiatorId === user?.uid;
    await cleanupConnection(shouldEndForAll);
    await destroyAgoraEngine();
    router.back();
  }, [call?.initiatorId, user?.uid, cleanupConnection, router]);

  useEffect(() => {
    if (!call?.id || !call?.channelName || !call?.type || !user?.uid) return;
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    let cancelled = false;

    const joinAsync = async () => {
      setJoining(true);
      try {
        const { token, agoraUid } = await joinCallAsParticipant(
          call.id,
          user.uid,
          user.displayName ?? null,
        );
        const engine = await getAgoraEngine(call.type);
        engineRef.current = engine;
        const handler = {
          onJoinChannelSuccess: () => {
            setLocalUid(agoraUid);
            setError(null);
          },
          onUserJoined: (_channel: string, uid: number) => {
            setRemoteUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
          },
          onUserOffline: (_channel: string, uid: number) => {
            setRemoteUids((prev) => prev.filter((id) => id !== uid));
          },
          onLeaveChannel: () => {
            setRemoteUids([]);
            setLocalUid(null);
          },
        };
        handlerRef.current = handler;
        engine.registerEventHandler(handler);
        await engine.setEnableSpeakerphone(true);
        await engine.joinChannel(token || null, call.channelName, null, agoraUid);
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to join Agora channel', err);
          setError('Unable to join the call');
        }
      } finally {
        if (!cancelled) setJoining(false);
      }
    };

    joinAsync();

    return () => {
      cancelled = true;
    };
  }, [call?.id, call?.channelName, call?.type, user?.uid]);

  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
      cleanupConnection(false).finally(() => destroyAgoraEngine());
    };
  }, [cleanupConnection]);

  useEffect(() => {
    if (call?.status === 'ended') {
      handleHangUp();
    }
  }, [call?.status, handleHangUp]);

  const toggleAudio = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !call?.id || !user?.uid) return;
    const next = !mutedAudio;
    try {
      await engine.muteLocalAudioStream(next);
      setMutedAudio(next);
      await updateParticipantMuteState(call.id, user.uid, { mutedAudio: next });
    } catch (err) {
      console.warn('Failed to toggle audio', err);
    }
  }, [mutedAudio, call?.id, user?.uid]);

  const toggleVideo = useCallback(async () => {
    if (call?.type === 'voice') return;
    const engine = engineRef.current;
    if (!engine || !call?.id || !user?.uid) return;
    const next = !mutedVideo;
    try {
      await engine.muteLocalVideoStream(next);
      setMutedVideo(next);
      await updateParticipantMuteState(call.id, user.uid, { mutedVideo: next });
    } catch (err) {
      console.warn('Failed to toggle video', err);
    }
  }, [mutedVideo, call?.id, call?.type, user?.uid]);

  const toggleSpeaker = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !speakerOn;
    try {
      await engine.setEnableSpeakerphone(next);
      setSpeakerOn(next);
    } catch (err) {
      console.warn('Failed to toggle speaker', err);
    }
  }, [speakerOn]);

  if (!call) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.loadingText}>Connecting to call…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0d0c12', '#05050a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleHangUp} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backLabel}>Leave</Text>
          </TouchableOpacity>
          <View style={styles.callInfo}>
            <Text style={styles.callTitle}>{call.conversationName ?? 'Call'}</Text>
            <Text style={styles.callSubtitle}>
              {remoteUids.length > 0 ? 'Connected' : 'Calling…'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {call.type === 'video' ? (
            <View style={styles.videoArea}>
              {remoteUids.length === 0 ? (
                <View style={styles.waitingCard}>
                  <BlurView intensity={60} tint="dark" style={styles.waitingBlur}>
                    <Ionicons name="videocam-outline" size={32} color="#fff" />
                    <Text style={styles.waitingText}>Waiting for others to join…</Text>
                  </BlurView>
                </View>
              ) : (
                <View style={styles.remoteGrid}>
                  {remoteUids.map((uid) => (
                    <RtcSurfaceView
                      key={`remote-${uid}`}
                      style={styles.remoteVideo}
                      canvas={{ uid }}
                    />
                  ))}
                </View>
              )}
              {localUid !== null && (
                <View style={styles.localPreview}>
                  <RtcSurfaceView
                    style={styles.localVideo}
                    canvas={{ uid: localUid }}
                    zOrderMediaOverlay
                  />
                  <Text style={styles.previewLabel}>You</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.voiceArea}>
              <Ionicons name="call" size={36} color="#fff" />
              <Text style={styles.voiceTitle}>{call.conversationName ?? 'Voice call'}</Text>
              <Text style={styles.voiceSubtitle}>
                {remoteUids.length > 0 ? 'Connected' : isJoining ? 'Dialing…' : 'Waiting…'}
              </Text>
            </View>
          )}
        </View>

        <CallControls
          isAudioMuted={mutedAudio}
          isVideoMuted={mutedVideo}
          speakerOn={speakerOn}
          callType={call.type}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleSpeaker={toggleSpeaker}
          onEnd={handleHangUp}
        />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050a',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  callInfo: {
    alignItems: 'flex-end',
  },
  callTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  callSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  videoArea: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  remoteGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  localPreview: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 120,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  previewLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: '#fff',
    fontSize: 12,
  },
  waitingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingBlur: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: 'center',
  },
  waitingText: {
    marginTop: 8,
    color: '#fff',
  },
  voiceArea: {
    borderRadius: 24,
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 10,
  },
  voiceTitle: {
    marginTop: 16,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  voiceSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
  },
  errorBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(229,9,20,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#05050a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
  },
});

export default CallScreen;
