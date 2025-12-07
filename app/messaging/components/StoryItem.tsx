import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

interface StoryLike {
  id: string;
  name?: string;
  avatar?: string;
  username?: string;
  photoURL?: string;
}

interface Props {
  item: StoryLike;
  onPress?: (p: StoryLike) => void;
}

const StoryItem = ({ item, onPress }: Props) => {
  const router = useRouter();

  const displayName = item.name || item.username || 'Story';
  const avatarUri = item.avatar || item.photoURL;

  const handleFeedPress = () => {
    router.push(`/feed/${item.id}?username=${encodeURIComponent(displayName)}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.storyItem} onPress={() => onPress?.(item)}>
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.storyAvatar} />
          ) : (
            <View style={[styles.storyAvatar, { backgroundColor: '#333' }]} />
          )}
        </View>
        <Text style={styles.storyName} numberOfLines={1}>{displayName}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.feedButton} onPress={handleFeedPress}>
        <Text style={styles.feedButtonText}>View Feed</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 12,
  },
  storyItem: {
    width: 72,
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 18,
    padding: 2,
    backgroundColor: 'linear-gradient(45deg, #4D8DFF, #8B5CF6)', // platform note: RN may ignore gradient; keep for design intent
    marginBottom: 6,
  },
  storyAvatar: {
    width: 62,
    height: 62,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4D8DFF',
  },
  storyName: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    width: 72,
  },
  feedButton: {
    marginTop: 8,
    backgroundColor: '#4D8DFF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  feedButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default StoryItem;
