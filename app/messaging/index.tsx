import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Text,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenWrapper from '../../components/ScreenWrapper';
import Header from './components/Header';
import MessageItem from './components/MessageItem';
import StoryItem from './components/StoryItem';
import NoMessages from './components/NoMessages';
import FAB from './components/FAB';
import NewChatSheet from './components/NewChatSheet';
import IncomingCallCard from './components/IncomingCallCard';
import {
  onConversationsUpdate,
  getFollowing,
  Profile,
  findOrCreateConversation,
  onAuthChange,
  Conversation,
  createGroupConversation,
  setConversationPinned,
  markConversationRead,
  deleteConversation,
} from './controller';
import { onStoriesUpdate } from '../components/social-feed/storiesController';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MovieList from '../../components/MovieList';
import { Media } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateStreakForContext } from '@/lib/streaks/streakManager';
import { getProfileScopedKey } from '@/lib/profileStorage';
import { createCallSession, declineCall } from '@/lib/calls/callService';
import type { CallType } from '@/lib/calls/types';
import useIncomingCall from '@/hooks/useIncomingCall';
import type { User } from 'firebase/auth';

const HEADER_HEIGHT = 150;

type ConversationListItem = Conversation & { unread: number };
type Story = {
  id: string;
  userId: string;
  username?: string;
  avatar?: string;      // <- match StoryLike (string | undefined), no null
  mediaUrl?: string;
  photoURL?: string;
  userAvatar?: string | null;
  caption?: string;
  createdAt?: any;
};

type StoryRailEntry = Story & {
  latestStoryId?: string | null;
  latestCreatedAt?: number | null;
  hasStory?: boolean;
  isSelf?: boolean;
  timestampLabel?: string | null;
  displayAvatar?: string | null;
};

const STORY_WINDOW_MS = 24 * 60 * 60 * 1000;

const formatStoryTime = (timestamp?: number | null) => {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diff / (60 * 1000)));
    return `${minutes}m ago`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
    return `${hours}h ago`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

