// src/App.tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Button, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import Video from 'react-native-video';

// Polyfills: import these near your app entry (index.js / App.tsx) BEFORE using p-stream
// 1) base64 polyfill
import '@react-native-anywhere/polyfill-base64';

import { usePStream } from './usePStream';

export default function App() {
  const { loading, error, result, scrape } = usePStream();
  const [tmdbId, setTmdbId] = useState('11527'); // The Shining example

  const start = () => {
    const media = {
      type: 'movie',
      title: 'The Shining',
      tmdbId: tmdbId,
    } as any;

    scrape(media);
  };

  const playable = result ? { uri: result.uri, headers: result.headers } : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>p-stream (React Native) demo</Text>

        <TextInput style={styles.input} value={tmdbId} onChangeText={setTmdbId} keyboardType="numeric" placeholder="TMDB ID" />

        <Button title="Scrape & Play" onPress={start} />

        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
        {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}

        {playable ? (
          <View style={{ marginTop: 16, height: 260 }}>
            <Text>Playing: {playable.uri}</Text>
            <Video
              source={{ uri: playable.uri, headers: playable.headers }}
              style={{ flex: 1 }}
              controls
              resizeMode="contain"
              // other props: onError, onBuffer, etc.
            />
          </View>
        ) : (
          <Text style={{ marginTop: 12 }}>No playable stream yet</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 12, borderRadius: 6 },
});
