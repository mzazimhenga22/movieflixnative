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
          Alert.alert('Permission required', 'Please allow media access to pick files.');
          onClose();
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

        if (!result.canceled) {
          const asset = result.assets[0];
          const mediaType = asset.type === 'video' ? 'video' : 'image';
          onMediaPicked(asset.uri, mediaType);
        } else {
          onClose();
        }
      } catch (error) {
        console.error('Error picking media:', error);
        Alert.alert('Error', 'An error occurred while picking media. Please try again.');
        onClose();
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