const MessagingScreen = () => {
  const router = useRouter();
  const { streakUserId, startStreaksWithFollowing } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const promoTranslateX = useRef(new Animated.Value(40)).current;

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setAuthReady] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
  const [spotlightConversation, setSpotlightConversation] = useState<ConversationListItem | null>(
    null
  );
  const [spotlightRect, setSpotlightRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [activeKind, setActiveKind] = useState<'Chats' | 'Groups'>('Chats');
  const [showPromoRow, setShowPromoRow] = useState(false);
  const [continueWatching, setContinueWatching] = useState<Media[]>([]);
  const [didNavigateFromStreak, setDidNavigateFromStreak] = useState(false);
  const [didBootstrapFollowingStreaks, setDidBootstrapFollowingStreaks] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const incomingCall = useIncomingCall(user?.uid);
  const groupedStories = useMemo<StoryRailEntry[]>(() => {
    const map = new Map<string, StoryRailEntry>();
    stories.forEach((story) => {
      if (!story?.userId) return;
      const createdAtMs =
        story.createdAt && typeof story.createdAt?.toMillis === 'function'
          ? story.createdAt.toMillis()
          : null;
      if (createdAtMs && Date.now() - createdAtMs > STORY_WINDOW_MS) {
        return;
      }
      const existing = map.get(story.userId);
      if (!existing || (createdAtMs ?? 0) > (existing.latestCreatedAt ?? 0)) {
        map.set(story.userId, {
          ...story,
          latestStoryId: story.id,
          latestCreatedAt: createdAtMs,
          hasStory: true,
          displayAvatar: story.userAvatar || story.avatar || story.photoURL || null,
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (b.latestCreatedAt ?? 0) - (a.latestCreatedAt ?? 0),
    );
  }, [stories]);
  const storyRailData = useMemo<StoryRailEntry[]>(() => {
    const entries: StoryRailEntry[] = [];
    const myEntry =
      (user?.uid ? groupedStories.find((entry) => entry.userId === user.uid) : null) ?? null;
    const selfAvatar = user?.photoURL ?? myEntry?.displayAvatar ?? myEntry?.photoURL ?? null;
    entries.push({
      id: user?.uid ?? 'self-story',
      userId: user?.uid ?? 'self-story',
      username: user?.displayName ?? 'My Story',
      photoURL: myEntry?.photoURL ?? selfAvatar ?? undefined,
      userAvatar: selfAvatar,
      latestStoryId: myEntry?.latestStoryId ?? null,
      latestCreatedAt: myEntry?.latestCreatedAt ?? null,
      hasStory: !!myEntry,
      isSelf: true,
      timestampLabel: myEntry?.latestCreatedAt
        ? formatStoryTime(myEntry.latestCreatedAt)
        : 'Tap to add',
      displayAvatar: selfAvatar,
    });
    groupedStories
      .filter((entry) => entry.userId !== user?.uid)
      .forEach((entry) => {
        entries.push({
          ...entry,
          id: entry.latestStoryId ?? entry.id,
          hasStory: true,
          timestampLabel: formatStoryTime(entry.latestCreatedAt),
          displayAvatar: entry.displayAvatar ?? entry.photoURL ?? entry.avatar ?? null,
        });
      });
    return entries;
  }, [groupedStories, user?.uid, user?.displayName, user?.photoURL]);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange((currentUser) => {
      // currentUser is User | null (from controller/firebase)
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user?.uid) return;
    const unsubscribeConversations = onConversationsUpdate(setConversations);
    const unsubscribeStories = onStoriesUpdate(setStories);
    getFollowing().then(setFollowing);
    return () => {
      unsubscribeConversations();
      unsubscribeStories();
    };
  }, [isAuthReady, user?.uid]);

  useEffect(() => {
    if (!isAuthReady || !streakUserId || didNavigateFromStreak) return;

    const navigateFromStreak = async () => {
      try {
        const { getProfileById } = await import('./controller');
        const profile = await getProfileById(String(streakUserId));
        if (!profile) {
          return;
        }
        const conversationId = await findOrCreateConversation(profile);
        setDidNavigateFromStreak(true);
        router.push({
          pathname: '/messaging/chat/[id]',
          params: { id: conversationId, fromStreak: '1' },
        });
      } catch (err) {
        console.error('Failed to navigate from streak', err);
      }
    };

    void navigateFromStreak();
  }, [isAuthReady, streakUserId, didNavigateFromStreak, router]);

  useEffect(() => {
    const flag = String(startStreaksWithFollowing || '');
    if (!isAuthReady || flag !== '1' || didBootstrapFollowingStreaks) return;
    if (!following || following.length === 0) return;

    const bootstrap = async () => {
      try {
        for (const person of following) {
          try {
            const conversationId = await findOrCreateConversation(person);
            await updateStreakForContext({
              kind: 'chat',
              conversationId,
              partnerId: person.id,
              partnerName: person.displayName ?? null,
            });
          } catch (err) {
            console.error('Failed to start streak with', person.id, err);
          }
        }
      } finally {
        setDidBootstrapFollowingStreaks(true);
      }
    };

    void bootstrap();
  }, [isAuthReady, startStreaksWithFollowing, didBootstrapFollowingStreaks, following]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHistory = async () => {
        try {
          const key = await getProfileScopedKey('watchHistory');
          const stored = await AsyncStorage.getItem(key);
          if (!isActive) return;
          if (stored) {
            const parsed: Media[] = JSON.parse(stored);
            setContinueWatching(parsed);
          } else {
            setContinueWatching([]);
          }
        } catch (err) {
          if (isActive) {
            console.error('Failed to load watch history for messaging', err);
            setContinueWatching([]);
          }
        }
      };

      if (isAuthReady) {
        loadHistory();
      } else {
        setContinueWatching([]);
      }

      return () => {
        isActive = false;
      };
    }, [isAuthReady])
  );

  // After some time on screen, fade header and show a subtle promo row
  useEffect(() => {
    if (!isAuthReady) return;
    const timer = setTimeout(() => {
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        setShowPromoRow(true);
        promoTranslateX.setValue(40);
        Animated.spring(promoTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }).start();
      });
    }, 45000); // ~45 seconds
    return () => clearTimeout(timer);
  }, [isAuthReady, headerOpacity, promoTranslateX]);

  const enhancedConversations: ConversationListItem[] = useMemo(() => {
    return conversations.map((c) => {
      const isUnread =
        Boolean(c.lastMessage) &&
        Boolean(c.lastMessageSenderId) &&
        user?.uid &&
        c.lastMessageSenderId !== user.uid;
      return {
        ...c,
        unread: isUnread ? 1 : 0,
      };
    });
  }, [conversations, user?.uid]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base: ConversationListItem[] = enhancedConversations;

    // Index between chats vs groups
    base =
      activeKind === 'Groups'
        ? base.filter((m) => m.isGroup)
        : base.filter((m) => !m.isGroup);

    if (activeFilter === 'Unread') {
      base = base.filter((m) => m.unread > 0);
    }
    if (q) {
      base = base.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.lastMessage && m.lastMessage.toLowerCase().includes(q)),
      );
    }

    // Ensure pinned conversations are surfaced below the header
    const pinned = base.filter((m) => m.pinned);
    const others = base.filter((m) => !m.pinned);
    return [...pinned, ...others];
  }, [enhancedConversations, searchQuery, activeFilter, activeKind]);

  const handleMessagePress = (id: string) => {
    router.push({
      pathname: '/messaging/chat/[id]',
      params: { id },
    });
  };

  const handleMessageLongPress = useCallback(
    (conversation: Conversation, rect: { x: number; y: number; width: number; height: number }) => {
      const enriched =
        enhancedConversations.find((c) => c.id === conversation.id) ??
        ({ ...conversation, unread: 0 } as ConversationListItem);
      setSpotlightConversation(enriched);
      setSpotlightRect(rect);
    },
    [enhancedConversations],
  );

  const handleCloseSpotlight = () => {
    setSpotlightConversation(null);
    setSpotlightRect(null);
  };

  const handleStartChat = async (person: Profile) => {
    try {
      const conversationId = await findOrCreateConversation(person);
      setSheetVisible(false);
      router.push({
        pathname: '/messaging/chat/[id]',
        params: { id: conversationId },
      });
    } catch (error) {
      console.error('Error starting chat: ', error);
    }
  };

  const handleCreateGroup = async (name: string, members: Profile[]) => {
    try {
      const memberIds = members.map((m) => m.id);
      const conversationId = await createGroupConversation({ name, memberIds });
      setSheetVisible(false);
      router.push({
        pathname: '/messaging/chat/[id]',
        params: { id: conversationId },
      });
    } catch (error) {
      console.error('Error creating group chat: ', error);
    }
  };

  const navigateTo = (path: any) => {
    router.push(path);
  };

  const handleStoryPress = useCallback(
    (story: StoryRailEntry) => {
      if (story.isSelf && !story.hasStory) {
        router.push('/story-upload');
        return;
      }
      const targetId = story.latestStoryId || story.id;
      router.push({
        pathname: '/story/[id]',
        params: {
          id: targetId,
          photoURL: story.photoURL ?? story.displayAvatar ?? '',
        },
      });
    },
    [router],
  );

  const handleStartCall = useCallback(
    async (conversation: Conversation, mode: CallType) => {
      if (!user?.uid) {
        Alert.alert('Call unavailable', 'Sign in to place a call.');
        return;
      }
      const memberIds = Array.isArray(conversation.members) ? conversation.members : [];
      if (!conversation?.id || memberIds.length === 0) {
        Alert.alert('Call unavailable', 'Conversation has no members yet.');
        return;
      }
      if (isStartingCall) return;
      setIsStartingCall(true);
      const meta = (conversation as Record<string, any>) || {};
      const conversationLabel = conversation.isGroup
        ? conversation.name || meta.title || 'Group'
        : meta.displayName || meta.title || 'Chat';
      try {
        const result = await createCallSession({
          conversationId: conversation.id,
          members: memberIds,
          type: mode,
          initiatorId: user.uid,
          isGroup: !!conversation.isGroup,
          conversationName: conversationLabel,
          initiatorName: user.displayName ?? null,
        });
        router.push({ pathname: '/calls/[id]', params: { id: result.callId } });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Please try again later.';
        Alert.alert('Unable to start call', message);
      } finally {
        setIsStartingCall(false);
      }
    },
    [user?.uid, user?.displayName, router, isStartingCall],
  );

  const handleAcceptIncomingCall = useCallback(() => {
    if (!incomingCall?.id) return;
    router.push({ pathname: '/calls/[id]', params: { id: incomingCall.id } });
  }, [incomingCall?.id, router]);

  const handleDeclineIncomingCall = useCallback(async () => {
    if (!incomingCall?.id || !user?.uid) return;
    try {
      await declineCall(incomingCall.id, user.uid, user.displayName ?? null);
    } catch (err) {
      console.warn('Failed to decline call', err);
    }
  }, [incomingCall?.id, user?.uid, user?.displayName]);

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

  const accentColor = '#e50914';

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[accentColor, '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ height: headerHeight, marginHorizontal: 14 }}>
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              opacity: headerOpacity,
            }}
          >
            <Header
              scrollY={scrollY}
              onSettingsPress={() => navigateTo('/messaging/settings')}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              headerHeight={headerHeight}
            />
          </Animated.View>

        {showPromoRow && continueWatching.length > 0 && (
          <Animated.View
            style={[
              styles.promoRow,
              {
                  left: 0,
                  right: 0,
                  top: 0,
                  transform: [{ translateX: promoTranslateX }],
                },
              ]}
            >
            <MovieList title="Continue Watching" movies={continueWatching.slice(0, 20)} showProgress />
          </Animated.View>
        )}
      </View>

      {incomingCall && (
        <IncomingCallCard
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

        {filteredMessages.length === 0 && searchQuery === '' ? (
          <NoMessages
            suggestedPeople={following}
            onStartChat={handleStartChat}
            headerHeight={headerHeight}
          />
        ) : (
          <Animated.FlatList
            data={filteredMessages}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                onPress={() => handleMessagePress(item.id)}
                currentUser={user}
                onLongPress={handleMessageLongPress}
                onStartCall={handleStartCall}
                callDisabled={isStartingCall}
              />
            )}
            keyExtractor={(item, index) =>
              item.id
                ? `${item.id}-${item.updatedAt ?? item.lastMessageAt ?? index}`
                : `conversation-${index}`
            }
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            ListHeaderComponent={
              <View>
                <View style={styles.kindRow}>
                  {['Chats', 'Groups'].map((kind) => {
                    const isActive = activeKind === (kind as 'Chats' | 'Groups');
                    return (
                      <TouchableOpacity
                        key={kind}
                        style={[styles.kindChip, isActive && styles.kindChipActive]}
                        onPress={() => setActiveKind(kind as 'Chats' | 'Groups')}
                      >
                        <Text style={[styles.kindChipText, isActive && styles.kindChipTextActive]}>
                          {kind}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.filterRow}>
                  {['All', 'Unread'].map((label) => {
                    const isActive = activeFilter === (label as 'All' | 'Unread');
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => setActiveFilter(label as 'All' | 'Unread')}
                      >
                        <Text
                          style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.storiesContainer}>
                  <View style={styles.storiesHeaderRow}>
                    <Text style={styles.storiesTitle}>Stories</Text>
                    <Text style={styles.storiesAction}>View all</Text>
                  </View>

                  <FlatList
                    data={storyRailData}
                    renderItem={({ item }) => (
                      <StoryItem
                        item={item}
                        onPress={handleStoryPress}
                      />
                    )}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesListContent}
                  />
                </View>
              </View>
            }
            contentContainerStyle={{
              paddingTop: headerHeight + 8,
              paddingBottom:
                Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {conversations.length > 0 && <FAB onPress={openSheet} />}

        {spotlightConversation && spotlightRect && (
          <View style={styles.spotlightOverlay} pointerEvents="box-none">
            {/* Blur + dim everything */}
            <TouchableOpacity
              style={styles.spotlightTouch}
              activeOpacity={1}
              onPress={handleCloseSpotlight}
            >
              <BlurView intensity={90} tint="dark" style={styles.spotlightBackdrop} />
            </TouchableOpacity>

            {/* Re-render the focused row ABOVE the blur */}
            <View style={[styles.spotlightRowContainer, { top: spotlightRect.y }]}>
              <MessageItem
                item={spotlightConversation}
                currentUser={user}
                onPress={() => {
                  handleCloseSpotlight();
                  handleMessagePress(spotlightConversation.id);
                }}
                onLongPress={() => {}}
                onStartCall={handleStartCall}
                callDisabled={isStartingCall}
              />
            </View>

            {/* Action pills a bit further under the elevated row */}
            <View
              style={[
                styles.spotlightContent,
                { top: spotlightRect.y + spotlightRect.height + 8 },
              ]}
            >
              <View style={styles.spotlightActionsRow}>
                <TouchableOpacity
                  style={styles.spotlightPill}
                  onPress={() => {
                    handleCloseSpotlight();
                    handleMessagePress(spotlightConversation.id);
                  }}
                >
                  <Text style={styles.spotlightPillText}>Open</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spotlightPill}
                  onPress={() => {
                    void setConversationPinned(
                      spotlightConversation.id,
                      !spotlightConversation.pinned,
                    );
                    handleCloseSpotlight();
                  }}
                >
                  <Text style={styles.spotlightPillText}>Pin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.spotlightPill}
                  onPress={() => {
                    void markConversationRead(spotlightConversation.id);
                    handleCloseSpotlight();
                  }}
                >
                  <Text style={styles.spotlightPillText}>Mark read</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.spotlightPill, styles.spotlightPillDanger]}
                  onPress={() => {
                    void deleteConversation(spotlightConversation.id);
                    handleCloseSpotlight();
                  }}
                >
                  <Text style={styles.spotlightPillDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <NewChatSheet
          isVisible={isSheetVisible}
          onClose={() => setSheetVisible(false)}
          following={following}
          onStartChat={handleStartChat}
          onCreateGroup={handleCreateGroup}
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterChipActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  kindChipActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  kindChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  kindChipTextActive: {
    color: '#fff',
  },
  promoRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  promoTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  promoCardsRow: {
    paddingHorizontal: 2,
  },
  promoCard: {
    width: 140,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  promoCardPoster: {
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  promoCardMeta: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  promoCardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  promoCardSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  spotlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  spotlightTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlightBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  spotlightRowContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  spotlightContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  spotlightActionsRow: {
    marginTop: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  spotlightPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
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

export default MessagingScreen;
