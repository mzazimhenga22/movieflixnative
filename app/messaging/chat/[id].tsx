import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import {
  Conversation,
  deleteMessageForAll,
  deleteMessageForMe,
  editMessage,
  findOrCreateConversation,
  getProfileById,
  markConversationRead,
  onAuthChange,
  onConversationUpdate,
  onMessagesUpdate,
  onUserProfileUpdate,
  onUserTyping,
  pinMessage,
  Profile,
  sendMessage,
  setTyping,
  unpinMessage,
  updateConversationStatus,
  addMessageReaction,
  removeMessageReaction,
  forwardMessage,
  updateMessageStatus,
  markMessagesDelivered,
  markMessagesRead,
  getLastSeen,
} from '../controller';

import { createCallSession } from '@/lib/calls/callService';
import type { CallType } from '@/lib/calls/types';
import { getChatStreak, updateStreakForContext } from '@/lib/streaks/streakManager';
import { Ionicons } from '@expo/vector-icons';

import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { supabase, supabaseConfigured } from '../../../constants/supabase';
import { useMessagingSettings } from '@/hooks/useMessagingSettings';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import MessageInput from './components/MessageInput';

// Message search functionality
const MessageSearch = ({ visible, onClose, onSearch, searchResults, onJumpToMessage }: {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  searchResults: ChatMessage[];
  onJumpToMessage: (messageId: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  if (!visible) return null;

  return (
    <View style={styles.searchOverlay}>
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={onClose} style={styles.searchCloseBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id || `search-${Math.random()}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchResult}
              onPress={() => onJumpToMessage(item.id || '')}
            >
              <Text style={styles.searchResultText} numberOfLines={2}>
                {item.text}
              </Text>
              <Text style={styles.searchResultTime}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.searchResults}
        />
      )}
    </View>
  );
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
} & Partial<Profile>;

type ChatMessage = {
  id?: string;
  text?: string;
  sender?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file' | null;
  deleted?: boolean;
  deletedFor?: string[];
  pinnedBy?: string[];
  clientId?: string | null;
  createdAt?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: { [emoji: string]: string[] };
  forwarded?: boolean;
  forwardedFrom?: string;
  replyToMessageId?: string;
  replyToText?: string;
  replyToSenderId?: string;
  replyToSenderName?: string;
  [key: string]: any;
};

const ChatScreen = () => {
  const { id, fromStreak } = useLocalSearchParams();
  const router = useRouter();
  const { settings } = useMessagingSettings();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // server-backed messages
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]); // optimistic local messages
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [selectedMessageRect, setSelectedMessageRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{ uri: string; type: 'image' | 'video' | 'file' } | null>(null);
  const [pendingCaption, setPendingCaption] = useState<string>('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);

  const scrollToBottom = useCallback((animated = true) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  const lastMarkedRef = React.useRef<number>(0);
  const handleScroll = (e: any) => {
    // If user is near bottom, mark as read (debounced to once per 3s)
    try {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
      if (atBottom && conversation && user?.uid) {
        const now = Date.now();
        if (now - lastMarkedRef.current > 3000) {
          lastMarkedRef.current = now;
          if (conversation.lastMessageSenderId && conversation.lastMessageSenderId !== user.uid) {
            void markConversationRead(id as string, settings.readReceipts);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthChange((authUser) => {
      if (!authUser) {
        setUser(null);
        return;
      }
      setUser({
        uid: authUser.uid,
        displayName: (authUser.displayName as string) ?? null,
        email: (authUser.email as string) ?? null,
        photoURL: (authUser as any).photoURL ?? null,
      });
    });
    const unsubscribeConversation = onConversationUpdate(id as string, setConversation);
    const unsubscribeMessages = onMessagesUpdate(id as string, setMessages);

    return () => {
      unsubscribeAuth();
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [id]);

  // Mark conversation read when user opens the chat (if the last message isn't from them)
  useEffect(() => {
    if (!conversation || !user?.uid) return;
    try {
      if (conversation.lastMessageSenderId && conversation.lastMessageSenderId !== user.uid) {
        void markConversationRead(id as string, settings.readReceipts);
      }
    } catch (err) {
      console.warn('[chat] failed to mark conversation read on open', err);
    }
  }, [conversation, user?.uid, id, settings.readReceipts]);

  // When server messages arrive, remove any pending messages that were echoed back (match on clientId)
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const serverClientIds = new Set(messages.map((m) => m.clientId).filter(Boolean));
    if (serverClientIds.size === 0) return;
    setPendingMessages((prev) => prev.filter((p) => !serverClientIds.has(p.clientId)));
  }, [messages]);

  // Prevent showing a conversation that the current user is not a member of.
  // If we detect the user is not in the conversation members, try to create/find
  // a proper 1:1 conversation with the other participant and redirect there.
  useEffect(() => {
    if (!conversation || !user?.uid) return;
    const members: string[] = Array.isArray(conversation.members) ? conversation.members : [];
    if (members.includes(user.uid)) return;

    // Not a member — attempt to find the other participant and open a correct convo
    const otherId = members.length === 2 ? members.find((m: string) => m !== undefined && m !== null) ?? null : null;
    if (!otherId) {
      // No valid other participant, navigate back
      try { router.back(); } catch {};
      return;
    }

    (async () => {
      try {
        const profile = await getProfileById(otherId);
        if (!profile) {
          router.back();
          return;
        }
        const newConvId = await findOrCreateConversation(profile as Profile);
        if (newConvId && newConvId !== (id as string)) {
          router.replace(`/messaging/chat/${newConvId}`);
        } else {
          router.back();
        }
      } catch (err) {
        console.warn('[chat] failed to migrate conversation for current user', err);
        try { router.back(); } catch {}
      }
    })();
  }, [conversation, user?.uid, id, router]);

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
    const loadStreak = async () => {
      if (!id) return;
      try {
        const streak = await getChatStreak(String(id));
        if (streak && typeof streak.count === 'number') {
          setStreakCount(streak.count);
        } else {
          setStreakCount(0);
        }
      } catch {
        setStreakCount(0);
      }
    };

    void loadStreak();
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom]);

  const visibleMessages = useMemo<ChatMessage[]>(() => {
    const server = messages.filter((m) => {
      if (m.deleted) return false;
      if (Array.isArray(m.deletedFor) && user?.uid && m.deletedFor.includes(user.uid)) return false;
      return true;
    });

    // Filter out pending messages that have been echoed back by server (match on clientId)
    const serverClientIds = new Set(server.map((m) => m.clientId).filter(Boolean));
    const locals = pendingMessages.filter((p) => !serverClientIds.has(p.clientId));

    return [...server, ...locals];
  }, [messages, pendingMessages, user]);

  const mediaMessages = useMemo<ChatMessage[]>(() => {
    return visibleMessages.filter((m) => m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video'));
  }, [visibleMessages]);

  const pinnedMessage = useMemo<ChatMessage | null>(() => {
    if (!user?.uid) return null;
    const combined = [...messages, ...pendingMessages];
    for (let i = combined.length - 1; i >= 0; i -= 1) {
      const message = combined[i];
      if (Array.isArray(message.pinnedBy) && message.pinnedBy.includes(user.uid)) {
        return message;
      }
    }
    return null;
  }, [messages, pendingMessages, user?.uid]);

  const handleStartCall = useCallback(
    async (mode: CallType) => {
      if (!conversation || !conversation.id || !Array.isArray(conversation.members)) {
        Alert.alert('Call unavailable', 'Conversation members are missing.');
        return;
      }
      if (!user?.uid) {
        Alert.alert('Call unavailable', 'Please sign in to start a call.');
        return;
      }
      if (isStartingCall) return;
      setIsStartingCall(true);
      try {
        const call = await createCallSession({
          conversationId: conversation.id,
          members: conversation.members,
          type: mode,
          initiatorId: user.uid,
          isGroup: !!conversation.isGroup,
          conversationName: conversation.isGroup
            ? conversation.name || 'Group'
            : otherUser?.displayName || 'Chat',
          initiatorName: user.displayName ?? null,
        });
        router.push({ pathname: '/calls/[id]', params: { id: call.callId } });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'We could not start the call.';
        Alert.alert('Unable to start call', message);
      } finally {
        setIsStartingCall(false);
      }
    },
    [conversation, user?.uid, otherUser?.displayName, router, isStartingCall],
  );

  const uploadChatMedia = useCallback(
    async (uri: string, type: 'image' | 'video' | 'file'): Promise<{ url: string; mediaType: 'image' | 'video' | 'file' } | null> => {
      if (!user || !supabaseConfigured) return null;

      try {
        const finalUri = uri;
        const base64Data = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
        const binary: string = atob(base64Data);
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

  const updateChatStreak = useCallback(async () => {
    if (!id) return;
    await updateStreakForContext({
      kind: 'chat',
      conversationId: String(id),
      partnerId: otherUser?.id ?? null,
      partnerName: otherUser?.displayName ?? null,
    });
    const streak = await getChatStreak(String(id));
    if (streak && typeof streak.count === 'number') {
      setStreakCount(streak.count);
    }
  }, [id, otherUser]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !user) return;

    const trimmed = text.trim();

    if (editingMessage && editingMessage.id) {
      void editMessage(id as string, editingMessage.id, trimmed);
      setEditingMessage(null);
      setReplyTo(null);
    } else {
        const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempId = `temp-${clientId}`;
        const pending: ChatMessage = {
          id: tempId,
          text: trimmed,
          sender: user.uid,
          createdAt: Date.now(),
          clientId,
        };

        if (replyTo) {
          (pending as any).replyToMessageId = replyTo.id;
          (pending as any).replyToText = replyTo.text;
          (pending as any).replyToSenderId = replyTo.sender;
        }

        setPendingMessages((prev) => [...prev, pending]);

        // Fire-and-forget: persist on server with clientId for dedupe
        try {
          void sendMessage(id as string, { ...(pending as any), clientId });
        } catch (err) {
          // mark pending as failed
          setPendingMessages((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, failed: true } : p)));
        }

        if (fromStreak) {
          void updateChatStreak();
        }
    }

    setReplyTo(null);
    void setTyping(id as string, user.uid, false, settings.typingIndicators);
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
    void setTyping(id as string, user.uid, typing, settings.typingIndicators);
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

    const newMessage: ChatMessage = {
      text:
        pendingCaption.trim() ||
        (pendingMedia.type === 'image'
          ? 'Photo'
          : pendingMedia.type === 'video'
          ? 'Video'
          : 'File'),
      sender: user.uid,
      mediaUrl: uploaded.url,
      mediaType: uploaded.mediaType,
    };
    // optimistic pending media message
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempId = `temp-${clientId}`;
    const pending: ChatMessage = {
      id: tempId,
      text: newMessage.text,
      sender: user.uid,
      mediaUrl: newMessage.mediaUrl,
      mediaType: newMessage.mediaType,
      createdAt: Date.now(),
      clientId,
    };
    setPendingMessages((prev) => [...prev, pending]);

    try {
      void sendMessage(id as string, { ...(newMessage as any), clientId });
    } catch (err) {
      setPendingMessages((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, failed: true } : p)));
    }
    setPendingMedia(null);
    setPendingCaption('');
  };

  const handleOpenMedia = (message: ChatMessage) => {
    if (!message?.mediaUrl || !message.mediaType) return;
    if (message.mediaType !== 'image' && message.mediaType !== 'video') return;

    const index = mediaMessages.findIndex((m) => m.id === message.id);
    if (index < 0) return;

    const mediaPayload = mediaMessages.map((m, idx) => ({
      id: m.id ?? `media-${idx}`,
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

  // Search functionality
  const handleSearchMessages = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = visibleMessages.filter(message =>
      message.text?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  }, [visibleMessages]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const messageIndex = visibleMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex >= 0) {
      flatListRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5
      });
    }
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
  }, [visibleMessages]);

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
            <ChatHeader
              recipient={otherUser}
              conversation={conversation}
              isTyping={isOtherTyping}
              streakCount={streakCount}
              lastSeen={lastSeen}
              onSearch={() => setShowSearch(true)}
              onStartVoiceCall={() => handleStartCall('voice')}
              onStartVideoCall={() => handleStartCall('video')}
              callDisabled={isStartingCall}
            />
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
              keyExtractor={(item, index) => item.id ?? `message-${index}`}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
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

        <MessageSearch
          visible={showSearch}
          onClose={() => setShowSearch(false)}
          onSearch={handleSearchMessages}
          searchResults={searchResults}
          onJumpToMessage={handleJumpToMessage}
        />
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
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 70,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  searchCloseBtn: {
    padding: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  searchResults: {
    flex: 1,
  },
  searchResult: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  searchResultText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },
  searchResultTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});

export default ChatScreen;
