import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { onStoriesUpdate } from './storiesController';
import { updateStreakForContext } from '@/lib/streaks/streakManager';

interface Props {
  showAddStory?: boolean;
}

export default function StoriesRow({ showAddStory = false }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stories, setStories] = useState<any[]>([]);
  // make item spacing responsive a bit
  const itemSize = width >= 420 ? 98 : 84;
  const avatarInner = Math.round(itemSize * 0.74);
  const ringSize = itemSize + 8;

  useEffect(() => {
    const unsubscribe = onStoriesUpdate((rawStories) => {
      const grouped: Record<string, any[]> = {};
      rawStories.forEach((s) => {
        const uid = s.userId || 'unknown';
        if (!grouped[uid]) grouped[uid] = [];
        grouped[uid].push(s);
      });

      const circles = Object.values(grouped).map((list) => {
        // sort by createdAt if available, newest last
        const sorted = [...list].sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return ta - tb;
        });
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        return {
          id: first.id, // use first story id as entry point
          userId: first.userId,
          username: first.username,
          photoURL: last.photoURL, // show thumbnail from latest story
        };
      });

      setStories(circles);
    });
    return () => unsubscribe();
  }, []);

  const handleStoryUpload = () => {
    router.push('/story-upload');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {showAddStory && (
          <TouchableOpacity
            onPress={() => {
              handleStoryUpload();
              void updateStreakForContext({ kind: 'story', userId: 'me', username: 'You' });
            }}
            style={styles.storyCard}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add your story"
          >
            <LinearGradient
              colors={['#3d3d3d', '#1c1c1c']}
              style={[styles.statusRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
            >
              <View
                style={[
                  styles.avatarInnerWrap,
                  {
                    width: avatarInner,
                    height: avatarInner,
                    borderRadius: avatarInner / 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      width: avatarInner,
                      height: avatarInner,
                      borderRadius: avatarInner / 2,
                    },
                  ]}
                />
                <View style={styles.plusBtn}>
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              </View>
            </LinearGradient>
            <Text style={styles.storyText} numberOfLines={1}>
              Your story
            </Text>
            <Text style={styles.smallText}>Tap to add</Text>
          </TouchableOpacity>
        )}

        {/* Other Stories */}
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyCard}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel={`${story.username}'s story`}
            onPress={() => {
              router.push(`/story/${story.id}?photoURL=${encodeURIComponent(story.photoURL ?? '')}`);
              void updateStreakForContext({
                kind: 'story',
                userId: story.userId,
                username: story.username,
              });
            }}
          >
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
            >
              <View
                style={[
                  styles.avatarInnerWrap,
                  {
                    width: avatarInner,
                    height: avatarInner,
                    borderRadius: avatarInner / 2,
                  },
                ]}
              >
                {story.photoURL ? (
                  <Image
                    source={{ uri: story.photoURL }}
                    style={[
                      styles.avatarImage,
                      { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 },
                    ]}
                  />
                )}
              </View>
            </LinearGradient>
            <Text style={styles.storyText} numberOfLines={1}>
              {story.username}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>Tap to view</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  storyCard: {
    alignItems: 'center',
    marginRight: 18,
  },
  statusRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarInnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2f2f2f',
  },
  plusBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#25D366',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#050505',
  },
  storyText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '700',
    maxWidth: 110,
    textAlign: 'center',
  },
  smallText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#25D366',
    marginRight: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
});
