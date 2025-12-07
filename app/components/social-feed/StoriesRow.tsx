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
import { onStoriesUpdate } from './storiesController';

interface Props {
  showAddStory?: boolean;
}

export default function StoriesRow({ showAddStory = false }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stories, setStories] = useState<any[]>([]);
  // make item spacing responsive a bit
  const itemSize = width >= 420 ? 98 : 84; // avatar diameter
  const avatarInner = Math.round(itemSize * 0.78); // inner avatar size

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
            onPress={handleStoryUpload}
            style={[styles.storyItem, { width: itemSize }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add your story"
          >
            <View style={[styles.ring, styles.addRing, { width: itemSize, height: itemSize, borderRadius: itemSize / 2 }]}>
              <View style={[styles.avatarInnerWrap, { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 }]}>
                <View style={[styles.avatar, { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 }]} />
                <View style={[styles.plusBtn, { right: -8, bottom: -8 }]}>
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              </View>
            </View>
            <Text style={styles.storyText} numberOfLines={1} ellipsizeMode="tail">
              Your story
            </Text>
            <Text style={styles.smallText}>Tap to add</Text>
          </TouchableOpacity>
        )}

        {/* Other Stories */}
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={[styles.storyItem, { width: itemSize }]}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel={`${story.username}'s story`}
            onPress={() =>
              router.push(
                `/story/${story.id}?photoURL=${encodeURIComponent(story.photoURL ?? '')}`
              )
            }
          >
            <View style={[styles.ring, { width: itemSize, height: itemSize, borderRadius: itemSize / 2 }]}>
              <View style={[styles.avatarInnerWrap, { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 }]}>
                {story.photoURL ? (
                  <Image
                    source={{ uri: story.photoURL }}
                    style={[styles.avatarImage, { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatar, { width: avatarInner, height: avatarInner, borderRadius: avatarInner / 2 }]} />
                )}
              </View>
            </View>
            <Text style={styles.storyText} numberOfLines={1} ellipsizeMode="tail">
              {story.username}
            </Text>
            <Text style={styles.smallText}>Live</Text>
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
  storyItem: {
    alignItems: 'center',
    marginRight: 18,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    // simulated gradient ring using layered borders (suits most designs without extra deps)
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  addRing: {
    // warmer accent for add/personal story
    borderColor: 'rgba(255,61,61,0.18)',
  },
  avatarInnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatarImage: {
    backgroundColor: '#111',
  },
  avatar: {
    backgroundColor: '#2f2f2f',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  plusBtn: {
    position: 'absolute',
    backgroundColor: '#ff3d3d',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#1b1b1b',
    shadowColor: '#ff3d3d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  storyText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '700',
    maxWidth: 110,
    textAlign: 'center',
  },
  smallText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 2,
  },
});
