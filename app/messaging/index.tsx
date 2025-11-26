import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Text,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenWrapper from '../../components/ScreenWrapper';
import Header from './components/Header';
import MessageItem from './components/MessageItem';
import StoryItem from './components/StoryItem';
import NoMessages from './components/NoMessages';
import FAB from './components/FAB';
import NewChatSheet from './components/NewChatSheet';
import { onConversationsUpdate, getFollowing, Profile, findOrCreateConversation, onAuthChange } from './controller';
import { onStoriesUpdate } from '../components/social-feed/storiesController';

const HEADER_HEIGHT = 150;

const MessagingScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setAuthReady] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange(currentUser => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      const unsubscribeConversations = onConversationsUpdate(setConversations);
      const unsubscribeStories = onStoriesUpdate(setStories);
      getFollowing().then(setFollowing);
      return () => {
        unsubscribeConversations();
        unsubscribeStories();
      };
    }
  }, [isAuthReady]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.lastMessage && m.lastMessage.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const handleMessagePress = (id: string) => {
    router.push(`/messaging/chat/${id}`);
  };

  const handleStartChat = async (person: Profile) => {
    try {
      const conversationId = await findOrCreateConversation(person);
      setSheetVisible(false);
      router.push(`/messaging/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting chat: ", error);
    }
  };

  const navigateTo = (path: any) => {
    router.push(path);
  };

  const openSheet = () => {
    setSheetVisible(true);
  };

  const headerHeight = HEADER_HEIGHT;

  if (!isAuthReady) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <Header
          scrollY={scrollY}
          onSettingsPress={() => navigateTo('/messaging/settings')}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          headerHeight={headerHeight}
        />

        {filteredMessages.length === 0 && searchQuery === '' ? (
          <NoMessages
            suggestedPeople={following}
            onStartChat={handleStartChat}
            headerHeight={headerHeight}
          />
        ) : (
          <Animated.FlatList
            data={filteredMessages}
            renderItem={({ item }) => <MessageItem item={item} onPress={() => handleMessagePress(item.id)} currentUser={user} />}
            keyExtractor={(item) => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            ListHeaderComponent={
              <View style={styles.storiesContainer}>
                <View style={styles.storiesHeaderRow}>
                  <Text style={styles.storiesTitle}>Stories</Text>
                  <Text style={styles.storiesAction}>View all</Text>
                </View>

                <FlatList
                  data={stories}
                  renderItem={({ item }) => (
                    <StoryItem item={item} onPress={() => handleStartChat(item)} />
                  )}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesListContent}
                />
              </View>
            }
            contentContainerStyle={{
              paddingTop: headerHeight + 8,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {conversations.length > 0 && <FAB onPress={openSheet} />}

        <NewChatSheet
          isVisible={isSheetVisible}
          onClose={() => setSheetVisible(false)}
          following={following}
          onStartChat={handleStartChat}
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storiesContainer: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  storiesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  storiesAction: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginRight: 6,
  },
  storiesListContent: {
    paddingLeft: 6,
    paddingRight: 8,
  },
});

export default MessagingScreen;
