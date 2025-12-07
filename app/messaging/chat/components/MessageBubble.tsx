import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, GestureResponderEvent, Dimensions } from 'react-native';

interface MessageItem {
  id: string;
  text: string;
  sender: string;
  createdAt?: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  pinnedBy?: string[];
}

interface Props {
  item: MessageItem;
  isMe: boolean;
  avatar?: string;
  onLongPress?: (
    item: MessageItem,
    rect: { x: number; y: number; width: number; height: number }
  ) => void;
  onPressMedia?: (item: MessageItem) => void;
}

const MessageBubble = ({ item, isMe, avatar, onLongPress, onPressMedia }: Props) => {
  const time = item.createdAt?.toDate
    ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const bubbleRef = useRef<View | null>(null);
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);

  const handleLongPress = (event: GestureResponderEvent) => {
    if (!onLongPress || !bubbleRef.current) return;
    bubbleRef.current.measureInWindow((x, y, width, height) => {
      onLongPress(item, { x, y, width, height });
    });
  };

  const isPinned = Array.isArray(item.pinnedBy) && item.pinnedBy.length > 0;
  const hasImage = !!item.mediaUrl && item.mediaType === 'image';
  const hasVideo = !!item.mediaUrl && item.mediaType === 'video';

  useEffect(() => {
    if (!hasImage || !item.mediaUrl) {
      setMediaSize(null);
      return;
    }

    Image.getSize(
      item.mediaUrl,
      (width, height) => {
        if (!width || !height) {
          setMediaSize(null);
          return;
        }

        const screenWidth = Dimensions.get('window').width;
        const maxWidth = screenWidth * 0.65;
        const maxHeight = screenWidth * 0.8;

        let displayWidth = maxWidth;
        let displayHeight = (height / width) * displayWidth;

        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = (width / height) * displayHeight;
        }

        setMediaSize({ width: displayWidth, height: displayHeight });
      },
      () => {
        setMediaSize(null);
      },
    );
  }, [hasImage, item.mediaUrl]);

  const handlePress = () => {
    if (!onPressMedia) return;
    if (!item.mediaUrl || !item.mediaType) return;
    if (item.mediaType !== 'image' && item.mediaType !== 'video') return;

    onPressMedia(item);
  };

  return (
    <View ref={bubbleRef} style={[styles.wrap, isMe ? styles.rightWrap : styles.leftWrap]}>
      {!isMe && (
        avatar ? (
          <Image source={{ uri: avatar }} style={styles.leftAvatar} />
        ) : (
          <View style={{ width: 42 }} />
        )
      )}
      <View style={styles.bubbleContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          onLongPress={handleLongPress}
        >
          <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
            {isPinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
            {hasImage && (
              <Image
                source={{ uri: item.mediaUrl }}
                style={[
                  styles.mediaImage,
                  mediaSize && { width: mediaSize.width, height: mediaSize.height },
                ]}
              />
            )}
            {!!item.text && (
              <Text style={[styles.text, isMe ? styles.myText : styles.otherText]}>
                {item.text}
              </Text>
            )}
            {time ? <Text style={styles.time}>{time}</Text> : null}
          </View>
        </TouchableOpacity>
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
  bubbleContainer: {
    maxWidth: '80%',
  },
  bubble: {
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
    backgroundColor: '#e50914',
    borderTopRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.18)',
  },
  mediaImage: {
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
  pinnedLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
});

export default MessageBubble;
