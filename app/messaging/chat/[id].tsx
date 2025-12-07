import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  onMessagesUpdate,
  sendMessage,
  onConversationUpdate,
  onAuthChange,
  Profile,
  updateConversationStatus,
  onUserProfileUpdate,
  setTyping,
  onUserTyping,
  deleteMessageForMe,
  deleteMessageForAll,
  editMessage,
  pinMessage,
  unpinMessage,
} from '../controller';

import ScreenWrapper from '../../../components/ScreenWrapper';
import MessageBubble from './components/MessageBubble';
import ChatHeader from './components/ChatHeader';
import MessageInput from './components/MessageInput';
import { LinearGradient } from 'expo-linear-gradient';
import { getAccentFromPosterPath } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase, supabaseConfigured } from '../../../constants/supabase';
import { decode } from 'base-64';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Video, ResizeMode } from 'expo-av';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ChatScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [selectedMessageRect, setSelectedMessageRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{ uri: string; type: 'image' | 'video' | 'file' } | null>(null);
  const [pendingCaption, setPendingCaption] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback((animated = true) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange(setUser);
    const unsubscribeConversation = onConversationUpdate(id as string, setConversation);
    const unsubscribeMessages = onMessagesUpdate(id as string, setMessages);

    return () => {
      unsubscribeAuth();
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [id]);

  useEffect(() => {
    if (!conversation?.members || !user?.uid) return;

    const otherUserId = conversation.members.find((uid: string) => uid !== user.uid);
    if (!otherUserId) return;

    const unsubscribeProfile = onUserProfileUpdate(otherUserId, setOtherUser);
    const unsubscribeTyping = onUserTyping(id as string, otherUserId, setIsOtherTyping);

    return () => {
      unsubscribeProfile();
      unsubscribeTyping();
    };
  }, [conversation, id, user?.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom]);

  const visibleMessages = useMemo(() => {
    if (!user) return messages;
    return messages.filter((m: any) => {
      if (m.deleted) return false;
      if (Array.isArray(m.deletedFor) && m.deletedFor.includes(user.uid)) {
        return false;
      }
      return true;
    });
  }, [messages, user]);

  const mediaMessages = useMemo(() => {
    return visibleMessages.filter(
      (m: any) =>
        m.mediaUrl &&
        (m.mediaType === 'image' || m.mediaType === 'video'),
    );
  }, [visibleMessages]);

  const pinnedMessage = useMemo(() => {
    if (!user) return null;
    const pinnedForUser = messages.filter(
      (m: any) => Array.isArray(m.pinnedBy) && m.pinnedBy.includes(user.uid),
    );
    if (pinnedForUser.length === 0) return null;
    return pinnedForUser[pinnedForUser.length - 1];
  }, [messages, user]);

  const uploadChatMedia = useCallback(
    async (uri: string, type: 'image' | 'video' | 'file'): Promise<{ url: string; mediaType: 'image' | 'video' | 'file' } | null> => {
      if (!user || !supabaseConfigured) return null;

      try {
        const finalUri = uri;
        const base64Data = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
        const binary: string = decode(base64Data);
        const fileBuffer = Uint8Array.from(binary, (c: string) => c.charCodeAt(0)).buffer;

        const rawName = finalUri.split('/').pop() || `chat-${Date.now()}`;
        const safeName = rawName.replace(/\s+/g, '_');
        const bucket = 'chats';
        const fileName = `${id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileBuffer, {
            contentType:
              type === 'image'
                ? 'image/jpeg'
                : type === 'video'
                ? 'video/mp4'
                : 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          console.error('Chat media upload error', uploadError);
          return null;
        }

        const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(fileName);
        const url = (publicUrl as any)?.publicUrl ?? (publicUrl as any)?.public_url ?? null;
        if (!url) return null;

        return { url, mediaType: type };
      } catch (err) {
        console.error('Failed to upload chat media', err);
        return null;
      }
    },
    [conversation?.isGroup, id, user],
  );

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !user) return;

    const trimmed = text.trim();

    if (editingMessage && editingMessage.id) {
      void editMessage(id as string, editingMessage.id, trimmed);
      setEditingMessage(null);
      setReplyTo(null);
    } else {
      const newMessage: any = {
        text: trimmed,
        sender: user.uid,
      };

      if (replyTo) {
        newMessage.replyToMessageId = replyTo.id;
        newMessage.replyToText = replyTo.text;
        newMessage.replyToSenderId = replyTo.sender;
      }

      sendMessage(id as string, newMessage);
    }

    setReplyTo(null);
    void setTyping(id as string, user.uid, false);
  };

  const handleAcceptRequest = () => {
    updateConversationStatus(id as string, 'active');
  };

  const isRequest = conversation?.status === 'pending';
  const requestInitiator = conversation?.members.find((uid: string) => uid !== otherUser?.id) || null;
  const canAccept = isRequest && requestInitiator !== user?.uid;
  const canSend = !isRequest || (isRequest && requestInitiator !== user?.uid);

  const handleTypingChange = (typing: boolean) => {
    if (!user) return;
    void setTyping(id as string, user.uid, typing);
  };

  const handleMediaPicked = async (uri: string, type: 'image' | 'video') => {
    setPendingMedia({ uri, type });
    setPendingCaption('');
  };

  const handleCropPendingMedia = async () => {
    if (!pendingMedia || pendingMedia.type !== 'image') return;
    try {
      const result = await manipulateAsync(
        pendingMedia.uri,
        [{ resize: { width: 900 } }],
        { compress: 0.8, format: SaveFormat.JPEG },
      );
      setPendingMedia({ ...pendingMedia, uri: result.uri });
    } catch (err) {
      console.error('Failed to crop media', err);
    }
  };

  const handleSendPendingMedia = async () => {
    if (!pendingMedia || !user) return;
    const uploaded = await uploadChatMedia(pendingMedia.uri, pendingMedia.type);
    if (!uploaded) return;

    const newMessage: any = {
      text: pendingCaption.trim() || (pendingMedia.type === 'image' ? 'Photo' : pendingMedia.type === 'video' ? 'Video' : 'File'),
      sender: user.uid,
      mediaUrl: uploaded.url,
      mediaType: uploaded.mediaType,
    };

    sendMessage(id as string, newMessage);
    setPendingMedia(null);
    setPendingCaption('');
  };

  const handleOpenMedia = (message: any) => {
    if (!message?.mediaUrl || !message.mediaType) return;
    if (message.mediaType !== 'image' && message.mediaType !== 'video') return;

    const index = mediaMessages.findIndex((m: any) => m.id === message.id);
    if (index < 0) return;

    const mediaPayload = mediaMessages.map((m: any) => ({
      id: m.id,
      url: m.mediaUrl,
      type: m.mediaType,
    }));

    router.push({
      pathname: '/messaging/chat/media-viewer',
      params: {
        conversationId: id as string,
        media: JSON.stringify(mediaPayload),
        index: String(index),
      },
    });
  };

  const accentColor = '#e50914';

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[accentColor, '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
          <View style={styles.container}>
            <ChatHeader recipient={otherUser} conversation={conversation} isTyping={isOtherTyping} />
            {pinnedMessage && (
              <View style={styles.pinnedBanner}>
                <Ionicons name="pin" size={14} color="rgba(255,255,255,0.9)" style={{ marginRight: 6 }} />
                <Text
                  style={styles.pinnedText}
                  numberOfLines={1}
                >
                  {pinnedMessage.text || ''}
                </Text>
              </View>
            )}
              <FlatList
                ref={flatListRef}
                data={visibleMessages}
                renderItem={({ item }) => (
                  <MessageBubble
                    item={item}
                    isMe={item.sender === user?.uid}
                    avatar={otherUser?.photoURL || ''}
                    onLongPress={(msg, rect) => {
                      setSelectedMessage(msg);
                      setSelectedMessageRect(rect);
                    }}
                    onPressMedia={handleOpenMedia}
                  />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
            <View style={styles.inputContainer}>
              {canAccept ? (
                <View style={styles.requestBar}>
                  <TouchableOpacity onPress={handleAcceptRequest} style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTypingChange={handleTypingChange}
                  onPickMedia={handleMediaPicked}
                  disabled={!canSend}
                  replyLabel={replyTo ? (replyTo.text || '').slice(0, 60) : undefined}
                  isEditing={!!editingMessage}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>

        {selectedMessage && selectedMessageRect && (
          <View style={styles.spotlightOverlay} pointerEvents="box-none">
            {/* Heavy blur over entire chat */}
            <TouchableOpacity
              style={styles.spotlightTouch}
              activeOpacity={1}
              onPress={() => {
                setSelectedMessage(null);
                setSelectedMessageRect(null);
              }}
            >
              <View style={styles.spotlightBackdrop} />
            </TouchableOpacity>

            {/* Elevated bubble */}
            <View style={[styles.spotlightBubbleContainer, { top: selectedMessageRect.y }]}>
              <MessageBubble
                item={selectedMessage}
                isMe={selectedMessage.sender === user?.uid}
                avatar={otherUser?.photoURL || ''}
                onLongPress={() => {}}
              />
            </View>

            {/* Vertical actions under bubble */}
            <View
              style={[
                styles.spotlightActionsContainer,
                { top: selectedMessageRect.y + selectedMessageRect.height + 8 },
              ]}
            >
              <TouchableOpacity
                style={styles.spotlightPill}
                onPress={() => {
                  setReplyTo(selectedMessage);
                  setSelectedMessage(null);
                  setSelectedMessageRect(null);
                }}
              >
                <Text style={styles.spotlightPillText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.spotlightPill}
                onPress={() => {
                  if (selectedMessage?.id && user?.uid) {
                    const alreadyPinned =
                      Array.isArray(selectedMessage.pinnedBy) &&
                      selectedMessage.pinnedBy.includes(user.uid);
                    if (alreadyPinned) {
                      void unpinMessage(id as string, selectedMessage.id, user.uid);
                    } else {
                      void pinMessage(id as string, selectedMessage.id, user.uid);
                    }
                  }
                  setSelectedMessage(null);
                  setSelectedMessageRect(null);
                }}
              >
                <Text style={styles.spotlightPillText}>
                  {Array.isArray(selectedMessage?.pinnedBy) &&
                  user?.uid &&
                  selectedMessage.pinnedBy.includes(user.uid)
                    ? 'Unpin'
                    : 'Pin'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.spotlightPill, styles.spotlightPillDanger]}
                onPress={() => {
                  if (selectedMessage?.id && user?.uid) {
                    if (selectedMessage.sender === user.uid) {
                      void deleteMessageForAll(id as string, selectedMessage.id);
                    } else {
                      void deleteMessageForMe(id as string, selectedMessage.id, user.uid);
                    }
                  }
                  setSelectedMessage(null);
                  setSelectedMessageRect(null);
                }}
              >
                <Text style={styles.spotlightPillDangerText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

          {pendingMedia && (
          <View style={styles.mediaSheetOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.mediaSheetBackdrop}
              activeOpacity={1}
              onPress={() => {
                setPendingMedia(null);
                setPendingCaption('');
              }}
            />
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                style={styles.mediaSheetAvoid}
              >
                <View style={styles.mediaSheet}>
                <View style={styles.mediaSheetHandle} />
                <View style={styles.mediaPreviewHeader}>
                  <Text style={styles.mediaPreviewTitle}>Preview</Text>
                  {pendingMedia.type === 'image' && (
                    <TouchableOpacity onPress={handleCropPendingMedia} style={styles.mediaCropButton}>
                      <Ionicons name="crop-outline" size={18} color="#fff" />
                      <Text style={styles.mediaCropLabel}>Crop</Text>
                    </TouchableOpacity>
                  )}
                </View>
                  <View style={styles.mediaPreviewWrap}>
                    {pendingMedia.type === 'image' ? (
                      <Image
                        source={{ uri: pendingMedia.uri }}
                        style={styles.mediaPreviewImage}
                        resizeMode="contain"
                      />
                    ) : pendingMedia.type === 'video' ? (
                      <Video
                        source={{ uri: pendingMedia.uri }}
                        style={styles.mediaPreviewImage}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                      />
                    ) : (
                      <View style={styles.mediaPreviewPlaceholder}>
                        <Ionicons
                          name="document-outline"
                          size={32}
                          color="#fff"
                        />
                        <Text style={styles.mediaPreviewLabel}>
                          File selected
                        </Text>
                      </View>
                    )}
                  </View>
                <View style={styles.mediaCaptionRow}>
                  <TextInput
                    style={styles.mediaCaptionInput}
                    placeholder="Add a caption..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={pendingCaption}
                    onChangeText={setPendingCaption}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.mediaSendButton}
                    onPress={handleSendPendingMedia}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mediaSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    justifyContent: 'flex-end',
  },
  mediaSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  mediaSheet: {
    backgroundColor: '#05060f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  mediaSheetAvoid: {
    justifyContent: 'flex-end',
  },
  mediaSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  mediaPreviewWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mediaPreviewTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mediaCropLabel: {
    marginLeft: 4,
    color: '#fff',
    fontSize: 12,
  },
  mediaPreviewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mediaPreviewPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewLabel: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  mediaCaptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  mediaCaptionInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mediaSendButton: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pinnedText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputContainer: {
    paddingBottom: 20, // Adjust this value to bring the input up
  },
  requestBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  acceptButton: {
    backgroundColor: '#4D8DFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  spotlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  spotlightBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  spotlightTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlightBubbleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  spotlightActionsContainer: {
    position: 'absolute',
    right: 40,
    paddingHorizontal: 8,
  },
  spotlightPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 8,
  },
  spotlightPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  spotlightPillDanger: {
    backgroundColor: 'rgba(255,75,75,0.15)',
    borderColor: 'rgba(255,75,75,0.6)',
  },
  spotlightPillDangerText: {
    color: '#ff4b4b',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ChatScreen;
