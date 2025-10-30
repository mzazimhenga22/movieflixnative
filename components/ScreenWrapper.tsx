import { BlurView } from 'expo-blur';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ScreenWrapper = ({ children, hideHeader = false }: { children: React.ReactNode; hideHeader?: boolean }) => {
  // This wrapper used to optionally render a header in some projects.
  // We keep the prop so screens can opt-out explicitly if a header is present.
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <BlurView intensity={50} tint="dark" style={styles.card}>
          {/* If a project-wide header were present here we would conditionally hide it using hideHeader. */}
          {children}
        </BlurView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Add padding to avoid overlap with the tab bar
  },
  card: {
    width: width * 0.95,
    flex: 1, // Use flex to fill available space
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default ScreenWrapper;
