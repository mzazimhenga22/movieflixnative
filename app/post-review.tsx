
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MediaPicker from './components/post-review/MediaPicker';
import MediaPreview from './components/post-review/MediaPreview';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../constants/supabase';
import { decode, encode } from 'base-64';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useUser } from '../hooks/use-user';

if (typeof atob === 'undefined') {
  global.atob = decode;
}
if (typeof btoa === 'undefined') {
  global.btoa = (str: string) => encode(str);
}

export default function PostReviewScreen() {
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const navigation = useNavigation();
  const { user } = useUser();

  const handleMediaPick = (uri: string, type: 'image' | 'video') => {
    setMedia({ uri, type });
  };

  const handlePost = async (reviewData: any) => {
    if (!media) return;
    if (!user) {
      Alert.alert('Please sign in', 'You must be signed in to post.');
      return;
    }

    try {
      const onProgress = typeof reviewData?.onProgress === 'function' ? reviewData.onProgress : undefined;
      onProgress?.('Preparing media...');

      let finalUri = media.uri;
      let contentType = media.type === 'image' ? 'image/jpeg' : 'video/mp4';

      // ✅ Optimize images before upload
      if (media.type === 'image' && media.uri.startsWith('file://')) {
        const manipResult = await manipulateAsync(
          media.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
      }

      // ✅ Read file as Base64
      onProgress?.('Reading file...');
      const base64Data = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
      const fileBuffer = decode(base64Data);

      const rawName = finalUri.split('/').pop() || `upload-${Date.now()}`;
      const fileName = `${user.id}/${Date.now()}-${rawName}`.replace(/\s+/g, '_');

      onProgress?.('Uploading to Supabase (feeds bucket)...');

      // ✅ Upload directly to Supabase Storage (feeds bucket)
      const { data, error } = await supabase.storage
        .from('feeds') // ← updated bucket name
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      // ✅ Get public URL (if bucket is public)
      const { data: publicUrl } = supabase.storage.from('feeds').getPublicUrl(fileName);

      onProgress?.('Upload complete!');
      Alert.alert('Success', 'Your media has been uploaded.');

      console.log('✅ Uploaded file:', data);
      console.log('🌐 Public URL:', publicUrl.publicUrl);

      navigation.navigate('social-feed' as never);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload failed', error.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {!media ? (
        <MediaPicker onMediaPicked={handleMediaPick} onClose={() => navigation.goBack()} />
      ) : (
        <MediaPreview media={media} onPost={handlePost} user={user} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
});
