import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Comment, FeedCardItem } from '../../../types/social-feed'; // Use our new, specific types

// The Props type now uses the precise FeedCardItem for the `item` prop
type Props = {
  item: FeedCardItem;
  onLike: (id: number) => void;
  onComment: (id: number) => void;
  onWatch: (id: number) => void;
  onShare: (id: number) => void;
  onBookmark: (id: number) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);
const MEDIA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);

export default function FeedCard({ item, onLike, onComment, onWatch, onShare, onBookmark }: Props) {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [watchVisible, setWatchVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;

  useEffect(() => {
    if (commentsVisible || watchVisible) {
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: SHEET_MAX_HEIGHT, duration: 200, useNativeDriver: true }).start();
    }
  }, [commentsVisible, watchVisible, translateY]);

  const openComments = useCallback((id: number) => {
    try {
      onComment(id);
    } catch {}
    setCommentsVisible(true);
  }, [onComment]);

  const openWatch = useCallback((id: number) => {
    try {
      onWatch(id);
    } catch {}
    setWatchVisible(true);
  }, [onWatch]);

  const closeSheets = () => {
    setCommentsVisible(false);
    setWatchVisible(false);
    Keyboard.dismiss();
    setNewComment('');
  };

  const submitComment = () => {
    if (!newComment.trim()) return;
    setNewComment('');
    Keyboard.dismiss();
  };

  // We now use the `Comment` type for the item in our comment renderer
  const renderCommentItem = ({ item: c }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.commentUser}>{c.user}</Text>
        <Text style={styles.commentText}>{c.text}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      {item.image ? (
        <View style={styles.imageWrap}>
          <Image source={item.image} style={styles.image} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.68)']} style={styles.imageGradient} />

          <View style={styles.imageOverlay}>
            <View style={styles.avatarOverlay} />
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
        </View>
      ) : null}

      <View style={styles.content}>
        {!item.image && (
          <View style={styles.headerRow}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.user}>{item.user}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
          </View>
        )}

        {!item.image && <Text style={styles.review}>{item.review}</Text>}

        {item.movie && !item.image ? <Text style={styles.movie}>Movie: {item.movie}</Text> : null}

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionPill} onPress={() => onLike(item.id)}>
            <Feather name="heart" size={18} color={item.liked ? '#ff6b6b' : '#fff'} />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => openComments(item.id)}>
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => openWatch(item.id)}>
            <MaterialIcons name="live-tv" size={18} color="#fff" />
            <Text style={styles.actionText}>Watch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onShare(item.id)}>
            <Feather name="share-2" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onBookmark(item.id)}>
            <Feather name="bookmark" size={18} color={item.bookmarked ? '#ffd600' : '#fff'} />
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
            data={item.comments ?? []} // Use the comments from the item prop, with a fallback
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
        <Animated.View style={[styles.sheet, { transform: [{ translateY }], height: Math.round(SHEET_MAX_HEIGHT * 0.86) }]}>
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
  // Card: elevated glass surface, inspired by Tabs.tsx
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginVertical: 12,
    marginHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  imageWrap: {
    position: 'relative',
    width: '100%',
    height: MEDIA_HEIGHT,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },

  // gradient to darken bottom of image for overlay text legibility
  imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },

  imageOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    // slight backdrop to lift overlay text (glass hint)
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  avatarOverlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff6b6b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  userOverlay: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewOverlay: { color: '#dcdcdc', fontSize: 12, marginTop: 2 },

  heartCount: { alignItems: 'center', marginLeft: 12 },
  heartText: { color: '#fff', marginTop: 4 },

  content: { padding: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  user: { color: '#fff', fontWeight: '700' },
  date: { color: '#bfbfbf', fontSize: 12 },

  review: { color: '#eaeaea', marginTop: 6 },
  movie: { color: '#ffd24d', fontWeight: '700', marginTop: 8 },

  actionsBar: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  // Action pill: glassy, slightly elevated
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    // tiny raised feel
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

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },

  // Bottom sheet: elevated glassy panel
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
    // elevated shadow to feel detached
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

  sheetHandle: { width: 46, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 },

  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff6b6b', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  commentUser: { color: '#fff', fontWeight: '700' },
  commentText: { color: '#d9d9d9', marginTop: 4 },

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
  sendText: { color: '#FF6B6B', fontWeight: '700' },

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
    backgroundColor: 'rgba(255,107,107,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    // glow
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255,107,107,0.16)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },

  watchDescription: { color: '#cfcfcf', marginTop: 10 },

  watchActionBtn: { backgroundColor: '#FF6B6B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  watchActionText: { color: '#fff', fontWeight: '700' },
});
