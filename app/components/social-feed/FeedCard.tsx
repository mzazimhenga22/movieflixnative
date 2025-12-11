import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import type { Comment, FeedCardItem } from '../../../types/social-feed';
import { updateStreakForContext } from '@/lib/streaks/streakManager';

type Props = {
  item: FeedCardItem;
  onLike: (id: FeedCardItem['id']) => void;
  onComment: (id: FeedCardItem['id'], text?: string) => void;
  onWatch: (id: FeedCardItem['id']) => void;
  onShare: (id: FeedCardItem['id']) => void;
  onBookmark: (id: FeedCardItem['id']) => void;
  enableStreaks?: boolean;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);
const MEDIA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);

export default function FeedCard({ item, onLike, onComment, onWatch, onShare, onBookmark, enableStreaks }: Props) {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [watchVisible, setWatchVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<number, boolean>>({});
  const heartAnim = useRef(new Animated.Value(0)).current;
  const likers = item.likerAvatars?.slice(0, 3) ?? [];
  const lastTapRef = useRef(0);
  const [heartPosition, setHeartPosition] = useState({ x: MEDIA_HEIGHT / 2, y: MEDIA_HEIGHT / 2 });
  const translateY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const userInitial = (item.user?.trim()?.charAt(0)?.toUpperCase() || 'W');

  const AvatarBubble = ({ variant }: { variant: 'overlay' | 'default' }) => {
    const baseStyle = variant === 'overlay' ? styles.avatarOverlay : styles.avatar;
    if (item.avatar) {
      return <Image source={{ uri: item.avatar }} style={[baseStyle, styles.avatarImage]} />;
    }

    return (
      <View style={baseStyle}>
        <Text style={styles.avatarInitial}>{userInitial}</Text>
      </View>
    );
  };

  // 🔹 Video refs & state
  const videoRef = useRef<Video | null>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [muted, setMuted] = useState(true);

  // 🔹 Autoplay video when loaded, stop on unmount
  useEffect(() => {
    if (!item.videoUrl) return;

      const status = videoStatus as any;
      if (status?.isLoaded && !status.isPlaying) {
        videoRef.current?.playAsync?.().catch(() => {});
      }
    }, [item.videoUrl, videoStatus]);

  useEffect(() => {
    if (commentsVisible || watchVisible) {
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: SHEET_MAX_HEIGHT, duration: 200, useNativeDriver: true }).start();
    }
  }, [commentsVisible, watchVisible, translateY]);

  const openComments = useCallback(() => {
    setCommentsVisible(true);
    if (enableStreaks) {
      void updateStreakForContext({ kind: 'feed_comment' });
    }
  }, [enableStreaks]);

  const openWatch = useCallback(
    (id: number) => {
      try {
        onWatch(id);
      } catch {}
      setWatchVisible(true);
    },
    [onWatch]
  );

  const triggerHeart = () => {
    heartAnim.setValue(0);
    Animated.timing(heartAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }).start();
  };

  const handleDoubleTap = () => {
    onLike(item.id);
    triggerHeart();
    if (enableStreaks) {
      void updateStreakForContext({ kind: 'feed_like' });
    }
  };

  const handleTap = (e: GestureResponderEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      const { locationX, locationY } = e.nativeEvent;
      setHeartPosition({ x: locationX, y: locationY });
      handleDoubleTap();
    }
    lastTapRef.current = now;
  };

  const heartScale = heartAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1.15, 0],
  });
  const heartOpacity = heartAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 0],
  });

  const closeSheets = () => {
    setCommentsVisible(false);
    setWatchVisible(false);
    Keyboard.dismiss();
    setNewComment('');
  };

  const submitComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    try {
      onComment(item.id, trimmed);
    } catch (err) {
      console.warn('Failed to submit comment', err);
    }
    setNewComment('');
    Keyboard.dismiss();
  };

  const renderCommentItem = ({ item: c }: { item: Comment }) => {
    const isSpoiler = !!c.spoiler;
    const revealed = spoilerRevealed[c.id];

    return (
      <View style={styles.commentRow}>
        <View style={styles.commentAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.commentUser}>{c.user}</Text>
          {isSpoiler && !revealed ? (
            <TouchableOpacity
              style={styles.spoilerPill}
              onPress={() =>
                setSpoilerRevealed((prev) => ({
                  ...prev,
                  [c.id]: true,
                }))
              }
            >
              <Text style={styles.spoilerText}>Spoiler – tap to reveal</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.commentText}>{c.text}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardSheen} />

      {/* 🔹 VIDEO FIRST, FALLBACK TO IMAGE */}
      {item.videoUrl ? (
        <Pressable style={styles.imageWrap} onPress={handleTap}>
            <Video
              ref={videoRef}
              source={{ uri: item.videoUrl }}
              style={styles.image}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={muted}
              onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
              onLoad={async () => {
                try {
                  if (videoRef.current) {
                    await videoRef.current.playAsync();
                  }
                } catch (e) {
                  console.warn('FeedCard video play error', e);
                }
              }}
              onError={(error) => {
                console.error('FeedCard video error', error);
                console.log('FeedCard video URL', item.videoUrl);
              }}
            />
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />
          <TouchableOpacity style={styles.volumeToggle} onPress={() => setMuted((m) => !m)}>
            <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      ) : item.image ? (
        <Pressable style={styles.imageWrap} onPress={handleTap}>
          <Image source={item.image} style={styles.image} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartBurst,
              {
                opacity: heartOpacity,
                transform: [{ scale: heartScale }],
                left: heartPosition.x - 48,
                top: heartPosition.y - 48,
              },
            ]}
          >
            <MaskedView maskElement={<Feather name="heart" size={96} color="#fff" />}>
              <LinearGradient
                colors={['#ff7a45', '#ff2d55']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heartGradient}
              />
            </MaskedView>
          </Animated.View>

          <View style={styles.imageOverlay}>
            <AvatarBubble variant="overlay" />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.userOverlay}>{item.user}</Text>
              <Text style={styles.reviewOverlay} numberOfLines={2}>
                {item.review}
              </Text>
            </View>
            <View style={styles.heartCount}>
              <Feather name="heart" size={18} color="#fff" />
              <Text style={styles.heartText}>{item.likes}</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.content}>
        {!item.image && !item.videoUrl && (
          <View style={styles.headerRow}>
            <AvatarBubble variant="default" />
            <View>
              <Text style={styles.user}>{item.user}</Text>
              <Text style={styles.date}>{item.date}</Text>
              {item.genres && item.genres.length > 0 && (
                <View style={styles.genreBadgesRow}>
                  {item.genres.slice(0, 2).map((g) => (
                    <View key={g} style={styles.genreBadge}>
                      <Text style={styles.genreBadgeText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {!item.image && !item.videoUrl && <Text style={styles.review}>{item.review}</Text>}
        {item.movie && !item.image && !item.videoUrl ? (
          <Text style={styles.movie}>Movie: {item.movie}</Text>
        ) : null}

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Feather name="clock" size={14} color="#fff" />
            <Text style={styles.infoText}>2m read</Text>
          </View>
          {item.movie ? (
            <View style={styles.infoPillGhost}>
              <Feather name="film" size={14} color="#fff" />
              <Text style={styles.infoText}>{item.movie}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionPill} onPress={() => onLike(item.id)}>
            {likers.length > 0 && (
              <View style={styles.likerStack}>
                {likers.map((src, idx) => (
                  <Image
                    key={idx}
                    source={src}
                    style={[
                      styles.likerAvatar,
                      {
                        left: idx * 16,
                        top: -Math.abs(idx - 1) * 3,
                        zIndex: 10 - idx,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
            <Feather name="heart" size={18} color={item.liked ? '#e50914' : '#fff'} />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={openComments}>
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>{item.commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => openWatch(item.id)}>
            <Feather name="play-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>Watch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onShare(item.id)}>
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onBookmark(item.id)}>
            <MaterialIcons
              name={item.bookmarked ? 'bookmark' : 'bookmark-border'}
              size={20}
              color={item.bookmarked ? '#ffd700' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* COMMENTS BOTTOM SHEET */}
      <Modal visible={commentsVisible} animationType="none" transparent onRequestClose={closeSheets}>
        <Pressable style={styles.modalBackdrop} onPress={closeSheets} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }], height: SHEET_MAX_HEIGHT }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Comments</Text>

          <FlatList
            data={item.comments ?? []}
            keyExtractor={(c) => String(c.id)}
            renderItem={renderCommentItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ flex: 1 }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                onChangeText={setNewComment}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity onPress={submitComment} style={styles.sendBtn}>
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* WATCH BOTTOM SHEET */}
      <Modal visible={watchVisible} animationType="none" transparent onRequestClose={closeSheets}>
        <Pressable style={styles.modalBackdrop} onPress={closeSheets} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }], height: Math.round(SHEET_MAX_HEIGHT * 0.86) }]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Watch Preview</Text>

          <View style={styles.watchPreview}>
            <View style={styles.videoPlaceholder}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Video preview</Text>
              <TouchableOpacity style={styles.playButton} onPress={() => onWatch(item.id)}>
                <Feather name="play" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.watchDescription} numberOfLines={3}>
              {item.review ?? 'No description available.'}
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <TouchableOpacity style={styles.watchActionBtn} onPress={() => onWatch(item.id)}>
              <Text style={styles.watchActionText}>Open Full Player</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 18,
    marginVertical: 12,
    marginHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    opacity: 0.3,
  },
  imageWrap: {
    height: MEDIA_HEIGHT * 0.75,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  volumeToggle: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heartBurst: {
    position: 'absolute',
  },
  heartGradient: {
    width: 96,
    height: 96,
  },
  imageOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e50914',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userOverlay: { color: '#fff', fontWeight: '700' },
  reviewOverlay: { color: '#f5f5f5', fontSize: 12, marginTop: 2 },
  heartCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heartText: { color: '#fff', marginLeft: 6 },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e50914',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  user: { color: '#fff', fontWeight: '700' },
  date: { color: '#999', fontSize: 11, marginTop: 2 },
  review: { color: '#e6e6e6', marginTop: 6 },
  movie: { color: '#bfbfbf', marginTop: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  infoPillGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  infoText: { color: '#fff', fontSize: 11, marginLeft: 4 },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.18)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  actionText: { color: '#fff', marginLeft: 8 },
  likerStack: {
    position: 'absolute',
    left: -6,
    top: -18,
    flexDirection: 'row',
    height: 26,
  },
  likerAvatar: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,18,20,0.92)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  sheetHandle: {
    width: 46,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e50914',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commentUser: { color: '#fff', fontWeight: '700' },
  commentText: { color: '#d9d9d9', marginTop: 4 },
  spoilerPill: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(229,9,20,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.4)',
  },
  spoilerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  commentInput: { flex: 1, color: '#fff', paddingVertical: 6, paddingHorizontal: 8 },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  sendText: { color: '#7dd8ff', fontWeight: '700' },
  genreBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  genreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  genreBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  watchPreview: { marginTop: 6 },
  videoPlaceholder: {
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255,90,90,0.08)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 18,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  playButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(125,216,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(125,216,255,0.16)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  watchDescription: { color: '#cfcfcf', marginTop: 10 },
  watchActionBtn: {
    backgroundColor: '#7dd8ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  watchActionText: { color: '#fff', fontWeight: '700' },
});
