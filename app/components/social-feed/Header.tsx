import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authPromise, firestore } from '../../../constants/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function SocialHeader({ title = 'Feeds' }: { title?: string }) {
  const router = useRouter();
  const [userName, setUserName] = useState('streamer');

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const init = async () => {
      try {
        const auth = await authPromise;

        // initial fetch of current user profile (if any)
        const user = auth.currentUser;
        if (user) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data() as any;
              setUserName(data?.name ?? 'streamer');
            }
          } catch (err) {
            console.error('SocialHeader: failed to fetch user doc', err);
          }
        }

        // subscribe to auth changes and update name when user changes
        unsub = onAuthStateChanged(auth, async (u) => {
          if (!u) {
            setUserName('streamer');
            return;
          }
          try {
            const userDoc = await getDoc(doc(firestore, 'users', u.uid));
            if (userDoc.exists()) {
              const data = userDoc.data() as any;
              setUserName(data?.name ?? 'streamer');
            } else {
              setUserName('streamer');
            }
          } catch (err) {
            console.error('SocialHeader: failed to fetch user on auth change', err);
            setUserName('streamer');
          }
        });
      } catch (err) {
        console.warn('SocialHeader: auth initialization failed', err);
        setUserName('streamer');
      }
    };

    init();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return (
    <View style={styles.headerWrap}>
      <LinearGradient
        colors={['#e50914', '#b20710']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGlow}
      />
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerSheen}
        />
        <View style={styles.leftIconWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.leftIcon}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.centerStack}>
          <Text style={styles.eyebrow}>Social</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtleText}>Welcome, {userName}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="flame" size={12} color="#fff" />
              <Text style={styles.metaText}>Trending</Text>
            </View>
            <View style={[styles.metaPill, styles.metaPillGhost]}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.metaText}>Live</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightGroup}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/messaging')}>
            <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginHorizontal: 12,
    marginTop: Platform.OS === 'ios' ? 44 : 18,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  leftIconWrap: {
    width: 48,
    alignItems: 'flex-start',
  },
  leftIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  centerStack: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  metaPillGhost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metaText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
