
// app/_layout.tsx
import 'react-native-get-random-values';
import '@react-native-anywhere/polyfill-base64';
import 'react-native-quick-crypto';
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { onAuthChange } from './messaging/controller';
import { CustomThemeProvider } from '../hooks/use-theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../constants/supabase';

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        router.replace('/(tabs)/movies');
      } else {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { data, error } = await supabase.auth.getSessionFromUrl(event.url, {
        redirectUrl: `https://firebase-movieflixnative-1761807036945.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev/--/post-review`,
      });
      if (data.session) {
        // You are now signed in.
        // You can now navigate to a protected screen.
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="post-review" />
          </Stack>
        </CustomThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
