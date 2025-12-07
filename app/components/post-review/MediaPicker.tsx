import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

interface MediaPickerProps {
  onMediaPicked: (uri: string, type: 'image' | 'video') => void;
  onClose: () => void;
}

export default function MediaPicker({ onMediaPicked, onClose }: MediaPickerProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const pickMedia = async () => {
      try {
        // ✅ Ask for permissions first
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Media access is needed to pick photos or videos. You can enable this later in system settings.'
          );
          // Stay on this screen instead of navigating away so you are not "locked out"
          setIsLoading(false);
          return;
        }

        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) console.log('Running inside Expo Go');

        // ✅ Launch picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const mediaType = asset.type === 'video' ? 'video' : 'image';
          onMediaPicked(asset.uri, mediaType);
        } else {
          // If the picker reports "canceled" (including odd cases where the
          // user thinks they selected something), just stop loading and
          // stay on this screen instead of navigating back to the feed.
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error picking media:', error);
        Alert.alert('Error', 'An error occurred while picking media. Please try again.');
        // Do not auto-close; just stop the loader so user can try again
      } finally {
        setIsLoading(false);
      }
    };

    pickMedia();
  }, [onMediaPicked, onClose]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
