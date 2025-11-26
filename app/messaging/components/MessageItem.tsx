import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Conversation, Profile } from '../messagesController';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../constants/firebase';
import { User } from 'firebase/auth';

interface MessageItemProps {
  item: Conversation;
  onPress: (id: string) => void;
  currentUser: User | null;
}

const MessageItem = ({ item, onPress, currentUser }: MessageItemProps) => {
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const time = item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  useEffect(() => {
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

  return (
    <TouchableOpacity style={styles.messageItem} onPress={() => onPress(item.id)}>
      <Image source={{ uri: otherUser?.photoURL }} style={styles.messageAvatar} />
      <View style={styles.messageContent}>
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.userName}>{otherUser?.displayName}</Text>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'transparent',
  },
  messageAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    backgroundColor: '#4D8DFF',
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
});

export default MessageItem;
