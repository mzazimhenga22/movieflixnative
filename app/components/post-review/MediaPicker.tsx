import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  timestamp?: number;
}

interface MediaPickerProps {
  onMediaPicked: (uri: string, type: 'image' | 'video') => void;
  onClose: () => void;
}

export default function MediaPicker({ onMediaPicked, onClose }: MediaPickerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        loadRecentMedia();
      } else {
        setLoading(false);
      }
    } catch (error) {
      setHasPermission(false);
      setLoading(false);
    }
  };

  const loadRecentMedia = async () => {
    try {
      // In a real implementation, you'd load recent photos from the device
      // For now, we'll show some placeholder items
      setRecentMedia([
        { id: '1', uri: 'https://picsum.photos/300/400?random=1', type: 'image', timestamp: Date.now() },
        { id: '2', uri: 'https://picsum.photos/300/400?random=2', type: 'image', timestamp: Date.now() - 1000 },
        { id: '3', uri: 'https://picsum.photos/300/400?random=3', type: 'image', timestamp: Date.now() - 2000 },
        { id: '4', uri: 'https://picsum.photos/300/400?random=4', type: 'image', timestamp: Date.now() - 3000 },
        { id: '5', uri: 'https://picsum.photos/300/400?random=5', type: 'image', timestamp: Date.now() - 4000 },
        { id: '6', uri: 'https://picsum.photos/300/400?random=6', type: 'image', timestamp: Date.now() - 5000 },
      ]);
    } catch (error) {
      console.warn('Failed to load recent media', error);
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mediaType = asset.type === 'video' ? 'video' : 'image';
        onMediaPicked(asset.uri, mediaType);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media from gallery');
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    onMediaPicked(media.uri, media.type);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="images" size={64} color="#666" />
        <Text style={styles.errorTitle}>Gallery Access Required</Text>
        <Text style={styles.errorText}>
          Please enable media library permissions in your device settings to create posts.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onClose}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onPress={() => handleMediaSelect(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
      {item.type === 'video' && (
        <View style={styles.videoIndicator}>
          <Ionicons name="videocam" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity onPress={pickFromGallery} style={styles.galleryButton}>
          <Ionicons name="images" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading recent photos...</Text>
        </View>
      ) : (
        <>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent</Text>
            <TouchableOpacity onPress={pickFromGallery}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={recentMedia}
            renderItem={renderMediaItem}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.mediaGrid}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.bottomOptions}>
            <TouchableOpacity style={styles.cameraOption} onPress={pickFromGallery}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.cameraGradient}
              >
                <Ionicons name="camera" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.cameraText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryOption} onPress={pickFromGallery}>
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.galleryGradient}
              >
                <Ionicons name="images" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mainScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  optionCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  cameraScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  cameraBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: '#ff4444',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4444',
  },
  galleryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  mediaGrid: {
    paddingHorizontal: 8,
    paddingBottom: 120,
  },
  mediaItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 4,
  },
  bottomOptions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cameraOption: {
    alignItems: 'center',
  },
  cameraGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cameraText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  galleryOption: {
    alignItems: 'center',
  },
  galleryGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  galleryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
