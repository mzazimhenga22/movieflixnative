import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useCallback } from 'react';
import { Animated, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../../components/ScreenWrapper';
import BottomNav from '../components/social-feed/BottomNav';
import FeedCard from '../components/social-feed/FeedCard';
import SocialHeader from '../components/social-feed/Header';
import { useSocialReactions } from '../components/social-feed/hooks';
import LiveView from '../components/social-feed/LiveView';
import MovieMatchView from '../components/social-feed/MovieMatchView';
import PostMovieReview from '../components/social-feed/PostMovieReview';
import RecommendedView from '../components/social-feed/RecommendedView';
import StoriesRow from '../components/social-feed/StoriesRow';
import FeedTabs from '../components/social-feed/Tabs';
import { getAccentFromPosterPath } from '../../constants/theme';

const SocialFeed = () => {
  const { reviews, refreshReviews, handleLike, handleBookmark, handleComment, handleWatch, handleShare } =
    useSocialReactions();
  const [activeTab, setActiveTab] = useState<'Feed' | 'Recommended' | 'Live' | 'Movie Match'>('Feed');
  const accentColor = getAccentFromPosterPath('/social-feed/accent');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const topSectionTranslateY = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [0, -180],
    extrapolate: 'clamp',
  });

  const topSectionOpacity = scrollY.interpolate({
    inputRange: [0, 80, 160],
    outputRange: [1, 0.7, 0],
    extrapolate: 'clamp',
  });

  const ashTranslateY = scrollY.interpolate({
    inputRange: [0, 200, 400],
    outputRange: [40, 0, -40],
    extrapolate: 'clamp',
  });

  const ashOpacity = scrollY.interpolate({
    inputRange: [0, 100, 250],
    outputRange: [0.2, 0.6, 0],
    extrapolate: 'clamp',
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshReviews();
    } finally {
      setRefreshing(false);
    }
  }, [refreshReviews]);

  return (
    <View style={styles.rootContainer}>
      <ScreenWrapper>
        <LinearGradient
          colors={[accentColor, '#150a13', '#05060f']}
          start={[0, 0]}
          end={[1, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.container}>
          <View style={styles.feedContainer}>
            {activeTab === 'Feed' && (
              <Animated.ScrollView
                style={styles.feed}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: headerHeight }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#ffffff"
                    colors={['#ffffff']}
                  />
                }
              >
                {reviews.map((review) => {
                  const formattedReview = {
                    ...review,
                    commentsCount:
                      typeof review.comments === 'number'
                        ? review.comments
                        : review.comments?.length || 0,
                    comments: Array.isArray(review.comments) ? review.comments : undefined,
                  };
                  return (
                    <FeedCard
                      key={review.id}
                      item={formattedReview}
                      onLike={handleLike}
                      onComment={handleComment}
                      onWatch={handleWatch}
                      onShare={handleShare}
                      onBookmark={handleBookmark}
                    />
                  );
                })}
              </Animated.ScrollView>
            )}

            {activeTab === 'Recommended' && (
              <Animated.ScrollView
                style={styles.feed}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: headerHeight }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
              >
                <RecommendedView />
              </Animated.ScrollView>
            )}

            {activeTab === 'Live' && (
              <Animated.ScrollView
                style={styles.feed}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: headerHeight }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
              >
                <LiveView />
              </Animated.ScrollView>
            )}

            {activeTab === 'Movie Match' && (
              <Animated.ScrollView
                style={styles.feed}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: headerHeight }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
              >
                <MovieMatchView />
              </Animated.ScrollView>
            )}
          </View>

            <Animated.View
              pointerEvents="box-none"
              style={[
              styles.topSection,
              {
                transform: [{ translateY: topSectionTranslateY }],
                opacity: topSectionOpacity,
              },
            ]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h && h !== headerHeight) {
                setHeaderHeight(h);
              }
            }}
          >
            <SocialHeader title="Welcome, streamer" />
              <StoriesRow />
              <PostMovieReview />
              <FeedTabs active={activeTab} onChangeTab={setActiveTab} />
            </Animated.View>

            {/* lightweight floating ash effect */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ashLayer,
                {
                  opacity: ashOpacity,
                  transform: [{ translateY: ashTranslateY }],
                },
              ]}
            >
              <View style={[styles.ashParticle, { left: '15%' }]} />
              <View style={[styles.ashParticle, { left: '45%', width: 5, height: 5, opacity: 0.8 }]} />
              <View style={[styles.ashParticle, { left: '75%', width: 7, height: 7, opacity: 0.5 }]} />
            </Animated.View>
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
      
      <BottomNav />
    </View>
  );
};

// Hide the default native/header provided by the router so we only show our custom header
export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#05060f',
  },
  container: { 
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  topSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  feedContainer: {
    flex: 1,
  },
  feed: {
    flex: 1,
    marginBottom: 16, // Reduced margin since nav is outside
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 120, // Raised above external bottom nav
    backgroundColor: '#ff4b4b',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  ashLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  ashParticle: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});

export default SocialFeed;
