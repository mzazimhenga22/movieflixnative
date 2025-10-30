import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function PostReview() {
  const router = useRouter();
  const [movieTitle, setMovieTitle] = useState('');
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    // Here you would post the review to your backend
    router.back();
  };

  const isValid = movieTitle.trim() && review.trim() && rating > 0;

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
          <Text style={styles.title}>Post Review</Text>
          <TouchableOpacity 
            onPress={handlePost} 
            style={[styles.postButton, !isValid && styles.postButtonDisabled]}
            disabled={!isValid}
          >
            <BlurView intensity={isValid ? 40 : 20} tint="dark" style={styles.postButtonBlur}>
              <Text style={[styles.postText, !isValid && styles.postTextDisabled]}>Post</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <BlurView intensity={30} tint="dark" style={styles.inputContainer}>
            <TextInput
              style={styles.movieTitleInput}
              placeholder="What movie did you watch?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={movieTitle}
              onChangeText={setMovieTitle}
            />
          </BlurView>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Rate the Movie</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <BlurView intensity={40} tint="dark" style={styles.starButtonBlur}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= rating ? '#ffb400' : 'rgba(255, 255, 255, 0.4)'}
                    />
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <BlurView intensity={30} tint="dark" style={styles.reviewInputContainer}>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your thoughts about the movie..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              value={review}
              onChangeText={setReview}
              textAlignVertical="top"
            />
          </BlurView>

          <TouchableOpacity onPress={pickImage} style={styles.imageUpload}>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <BlurView intensity={60} tint="dark" style={styles.changeImageButton}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </BlurView>
              </View>
            ) : (
              <BlurView intensity={30} tint="dark" style={styles.uploadPlaceholder}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="image-outline" size={32} color="#ff4b4b" />
                </View>
                <Text style={styles.uploadText}>Add a movie still (optional)</Text>
              </BlurView>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    padding: 16,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  movieTitleInput: {
    color: '#fff',
    fontSize: 18,
    padding: 16,
    fontWeight: '500',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  starButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  starButtonBlur: {
    padding: 8,
  },
  reviewInputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  reviewInput: {
    color: '#fff',
    fontSize: 16,
    padding: 16,
    height: 150,
  },
  imageUpload: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  selectedImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});