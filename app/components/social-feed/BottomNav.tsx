import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => {
    const currentRoute = pathname.split('/').pop();
    return currentRoute === route || (route === 'index' && currentRoute === 'social-feed');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => router.push('./')}
      >
        <Ionicons 
          name="home" 
          size={22} 
          color={isActive('index') ? "#ffd600" : "#fff"} 
        />
        <Text style={isActive('index') ? styles.active : styles.text}>Feeds</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.item} 
        onPress={() => router.push('./stories')}
      >
        <Ionicons 
          name="time" 
          size={22} 
          color={isActive('stories') ? "#ffd600" : "#fff"} 
        />
        <Text style={isActive('stories') ? styles.active : styles.text}>Stories</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.item} 
        onPress={() => router.push('./notifications')}
      >
        <Ionicons 
          name="notifications" 
          size={22} 
          color={isActive('notifications') ? "#ffd600" : "#fff"} 
        />
        <Text style={isActive('notifications') ? styles.active : styles.text}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.item} 
        onPress={() => router.push('./streaks')}
      >
        <Ionicons 
          name="flame" 
          size={22} 
          color={isActive('/social-feed/streaks') ? "#ffd600" : "#fff"} 
        />
        <Text style={isActive('/social-feed/streaks') ? styles.active : styles.text}>Streaks</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.item} 
        onPress={() => router.replace('/profile')}
      >
        <Ionicons 
          name="person" 
          size={22} 
          color={isActive('/profile') ? "#ffd600" : "#fff"} 
        />
        <Text style={isActive('/profile') ? styles.active : styles.text}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    paddingBottom: 24, // Add extra padding for safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  item: { 
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  text: { 
    color: '#fff', 
    fontSize: 11,
    marginTop: 4,
  },
  active: { 
    color: '#ff4b4b', 
    fontSize: 11, 
    fontWeight: '700',
    marginTop: 4,
  },
});
