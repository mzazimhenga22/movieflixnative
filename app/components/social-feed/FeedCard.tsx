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
import type { ReviewItem } from './hooks';

type Props = {
  item: ReviewItem;
  onLike: (id: number) => void;
  onComment: (id: number) => void;
  onWatch: (id: number) => void;
  onShare: (id: number) => void;
  onBookmark: (id: number) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);
const MEDIA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75); // 75% of screen height for media

export default function FeedCard({ item, onLike, onComment, onWatch, onShare, onBookmark }: Props) {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [watchVisible, setWatchVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

  // animated value for bottom sheet translation
  const translateY = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;

  useEffect(() => {
    // open / close animation
    if (commentsVisible || watchVisible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_MAX_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [commentsVisible, watchVisible, translateY]);

  const openComments = useCallback(
    (id: number) => {
      // call external handler if needed (keeps existing behaviour)
      try {
        onComment(id);
      } catch {
        // swallow
      }
      setCommentsVisible(true);
    },
    [onComment]
  );

  const openWatch = useCallback(
    (id: number) => {
      try {
        onWatch(id);
      } catch {
        // swallow
      }
      setWatchVisible(true);
    },
    [onWatch]
  );

  const closeSheets = () => {
    // hide both
    setCommentsVisible(false);
    setWatchVisible(false);
    Keyboard.dismiss();
    setNewComment('');
  };

  const submitComment = () => {
    if (!newComment.trim()) return;
    // For now just append locally (if item.comments exists) - ideally call an API or handler
    // If your parent expects the comment via onComment, consider adding a second handler like onSubmitComment
    // We'll reset the input after "send".
    setNewComment('');
    Keyboard.dismiss();
  };

  const renderCommentItem = ({ item: c }: { item: { id: number; user: string; text: string } }) => (
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
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.imageGradient} />

          <View style={styles.imageOverlay}>
            <View style={styles.avatarOverlay} />
            <View style={{ flex: 1, paddingLeft: 8 }}>
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
            <Feather name="heart" size={18} color={item.liked ? '#ff3d3d' : '#fff'} />
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
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              height: SHEET_MAX_HEIGHT,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Comments</Text>

          <FlatList
            data={item.comments ?? [{ id: 1, user: 'alice', text: 'Nice post!' }, { id: 2, user: 'bob', text: 'Agree!' }]}
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
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              height: Math.round(SHEET_MAX_HEIGHT * 0.86),
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Watch Preview</Text>

          <View style={styles.watchPreview}>
            {/* Placeholder for video player. Replace with your player (expo-av, react-native-video) */}
            <View style={styles.videoPlaceholder}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Video preview</Text>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  // you can open a player or navigate to full-screen player
                  // as a convenience, call onWatch again if parent needs to handle it
                  onWatch(item.id);
                }}
              >
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
    backgroundColor: 'rgba(20,10,10,0.6)', 
    borderRadius: 14, 
    margin: 12, 
    overflow: 'hidden',
    marginBottom: 24,
  },
  imageWrap: { 
    position: 'relative', 
    width: '100%', 
    height: MEDIA_HEIGHT,
    backgroundColor: '#000',
  },
  image: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain',
  },
  imageGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  imageOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center' },
  avatarOverlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ff3d3d' },
  userOverlay: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewOverlay: { color: '#ddd', fontSize: 12, marginTop: 2 },
  heartCount: { alignItems: 'center' },
  heartText: { color: '#fff', marginTop: 4 },
  content: { padding: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff3d3d', marginRight: 8 },
  user: { color: 'white', fontWeight: '700' },
  date: { color: '#bbb', fontSize: 12 },
  review: { color: '#fff', marginTop: 6 },
  movie: { color: '#ffd600', fontWeight: '700', marginTop: 8 },
  actionsBar: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between', alignItems: 'center' },
  actionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 },
  actionText: { color: 'white', marginLeft: 8 },

  /* Bottom sheet styles */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 8 },

  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomColor: '#222', borderBottomWidth: 1 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff3d3d', marginRight: 10 },
  commentUser: { color: 'white', fontWeight: '700' },
  commentText: { color: '#ddd', marginTop: 4 },

  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, paddingHorizontal: 10, paddingVertical: 6 },
  commentInput: { flex: 1, color: '#fff', paddingVertical: 6, paddingHorizontal: 8 },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  sendText: { color: '#FF6B6B', fontWeight: '700' },

  watchPreview: { marginTop: 6 },
  videoPlaceholder: {
    height: 200,
    borderRadius: 10,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  playButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchDescription: { color: '#ccc', marginTop: 10 },
  watchActionBtn: { backgroundColor: '#FF6B6B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  watchActionText: { color: '#fff', fontWeight: '700' },
});
