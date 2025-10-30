import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function StoryUpload() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    // Here you would upload the story to your backend
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Futuristic gradient background */}
      <LinearGradient
        colors={[
          'rgba(255, 75, 75, 0.2)',
          'rgba(255, 45, 85, 0.1)',
          'rgba(255, 59, 48, 0.15)',
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Main content with ultra-modern blur effect */}
      <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
        {/* Floating header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.iconButton}
          >
            <BlurView intensity={60} tint="dark" style={styles.iconButtonBlur}>
              <Ionicons name="close" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.title}>New Story</Text>
          <TouchableOpacity 
            onPress={handlePost} 
            style={[styles.postButton, !selectedImage && styles.postButtonDisabled]}
            disabled={!selectedImage}
          >
            <BlurView intensity={selectedImage ? 40 : 20} tint="dark" style={styles.postButtonBlur}>
              <Text style={[styles.postText, !selectedImage && styles.postTextDisabled]}>Share</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {selectedImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.preview} />
              <BlurView intensity={60} tint="dark" style={styles.overlayControls}>
                <TouchableOpacity onPress={pickImage} style={styles.changeButton}>
                  <BlurView intensity={80} tint="dark" style={styles.changeButtonBlur}>
                    <Ionicons name="images" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.changeButtonText}>Change Media</Text>
                  </BlurView>
                </TouchableOpacity>
              </BlurView>
            </View>
          ) : (
            <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
              <BlurView intensity={40} tint="dark" style={styles.uploadButtonBlur}>
                <View style={styles.uploadContent}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="images-outline" size={32} color="#ff4b4b" />
                  </View>
                  <Text style={styles.uploadTitle}>Select Media</Text>
                  <Text style={styles.uploadSubtitle}>Share your movie moment</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blurContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  iconButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  iconButtonBlur: {
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  postButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  postButtonBlur: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postText: {
    color: '#ff4b4b',
    fontWeight: '600',
    fontSize: 16,
  },
  postTextDisabled: {
    color: '#666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadButton: {
    width: width * 0.85,
    aspectRatio: 9/16,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  uploadButtonBlur: {
    flex: 1,
    padding: 20,
  },
  uploadContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  previewContainer: {
    width: width * 0.85,
    aspectRatio: 9/16,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  overlayControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  changeButton: {
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  changeButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});