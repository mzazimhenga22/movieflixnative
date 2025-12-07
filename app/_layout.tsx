
// app/_layout.tsx
import 'react-native-get-random-values';
import '@react-native-anywhere/polyfill-base64';
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { CustomThemeProvider } from '../hooks/use-theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../constants/supabase';
import { AccentProvider } from './components/AccentContext';

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const redirectUrl = Linking.createURL('/post-review');
      // Supabase types sometimes miss getSessionFromUrl in certain versions; cast to any for now.
      const { data, error } = await (supabase.auth as any).getSessionFromUrl(event.url, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.warn('Deep link handling failed:', error);
        return;
      }

      if (data.session) {
        router.replace('/post-review');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <SafeAreaProvider>
        <CustomThemeProvider>
          <AccentProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="post-review" />
            </Stack>
          </AccentProvider>
        </CustomThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
