import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, Easing, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface StoryMedia {
  type: 'image' | 'video';
  uri: string;
}

export interface Story {
  id: number;
  title: string;
  image: string; // Thumbnail for the story
  media: StoryMedia[]; // Array of media items for the story
}

interface StoryProps {
  stories: Story[];
}

const StoryComponent: React.FC<StoryProps> = ({ stories }) => {
  const displayedStories = stories.slice(0, 4);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    // When stories change, trigger the animation
    slideAnim.setValue(100); // Start from below
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [stories]); // Dependency on the whole stories array

  const handleStoryPress = (story: Story) => {
    router.push({
      pathname: '/story-viewer',
      params: {
        stories: JSON.stringify(stories), // Pass all stories
        initialStoryId: story.id, // Pass the ID of the tapped story
      },
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.storiesContainer, { transform: [{ translateY: slideAnim }] }]}>
        {displayedStories.map((story) => (
          <TouchableOpacity key={story.id} style={styles.storyContainer} onPress={() => handleStoryPress(story)}>
            <Image source={{ uri: story.image }} style={styles.storyImage} />
            <Text style={styles.storyText} numberOfLines={1} ellipsizeMode="tail">
              {story.title}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100, // Fixed height for clipping
    overflow: 'hidden', // Clip the animation
    paddingVertical: 10,
  },
  storiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute stories evenly
    width: '100%',
  },
  storyContainer: {
    alignItems: 'center',
    width: 80, // Give each story a fixed width
  },
  storyImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FF4500',
  },
  storyText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default StoryComponent;
