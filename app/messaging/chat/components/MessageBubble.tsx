import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageItem {
  id?: string;
  text?: string;
  sender?: string;
  createdAt?: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file' | null;
  pinnedBy?: string[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: { [emoji: string]: string[] };
  forwarded?: boolean;
  forwardedFrom?: string;
  replyToMessageId?: string;
  replyToText?: string;
  replyToSenderId?: string;
  replyToSenderName?: string;
  callType?: 'video' | 'voice' | null;
  callStatus?: 'started' | 'ended' | 'missed' | 'declined' | null;
  callDuration?: number | null;
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
  onPressReaction?: (emoji: string) => void;
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
  const isCallMessage = !!(item.callType && item.callStatus);

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

  const renderStatusIcon = () => {
    if (!isMe || !item.status) return null;
    switch (item.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />;
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#4CD964" />;
      default:
        return null;
    }
  };

  const renderReactions = () => {
    if (!item.reactions) return null;
    const reactionEntries = Object.entries(item.reactions).filter(([, users]) => users.length > 0);
    if (reactionEntries.length === 0) return null;

    return (
      <View style={styles.reactionsContainer}>
        {reactionEntries.map(([emoji, users]) => (
          <TouchableOpacity
            key={emoji}
            style={styles.reactionBubble}
            onPress={() => {/* TODO: handle reaction press */}}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={styles.reactionCount}>{users.length}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
            {item.forwarded && (
              <View style={styles.forwardedContainer}>
                <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.forwardedLabel}>Forwarded</Text>
              </View>
            )}
            {item.replyToText && (
              <View style={styles.replyContainer}>
                <View style={styles.replyLine} />
                <Text style={styles.replySender} numberOfLines={1}>
                  {item.replyToSenderName || 'Someone'}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.replyToText}
                </Text>
              </View>
            )}
            {isPinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
            {isCallMessage ? (
              <View style={styles.callMessageContainer}>
                <View style={styles.callIconContainer}>
                  <Ionicons
                    name={item.callType === 'video' ? 'videocam' : 'call'}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.callMessageContent}>
                  <Text style={[styles.callMessageText, isMe ? styles.myText : styles.otherText]}>
                    {item.callStatus === 'started' && `Started ${item.callType} call`}
                    {item.callStatus === 'ended' && `Call ended`}
                    {item.callStatus === 'missed' && `Missed ${item.callType} call`}
                    {item.callStatus === 'declined' && `Declined ${item.callType} call`}
                  </Text>
                  {item.callDuration && item.callStatus === 'ended' && (
                    <Text style={styles.callDuration}>
                      Duration: {Math.floor(item.callDuration / 60)}:{String(item.callDuration % 60).padStart(2, '0')}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <>
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
              </>
            )}
            <View style={styles.footerRow}>
              <Text style={styles.time}>{time}</Text>
              {renderStatusIcon()}
            </View>
          </View>
        </TouchableOpacity>
        {renderReactions()}
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 4,
  },
  pinnedLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  forwardedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  forwardedLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 4,
  },
  replyContainer: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(229,9,20,0.6)',
    paddingLeft: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    paddingVertical: 4,
  },
  replyLine: {
    position: 'absolute',
    left: -3,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(229,9,20,0.6)',
  },
  replySender: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  replyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    maxWidth: '80%',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  callMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229,9,20,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  callMessageContent: {
    flex: 1,
  },
  callMessageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  callDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});

export default MessageBubble;
