import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const StoryScreen = () => {
  const { photoURL } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
      <Image source={{ uri: photoURL as string }} style={styles.storyImage} resizeMode="cover" />
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  storyImage: {
    flex: 1,
  },
  closeButton: {
    padding: 12,
  },
});

export default StoryScreen;
