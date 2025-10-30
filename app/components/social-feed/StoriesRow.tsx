import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock data for stories - in a real app this would come from your backend
const MOCK_STORIES = [
  { id: 1, username: 'John', hasStory: true },
  { id: 2, username: 'Sarah', hasStory: true },
  { id: 3, username: 'Mike', hasStory: true },
];

interface Props {
  showAddStory?: boolean;
}

export default function StoriesRow({ showAddStory = false }: Props) {
  const router = useRouter();

  const handleStoryUpload = () => {
    // Navigate to story upload screen
    router.push('/story-upload');
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {showAddStory && (
          <TouchableOpacity style={styles.storyItem} onPress={handleStoryUpload}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar} />
              <TouchableOpacity style={styles.plusBtn}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.storyText}>Your story</Text>
          </TouchableOpacity>
        )}

        {/* Other Stories */}
        {MOCK_STORIES.map((story) => (
          <TouchableOpacity key={story.id} style={styles.storyItem}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, styles.hasStory]} />
            </View>
            <Text style={styles.storyText}>{story.username}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3a3a3a',
  },
  hasStory: {
    borderWidth: 2,
    borderColor: '#ff4b4b',
  },
  plusBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ff3d3d',
    borderRadius: 12,
    padding: 4,
  },
  storyText: {
    color: '#ddd',
    fontSize: 12,
  },
});