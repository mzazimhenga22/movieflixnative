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

  // choose playable uri and headers from result
  const streamLike: any = (result as any)?.stream ?? result; // stub returns string; real provider returns object
  const firstStream = Array.isArray(streamLike) ? streamLike[0] : streamLike;

  // helper to pick a playable uri for file/hls
  const pickUriAndHeaders = (s: any) => {
    if (!s) return null;

    if (typeof s === 'string') {
      return { uri: s };
    }

    if (s.type === 'hls') {
      // playlist will be an m3u8 (maybe proxied). headers may be present
      return { uri: s.playlist, headers: s.headers ?? undefined };
    }

    if (s.type === 'file') {
      // choose best quality (1080 -> 720 -> first)
      const qualities = s.qualities || s.streams || {};
      const keys = Object.keys(qualities);
      if (keys.length === 0) return null;

      // prefer 1080, 720, then first
      const preferred = ['1080', '720', '480', '360', 'unknown'];
      let foundKey = keys.find((k) => preferred.includes(k.toString())) ?? keys[0];
      const file = qualities[foundKey];
      return { uri: file.url, headers: s.headers ?? undefined };
    }

    return null;
  };

  const playable = pickUriAndHeaders(firstStream);

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
