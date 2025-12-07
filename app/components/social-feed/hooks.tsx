import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../../constants/firebase';
import { supabase, supabaseConfigured } from '../../../constants/supabase';

export type ReviewItem = {
  id: number;
  user: string;
  avatar?: string;
  date: string;
  review: string;
  movie?: string;
  image?: any;
  genres?: string[];
  likes: number;
  // comments can be a simple count or an array of comment objects
  commentsCount: number;
  comments?: Array<{ id: number; user: string; text: string; spoiler?: boolean }>;
  watched: number;
  retweet: boolean;
  liked: boolean;
  bookmarked: boolean;
  videoUrl?: string;
};

export function useSocialReactions() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const refreshReviews = useCallback(async () => {
    try {
      let items: ReviewItem[] = [];

      if (supabaseConfigured) {
        const { data: posts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Failed to load posts from Supabase', error);
        } else if (posts && posts.length > 0) {
          items = posts.map((row: any, index: number) => {
            const createdAt = row.created_at ? new Date(row.created_at) : new Date();
            const isVideo = row.media_type === 'video';
            const mediaUrl = row.media_url as string | null;

            return {
              id: row.id ?? index + 1,
              user: row.userDisplayName || row.userName || row.user || 'watcher',
              avatar: row.userAvatar || undefined,
              date: createdAt.toLocaleDateString(),
              review: row.review || row.content || '',
              movie: row.title || row.movie || undefined,
              image: !isVideo && mediaUrl ? { uri: mediaUrl } : undefined,
              genres: row.genres || [],
              likes: row.likes ?? 0,
              commentsCount: row.commentsCount ?? row.comments_count ?? 0,
              comments: row.comments || undefined,
              watched: row.watched ?? 0,
              retweet: false,
              liked: false,
              bookmarked: false,
              videoUrl: isVideo ? mediaUrl || undefined : undefined,
            };
          });
        }
      }

      if (items.length === 0) {
        const reviewsRef = collection(firestore, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setReviews([]);
          return;
        }

        items = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data() as any;
          const createdAt = (data.createdAt as any)?.toDate
            ? (data.createdAt as any).toDate()
            : new Date();

          return {
            id: index + 1,
            user: data.userDisplayName || data.userName || 'watcher',
            avatar: data.userAvatar || undefined,
            date: createdAt.toLocaleDateString(),
            review: data.review || '',
            movie: data.title || data.movie || undefined,
            image: data.type === 'video' ? undefined : (data.mediaUrl ? { uri: data.mediaUrl } : undefined),
            genres: data.genres || [],
            likes: data.likes ?? 0,
            commentsCount: data.commentsCount ?? 0,
            comments: data.comments || undefined,
            watched: data.watched ?? 0,
            retweet: false,
            liked: false,
            bookmarked: false,
            videoUrl: data.videoUrl || (data.type === 'video' ? data.mediaUrl : undefined),
          };
        });
      }

      setReviews(items);
    } catch (error) {
      console.warn('Failed to load social reviews from Firestore', error);
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    refreshReviews();
  }, [refreshReviews]);

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
    setReviews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, bookmarked: !item.bookmarked } : item))
    );
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
                  text: 'New comment',
                  spoiler: false,
                },
              ],
            }
          : item
      )
    );
  };

  const handleWatch = (id: number) => {
    setReviews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, watched: item.watched + 1 } : item))
    );
  };

  const handleShare = (id: number) => {
    Alert.alert('Share', `Share review ${id}`);
  };

  return {
    reviews,
    setReviews,
    refreshReviews,
    handleLike,
    handleBookmark,
    handleComment,
    handleWatch,
    handleShare,
  } as const;
}

export default useSocialReactions;
