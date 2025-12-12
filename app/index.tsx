import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { onAuthChange } from './messaging/controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { buildProfileScopedKey, getStoredActiveProfile } from '../lib/profileStorage';

type RouteContext = 'authed' | 'guest' | 'offline-downloads';

type RoutePlan = {
  target: string;
  context: RouteContext;
  summary?: string | null;
};

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const delayHandle = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState('Calibrating your cinema...');
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [offlineSummary, setOfflineSummary] = useState<string | null>(null);

  const featureCards = useMemo(
    () => [
      { title: 'Stream Together', copy: 'Parties, synced chats, and cinematic UI.' },
      { title: 'Offline Vault', copy: 'Downloads stay ready when signal drops.' },
      { title: 'Made with ❤️', copy: 'Built to enjoy, binge, and repeat.' },
    ],
    []
  );

  const resolveOfflineDownloads = useCallback(async (): Promise<RoutePlan | null> => {
    try {
      const profile = await getStoredActiveProfile();
      if (!profile) return null;
      const scopeKey = buildProfileScopedKey('downloads', profile.id ?? undefined);
      const stored = await AsyncStorage.getItem(scopeKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          target: '/downloads',
          context: 'offline-downloads',
          summary: `${parsed.length} saved title${parsed.length === 1 ? '' : 's'} for ${
            profile.name || 'you'
          }`,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const decideInitialRoute = useCallback(
    async (user: any) => {
      if (hasNavigatedRef.current) return;
      if (user) {
        setOfflineSummary(null);
        setStatusMessage('Syncing your profiles...');
        setRoutePlan({ target: '/select-profile', context: 'authed' });
        return;
      }
      setStatusMessage('Checking offline access…');
      const offline = await resolveOfflineDownloads();
      if (offline) {
        setOfflineSummary(offline.summary ?? null);
        setStatusMessage('Offline vault unlocked');
        setRoutePlan(offline);
        return;
      }
      setOfflineSummary(null);
      setStatusMessage('Sign in to keep watching');
      setRoutePlan({ target: '/(auth)/login', context: 'guest' });
    },
    [resolveOfflineDownloads]
  );

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      void decideInitialRoute(user);
    });

    return () => {
      unsubscribe();
    };
  }, [decideInitialRoute]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  useEffect(() => {
    if (!routePlan || hasNavigatedRef.current) return;
    if (delayHandle.current) {
      clearTimeout(delayHandle.current);
    }
    delayHandle.current = setTimeout(() => {
      if (hasNavigatedRef.current || !routePlan) return;
      hasNavigatedRef.current = true;
      router.replace(routePlan.target);
    }, 1100);
    return () => {
      if (delayHandle.current) {
        clearTimeout(delayHandle.current);
      }
    };
  }, [routePlan]);

  useEffect(() => {
    return () => {
      if (delayHandle.current) {
        clearTimeout(delayHandle.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#05060f', '#090b1a', '#0b0d1f']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Animated.View style={[styles.logoCard, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.brandLine}>movieflix</Text>
        <Text style={styles.byLine}>made with love, binge on.</Text>
        <Text style={styles.heroCopy}>Premium streams, glowing UI, and offline-first downloads.</Text>
      </Animated.View>
      <View style={styles.featuresBlock}>
        {featureCards.map((item) => (
          <View key={item.title} style={styles.featureCard}>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureCopy}>{item.copy}</Text>
          </View>
        ))}
      </View>
      <View style={styles.spinnerRow}>
        <ActivityIndicator size="small" color="#e50914" />
        <Text style={styles.loadingText}>{statusMessage}</Text>
      </View>
      {offlineSummary ? <Text style={styles.offlineNote}>{offlineSummary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05060f',
  },
  logoCard: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(5,6,15,0.96)',
    shadowColor: '#e50914',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  brandLine: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#ffffff',
    textTransform: 'lowercase',
  },
  byLine: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  heroCopy: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  featuresBlock: {
    marginTop: 30,
    width: '84%',
    gap: 10,
  },
  featureCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  featureCopy: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  offlineNote: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
