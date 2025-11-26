import { useState } from 'react';
import { Alert } from 'react-native';

export type ReviewItem = {
  id: number;
  user: string;
  avatar?: string;
  date: string;
  review: string;
  movie?: string;
  image?: any;
  likes: number;
  // comments can be a simple count or an array of comment objects
  commentsCount: number;
  comments?: Array<{ id: number; user: string; text: string }>;
  watched: number;
  retweet: boolean;
  liked: boolean;
  bookmarked: boolean;
  videoUrl?: string;
};

const initialReviews: ReviewItem[] = [
  {
    id: 1,
    user: 'watcher',
    date: '23/10/2025',
    review: 'Reviewed spider man across the spider verse: nailed waiting for the next! 😎',
    movie: 'spider man across the spider verse',
    image: require('../../../assets/images/spiderman.jpg'),
    likes: 1,
    commentsCount: 0,
    watched: 1,
    retweet: false,
    liked: false,
    bookmarked: false,
  },
  {
    id: 2,
    user: 'watcher',
    date: '23/10/2025',
    review: 'Retweeted: watcher posted a story.',
    image: null,
    likes: 0,
    commentsCount: 0,
    watched: 0,
    retweet: true,
    liked: false,
    bookmarked: false,
  },
];

export function useSocialReactions(initial = initialReviews) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initial);

  const handleLike = (id: number) => {
    setReviews((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 }
          : item
      )
    );
  };

  const handleBookmark = (id: number) => {
    setReviews((prev) => prev.map((item) => (item.id === id ? { ...item, bookmarked: !item.bookmarked } : item)));
  };

  const handleComment = (id: number) => {
    setReviews((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              commentsCount: item.commentsCount + 1,
              comments: [
                ...(item.comments || []),
                {
                  id: Date.now(),
                  user: 'current_user',
                  text: 'New comment'
                }
              ]
            }
          : item
      )
    );
  };

  const handleWatch = (id: number) => {
    setReviews((prev) => prev.map((item) => (item.id === id ? { ...item, watched: item.watched + 1 } : item)));
  };

  const handleShare = (id: number) => {
    Alert.alert('Share', `Share review ${id}`);
  };

  return {
    reviews,
    setReviews,
    handleLike,
    handleBookmark,
    handleComment,
    handleWatch,
    handleShare,
  } as const;
}

export default useSocialReactions;
