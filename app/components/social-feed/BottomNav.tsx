import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isSocialRoute = pathname?.startsWith('/social-feed');
  const isActive = (route: string) => {
    const currentRoute = pathname?.split('/').pop();
    return currentRoute === route || (route === 'index' && currentRoute === 'social-feed');
  };

  // Hide nav on profile screens (any profile path)
  if (!isSocialRoute || (pathname && /profile/i.test(pathname))) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: insets.bottom }]}>
      <BlurView intensity={95} tint="dark" style={styles.blurWrap}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(15,15,25,0.55)' }]} />
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassSheen}
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
      <View style={[styles.itemInner, active && styles.itemInnerActive]}>
        {active && (
          <LinearGradient
            colors={['#e50914', '#b20710']}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.activePill}
          />
        )}
        <Ionicons
          name={icon}
          size={22}
          color={active ? '#ffffff' : '#f5f5f5'}
        />
        <Text style={[styles.text, active ? styles.activeText : undefined]}>
          {label}
        </Text>
      </View>
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
    shadowColor: '#0b1736',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 72,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    minHeight: 68,
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minWidth: 50,
  },
  itemInner: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 2,
  },
  itemInnerActive: {
    shadowColor: '#e50914',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#fff',
    fontSize: 10.5,
    marginTop: 4,
  },
  activeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    opacity: 0.98,
  },
});
