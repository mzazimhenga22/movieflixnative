import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNav from './components/social-feed/BottomNav';
import FeedCard from './components/social-feed/FeedCard';
import SocialHeader from './components/social-feed/Header';
import { useSocialReactions } from './components/social-feed/hooks';
import LiveView from './components/social-feed/LiveView';
import MovieMatchView from './components/social-feed/MovieMatchView';
import PostMovieReview from './components/social-feed/PostMovieReview';
import RecommendedView from './components/social-feed/RecommendedView';
import StoriesRow from './components/social-feed/StoriesRow';
import FeedTabs from './components/social-feed/Tabs';

const SocialFeed = () => {
  const { reviews, handleLike, handleBookmark, handleComment, handleWatch, handleShare } = useSocialReactions();
  const [activeTab, setActiveTab] = useState<'Feed' | 'Recommended' | 'Live' | 'Movie Match'>('Feed');

  return (
    <View style={styles.rootContainer}>
      <ScreenWrapper>
      <View style={styles.container}>
        <SocialHeader title="Welcome, streamer" />
        <StoriesRow />
        <PostMovieReview />
        <FeedTabs active={activeTab} onChangeTab={setActiveTab} />

        {activeTab === 'Feed' && (
          <View style={styles.feedContainer}>
            <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
              {reviews.map((review) => {
                // Convert comments to proper format expected by FeedCard
                const formattedReview = {
                  ...review,
                  commentsCount: typeof review.comments === 'number' ? review.comments : review.comments?.length || 0,
                  comments: Array.isArray(review.comments) ? review.comments : undefined
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
            </ScrollView>
          </View>
        )}
        
        {activeTab === 'Recommended' && <RecommendedView />}
        {activeTab === 'Live' && <LiveView />}
        {activeTab === 'Movie Match' && <MovieMatchView />}          <TouchableOpacity style={styles.fab}>
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
    backgroundColor: '#630303ff',
  },
  container: { 
    flex: 1, 
    backgroundColor: 'transparent',
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
    bottom: 20, // Adjusted since nav is outside
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
});

export default SocialFeed;
