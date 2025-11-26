
// components/ScreenWrapper.tsx
import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenWrapperProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const ScreenWrapper = ({ children, style }: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
});

export default ScreenWrapper;
