import React from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  scrollY: Animated.Value;
  onSettingsPress: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  headerHeight: number;
}

const Header = ({ scrollY, onSettingsPress, onSearchChange, searchQuery, headerHeight }: HeaderProps) => {
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight + (Platform.OS === 'ios' ? 20 : 12)],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.header, { height: headerHeight, transform: [{ translateY: headerTranslateY }] }]}>
      <View style={styles.topRow}>
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>Messages</Animated.Text>
        <TouchableOpacity onPress={onSettingsPress} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#a3a3a3" style={{ marginRight: 10 }} />
        <TextInput
          placeholder="Search messages or people"
          placeholderTextColor="#a3a3a3"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingRight: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    height: 36,
  },
});

export default Header;
