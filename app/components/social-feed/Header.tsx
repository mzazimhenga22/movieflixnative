import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.leftIcon}>
        <Ionicons name="arrow-back" size={30} color="#ff6b6b" />
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.rightGroup}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/messaging')}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="search" size={26} color="#fff" />
        </TouchableOpacity>
        {/* Greeting removed as requested */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  leftIcon: {
    width: 45,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    paddingHorizontal: 8,
  },
  userText: {
    color: '#ccc',
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
  },
});
