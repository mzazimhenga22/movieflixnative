import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    const currentRoute = pathname?.split('/').pop();
    return currentRoute === route || (route === 'index' && currentRoute === 'social-feed');
  };

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: insets.bottom }]}>
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blurWrap}
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? 'rgba(120,20,20,0.18)' // subtle deep red tint in dark mode
                : 'rgba(255,80,80,0.12)', // lighter tint in light mode
            },
          ]}
        />
        <View style={styles.inner}>
          <NavItem
            onPress={() => router.push('/social-feed')}
            icon="home"
            label="Feeds"
            active={isActive('index')}
          />
          <NavItem
            onPress={() => router.push('/social-feed/stories')}
            icon="time"
            label="Stories"
            active={isActive('stories')}
          />
          <NavItem
            onPress={() => router.push('/social-feed/notifications')}
            icon="notifications"
            label="Notifications"
            active={isActive('notifications')}
          />
          <NavItem
            onPress={() => router.push('/social-feed/streaks')}
            icon="flame"
            label="Streaks"
            active={isActive('streaks')}
          />
          <NavItem
            onPress={() => router.replace('/profile?from=social-feed')}
            icon="person"
            label="Profile"
            active={isActive('profile')}
          />
        </View>
      </BlurView>
    </View>
  );
}

function NavItem({
  onPress,
  icon,
  label,
  active,
}: {
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.item}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? '#ffd600' : '#fff'}
      />
      <Text style={[styles.text, active ? styles.activeText : undefined]}>
        {label}
      </Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // keep pointerEvents available for children
  },
  blurWrap: {
    width: '92%', // slightly inset from edges for a card-like look
    borderRadius: 22,
    overflow: 'hidden',
    // shadow for depth
    shadowColor: '#ff4b4b',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  activeText: {
    color: '#ffd600',
    fontWeight: '700',
    fontSize: 11,
  },
  activeDot: {
    marginTop: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffd600',
    alignSelf: 'center',
  },
});
