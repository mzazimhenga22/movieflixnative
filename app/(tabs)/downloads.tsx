import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../../components/ScreenWrapper';
import { getAccentFromPosterPath } from '../../constants/theme';
import { useAccent } from '../components/AccentContext';

  const DownloadsScreen = () => {
    const { setAccentColor } = useAccent();
    const accentColor = getAccentFromPosterPath('/downloads/accent');

    useEffect(() => {
      if (accentColor) {
        setAccentColor(accentColor);
      }
    }, [accentColor, setAccentColor]);
  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[accentColor, '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      />
      <LinearGradient
        colors={['rgba(125,216,255,0.2)', 'rgba(255,255,255,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bgOrbPrimary}
      />
      <LinearGradient
        colors={['rgba(113,0,255,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.bgOrbSecondary}
      />

      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={['#e50914', '#b20710']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGlow}
          />
          <View style={styles.headerCard}>
            <View style={styles.headerTitleRow}>
              <View style={styles.accentDot} />
              <View>
                <Text style={styles.headerEyebrow}>Offline shelf</Text>
                <Text style={styles.headerTitle}>Downloads</Text>
              </View>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Synced</Text>
              </View>
              <View style={[styles.pill, styles.pillGhost]}>
                <Text style={styles.pillText}>HD ready</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(229,9,20,0.22)', 'rgba(255,255,255,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlight}
          />
          <Text style={styles.title}>Nothing saved yet</Text>
          <Text style={styles.subtitle}>Grab movies and shows to watch offline. They will land here.</Text>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -60,
    left: -40,
    opacity: 0.6,
    transform: [{ rotate: '15deg' }],
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -90,
    right: -20,
    opacity: 0.55,
    transform: [{ rotate: '-12deg' }],
  },
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
    gap: 16,
  },
  headerWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  headerCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#fefefe',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  glassCard: {
    width: '100%',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  title: {
    color: '#fefefe',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e4e6f0',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default DownloadsScreen;
