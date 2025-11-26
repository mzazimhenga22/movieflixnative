import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  onMessagesUpdate,
  sendMessage,
  onConversationUpdate,
  onAuthChange,
  Profile,
  updateConversationStatus,
  onUserProfileUpdate,
} from '../controller';

import ScreenWrapper from '../../../components/ScreenWrapper';
import MessageBubble from './components/MessageBubble';
import ChatHeader from './components/ChatHeader';
import MessageInput from './components/MessageInput';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ChatScreen = () => {
  const { id } = useLocalSearchParams();

  const [user, setUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback((animated = true) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange(setUser);
    const unsubscribeConversation = onConversationUpdate(id as string, setConversation);
    const unsubscribeMessages = onMessagesUpdate(id as string, setMessages);

    let unsubscribeOtherUser: (() => void) | undefined;

    if (conversation?.members && user?.uid) {
      const otherUserId = conversation.members.find((uid: string) => uid !== user.uid);
      if (otherUserId) {
        unsubscribeOtherUser = onUserProfileUpdate(otherUserId, setOtherUser);
      }
    }

    return () => {
      unsubscribeAuth();
      unsubscribeConversation();
      unsubscribeMessages();
      if (unsubscribeOtherUser) {
        unsubscribeOtherUser();
      }
    };
  }, [id, conversation, user]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages, scrollToBottom]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !user) return;

    const newMessage = {
      text: text.trim(),
      sender: user.uid,
    };

    sendMessage(id as string, newMessage);
  };

  const handleAcceptRequest = () => {
    updateConversationStatus(id as string, 'active');
  };

  const isRequest = conversation?.status === 'pending';
  const requestInitiator = conversation?.members.find((uid: string) => uid !== otherUser?.id) || null;
  const canAccept = isRequest && requestInitiator !== user?.uid;
  const canSend = !isRequest || (isRequest && requestInitiator !== user?.uid);

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust as needed
        >
          <View style={styles.container}>
            {otherUser && <ChatHeader recipient={otherUser} />}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => (
                <MessageBubble
                  item={item}
                  isMe={item.sender === user?.uid}
                  avatar={otherUser?.photoURL || ''}
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
                <MessageInput onSendMessage={handleSendMessage} disabled={!canSend} />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // Assuming a dark theme
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
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
});

export default ChatScreen;
