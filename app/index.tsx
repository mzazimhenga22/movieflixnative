import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { onAuthChange } from './messaging/controller';

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      // Decide initial route based on current auth session
      const target = user ? '/(tabs)/movies' : '/(auth)/login';
      router.replace(target);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoCard,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={styles.brandLine}>movieflix</Text>
        <Text style={styles.byLine}>yours by mzazimhenga</Text>
      </Animated.View>
      <View style={styles.spinnerRow}>
        <ActivityIndicator size="small" color="#e50914" />
        <Text style={styles.loadingText}>Warming up your stream...</Text>
      </View>
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
});
