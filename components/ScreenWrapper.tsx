import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ScreenWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <BlurView intensity={50} tint="dark" style={styles.card}>
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
