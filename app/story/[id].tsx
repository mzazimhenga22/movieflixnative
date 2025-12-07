import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, SafeAreaView, Text, Dimensions, Pressable, Animated, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '../../constants/firebase';
import { findOrCreateConversation, sendMessage, type Profile } from '../messaging/controller';

interface StoryDoc {
  photoURL: string;
  username?: string;
  caption?: string;
  overlayText?: string;
  userId?: string;
  createdAt?: any;
}

const StoryScreen = () => {
  const { id, photoURL: fallbackPhoto } = useLocalSearchParams();
  const router = useRouter();
  const [stories, setStories] = useState<(StoryDoc & { id: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isReplyActive, setIsReplyActive] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const durationMs = 30000; // 30 seconds per story
  const { width } = Dimensions.get('window');

  useEffect(() => {
    const fetchStories = async () => {
      if (!id) return;
      try {
        const ref = doc(firestore, 'stories', String(id));
        const snap = await getDoc(ref);
        if (!snap.exists() && fallbackPhoto) {
          setStories([{ id: String(id), photoURL: String(fallbackPhoto) }]);
          setCurrentIndex(0);
          return;
        }

        if (snap.exists()) {
          const base = snap.data() as StoryDoc;
          const userId = base.userId;

          if (userId) {
            // Fetch all stories for this user in time order
            const storiesRef = collection(firestore, 'stories');
            // Fetch all stories for this user, then sort client-side by createdAt
            const q = query(storiesRef, where('userId', '==', userId));
            const listSnap = await getDocs(q);
            const unsorted: (StoryDoc & { id: string })[] = listSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as StoryDoc),
            }));
            const list = unsorted.sort((a, b) => {
              const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return ta - tb;
            });
            setStories(list);
            // Always start from the earliest story in the set
            setCurrentIndex(0);
          } else {
            setStories([{ id: snap.id, ...(base as StoryDoc) }]);
            setCurrentIndex(0);
          }
        } else if (fallbackPhoto) {
          setStories([{ id: String(id), photoURL: String(fallbackPhoto) }]);
          setCurrentIndex(0);
        }
      } catch (e) {
        console.warn('Failed to load story doc', e);
        if (fallbackPhoto) {
          setStories([{ id: String(id), photoURL: String(fallbackPhoto) }]);
          setCurrentIndex(0);
        }
      }
    };
    fetchStories();
  }, [id, fallbackPhoto]);

  const currentStory = stories[currentIndex];
  const imageUri = currentStory?.photoURL || (fallbackPhoto as string | undefined);

  const startProgress = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  };

  useEffect(() => {
    if (stories.length > 0) {
      startProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
    } else {
      router.back();
    }
  };

  const handleTap = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 2) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleSwipeUp = (evt: any) => {
    const { translationY } = evt.nativeEvent;
    if (translationY < -30) {
      setIsReplyActive(true);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory?.userId) return;
    try {
      const target: Profile = {
        id: currentStory.userId,
        displayName: currentStory.username || 'Story user',
        photoURL: currentStory.photoURL || '',
      } as any;
      const conversationId = await findOrCreateConversation(target);
      await sendMessage(conversationId, {
        text: replyText.trim(),
      });
      setReplyText('');
      setIsReplyActive(false);
      router.push(`/messaging/chat/${conversationId}`);
    } catch (e) {
      console.warn('Failed to send story reply', e);
    }
  };

  if (!imageUri) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Story not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={26} color="white" />
          </TouchableOpacity>
          <View style={styles.headerUserRow}>
            {currentStory?.photoURL ? (
              <Image source={{ uri: currentStory.photoURL }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: '#333' }]} />
            )}
            <View>
              {currentStory?.username ? (
                <Text style={styles.headerName}>{currentStory.username}</Text>
              ) : null}
              <Text style={styles.headerMeta}>
                {stories.length > 0 ? `${currentIndex + 1} of ${stories.length}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Progress bars */}
      <View style={styles.progressRow}>
        {stories.map((s, index) => {
          const barWidth =
            index < currentIndex
              ? '100%'
              : index === currentIndex
              ? progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              : '0%';
          return (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: barWidth }]} />
            </View>
          );
        })}
      </View>

      <Pressable style={styles.tapLayer} onPress={handleTap} onResponderMove={handleSwipeUp}>
        <Image source={{ uri: imageUri }} style={styles.storyImage} resizeMode="cover" />

        {currentStory?.overlayText ? (
          <View style={styles.overlayTextChip}>
            <Text style={styles.overlayText}>{currentStory.overlayText}</Text>
          </View>
        ) : null}

        {currentStory?.caption ? (
          <View style={styles.captionBar}>
            {currentStory?.username ? (
              <Text style={styles.captionUsername}>{currentStory.username}</Text>
            ) : null}
            <Text style={styles.captionText}>{currentStory.caption}</Text>
          </View>
        ) : null}

        <View style={styles.replyHintWrapper}>
          {!isReplyActive && (
            <Text style={styles.replyHintText}>Swipe up to reply</Text>
          )}
        </View>

        {isReplyActive && (
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder="Reply to story..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={replyText}
              onChangeText={setReplyText}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSendReply}
            />
            <TouchableOpacity onPress={handleSendReply} style={styles.replySendBtn}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  storyImage: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  closeButton: {
    paddingVertical: 4,
    paddingRight: 10,
    paddingLeft: 2,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  tapLayer: {
    flex: 1,
  },
  progressRow: {
    position: 'absolute',
    top: 64,
    left: 10,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  overlayTextChip: {
    position: 'absolute',
    top: '20%',
    left: 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  captionUsername: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 2,
  },
  captionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  replyHintWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
  },
  replyHintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  replyBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4,
    paddingRight: 8,
  },
  replySendBtn: {
    paddingLeft: 8,
  },
});

export default StoryScreen;
