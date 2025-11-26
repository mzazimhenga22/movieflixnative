import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface MessageItem {
  id: string;
  text: string;
  sender: string; // 'me' or 'other'
  createdAt?: any;
}

interface Props {
  item: MessageItem;
  isMe: boolean;
  avatar?: string; // avatar of the other user (used for left bubbles)
}

const MessageBubble = ({ item, isMe, avatar }: Props) => {
  const time = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={[styles.wrap, isMe ? styles.rightWrap : styles.leftWrap]}>
      {!isMe && avatar ? <Image source={{ uri: avatar }} style={styles.leftAvatar} /> : <View style={{ width: 42 }} />}
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.text, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  leftWrap: {
    justifyContent: 'flex-start',
  },
  rightWrap: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  leftAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#183BFF',
    borderTopRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: 'white',
    fontWeight: '600',
  },
  otherText: {
    color: 'rgba(255,255,255,0.92)',
  },
  time: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
  },
});

export default MessageBubble;
