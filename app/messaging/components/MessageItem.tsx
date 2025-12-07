import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Conversation, Profile } from '../controller';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../constants/firebase';
import { User } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

interface MessageItemProps {
  item: Conversation;
  onPress: (id: string) => void;
  currentUser: User | null;
  onLongPress?: (item: Conversation, rect: { x: number; y: number; width: number; height: number }) => void;
}
 
const MessageItem = ({ item, onPress, currentUser, onLongPress }: MessageItemProps) => {
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const rowRef = useRef<View | null>(null);
  const time = item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  useEffect(() => {
    if (item.isGroup) {
      setOtherUser(null);
      return;
    }
    if (Array.isArray(item.members) && currentUser) {
      const otherUserId = item.members.find((id: string) => id !== currentUser.uid);
      if (otherUserId) {
        const userDocRef = doc(firestore, 'users', otherUserId);
        getDoc(userDocRef).then(doc => {
          if (doc.exists()) {
            setOtherUser({ ...doc.data(), id: doc.id } as Profile);
          }
        });
      }
    }
  }, [item.members, currentUser]);

  const handleLongPress = () => {
    if (!onLongPress || !rowRef.current) return;
    rowRef.current.measureInWindow((x, y, width, height) => {
      onLongPress(item, { x, y, width, height });
    });
  };

  return (
    <TouchableOpacity
      ref={rowRef}
      style={styles.messageItem}
      onPress={() => onPress(item.id)}
      onLongPress={handleLongPress}
      activeOpacity={0.9}
    >
      <BlurView intensity={50} tint="dark" style={styles.card}>
        {item.isGroup ? (
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>
              {(item.name || 'G')
                .split(' ')
                .map((p: string) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
        ) : (
          <Image source={{ uri: otherUser?.photoURL }} style={styles.messageAvatar} />
        )}
        <View style={styles.messageContent}>
          <View style={styles.row}>
            <View style={styles.nameRow}>
              {!item.isGroup && (
                <View style={[styles.statusDot, otherUser?.status === 'online' && styles.statusDotOnline]} />
              )}
              <Text numberOfLines={1} style={styles.userName}>
                {item.isGroup ? item.name || 'Group' : otherUser?.displayName}
              </Text>
              {item.pinned && (
                <Ionicons
                  name="pin"
                  size={14}
                  color="rgba(255,255,255,0.85)"
                  style={styles.pinIcon}
                />
              )}
            </View>
            <Text style={styles.time}>{time}</Text>
          </View>
          <View style={styles.row}>
            <Text numberOfLines={1} style={styles.lastMessage}>{item.lastMessage}</Text>
            {item.unread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    shadowColor: '#050915',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  messageAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: 'rgba(229,9,20,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  groupAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  messageContent: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    maxWidth: '78%',
  },
  lastMessage: {
    color: '#bdbdbd',
    marginTop: 6,
    maxWidth: '86%',
  },
  time: {
    color: '#bdbdbd',
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#e50914',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '78%',
  },
  pinIcon: {
    marginLeft: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusDotOnline: {
    backgroundColor: '#4CD964',
  },
});

export default MessageItem;
