import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, Easing } from 'react-native';

interface Story {
  id: number;
  title: string;
  image: string;
}

interface StoryProps {
  stories: Story[];
}

const StoryComponent: React.FC<StoryProps> = ({ stories }) => {
  const displayedStories = stories.slice(0, 4);
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.storiesContainer, { transform: [{ translateY: slideAnim }] }]}>
        {displayedStories.map((story) => (
          <View key={story.id} style={styles.storyContainer}>
            <Image source={{ uri: story.image }} style={styles.storyImage} />
            <Text style={styles.storyText} numberOfLines={1} ellipsizeMode="tail">
              {story.title}
            </Text>
          </View>
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
