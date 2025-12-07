import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Platform, Alert, TouchableOpacity, Text, TextInput, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase, supabaseConfigured } from '../constants/supabase';
import { decode } from 'base-64';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useUser } from '../hooks/use-user';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../constants/firebase';

export default function StoryUpload() {
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const router = useRouter();
  const { user } = useUser();
  const fallbackUser = { uid: 'dev-user', displayName: 'You', photoURL: '' };
  const effectiveUser = (user as any) ?? fallbackUser;

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Media access is needed to pick a story image. You can enable this later in system settings.'
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not open your media library.');
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('No image', 'Pick an image first.');
      return;
    }
    if (!supabaseConfigured) {
      Alert.alert('Supabase not configured', 'Stories upload requires Supabase keys.');
      return;
    }

    try {
      setIsUploading(true);

      let finalUri = image;
      if (image.startsWith('file://')) {
        const manipResult = await manipulateAsync(
          image,
          [{ resize: { width: 900 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
      }

      const base64Data = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
      const binary = decode(base64Data);
      const fileBuffer = Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;

      const rawName = finalUri.split('/').pop() || `story-${Date.now()}`;
      const fileName = `${effectiveUser.uid}/${Date.now()}-${rawName}`.replace(/\s+/g, '_');

      const { data, error } = await supabase.storage
        .from('stories')
        .upload(fileName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from('stories').getPublicUrl(fileName);

      await addDoc(collection(firestore, 'stories'), {
        userId: effectiveUser.uid,
        username: (effectiveUser.displayName as string) || 'You',
        photoURL: publicUrl.publicUrl,
        caption,
        overlayText,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Story posted', 'Your story is now live.');
      router.replace('/social-feed');
    } catch (err: any) {
      console.error('Story upload error', err);
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#e50914', '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity style={styles.pickCard} onPress={pickImage} activeOpacity={0.9}>
          <LinearGradient
            colors={['rgba(229,9,20,0.22)', 'rgba(10,12,24,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.pickTitle}>{image ? 'Change story image' : 'Pick story image'}</Text>
          <Text style={styles.pickSubtitle}>Choose a photo from your gallery</Text>
        </TouchableOpacity>

        {image && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: image }} style={styles.image} />
            {overlayText ? (
              <View style={styles.overlayTextChip}>
                <Text style={styles.overlayTextPreview}>{overlayText}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.inputsWrap}>
          <Text style={styles.label}>Overlay text (supports emojis)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add a short phrase on top of your story…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={overlayText}
            onChangeText={setOverlayText}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Caption</Text>
          <TextInput
            style={[styles.textInput, styles.captionInput]}
            placeholder="Write a caption for your story…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            value={caption}
            onChangeText={setCaption}
          />
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, !image && styles.uploadButtonDisabled]}
          disabled={!image || isUploading}
          onPress={handleUpload}
        >
          <LinearGradient
            colors={['#ff5f6d', '#e50914']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.uploadGradient}
          >
            <Text style={styles.uploadText}>
              {isUploading ? 'Uploading…' : 'Post Story'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    alignItems: 'center',
    paddingBottom: 40,
  },
  pickCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 18,
  },
  pickTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  pickSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 18,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayTextChip: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayTextPreview: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputsWrap: {
    width: '100%',
    marginBottom: 18,
  },
  label: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  captionInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  uploadButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
