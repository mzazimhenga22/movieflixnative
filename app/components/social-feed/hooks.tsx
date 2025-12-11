import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../../../constants/firebase';
import { supabase, supabaseConfigured } from '../../../constants/supabase';
import { useUser } from '../../../hooks/use-user';
import type { FeedCardItem, Comment as FeedComment } from '../../../types/social-feed';

export type ReviewItem = FeedCardItem & {
  docId?: string;
  origin?: 'firestore' | 'supabase';
};

export function useSocialReactions() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const { user } = useUser();

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
              docId: undefined,
              origin: 'supabase',
              userId: row.userId ?? row.user_id ?? null,
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

        items = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as any;
            const createdAt = (data.createdAt as any)?.toDate
              ? (data.createdAt as any).toDate()
              : new Date();

            let comments: FeedComment[] | undefined = undefined;
            try {
              const commentsRef = collection(firestore, 'reviews', docSnap.id, 'comments');
              const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'), limit(20));
              const commentsSnap = await getDocs(commentsQuery);
              if (!commentsSnap.empty) {
                comments = commentsSnap.docs.map((commentDoc) => {
                  const commentData = commentDoc.data() as any;
                  return {
                    id: commentDoc.id,
                    user:
                      commentData.userDisplayName ||
                      commentData.userName ||
                      commentData.user ||
                      'Movie fan',
                    text: commentData.text || '',
                    spoiler: Boolean(commentData.spoiler),
                  };
                });
              }
            } catch (err) {
              console.warn('Failed to load comments for review', docSnap.id, err);
            }

            return {
              id: docSnap.id,
              docId: docSnap.id,
              origin: 'firestore' as const,
              userId: data.userId ?? data.ownerId ?? null,
              user: data.userDisplayName || data.userName || 'watcher',
              avatar: data.userAvatar || undefined,
              date: createdAt.toLocaleDateString(),
              review: data.review || '',
              movie: data.title || data.movie || undefined,
              image:
                data.type === 'video'
                  ? undefined
                  : data.mediaUrl
                  ? { uri: data.mediaUrl }
                  : undefined,
              genres: data.genres || [],
              likes: data.likes ?? 0,
              commentsCount: data.commentsCount ?? (comments ? comments.length : 0),
              comments,
              watched: data.watched ?? 0,
              retweet: false,
              liked: false,
              bookmarked: false,
              videoUrl: data.videoUrl || (data.type === 'video' ? data.mediaUrl : undefined),
            };
          }),
        );
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

  const createNotification = useCallback(
    async ({
      targetUid,
      type,
      actorName,
      actorAvatar,
      targetId,
      docPath,
      message,
    }: {
      targetUid?: string | null;
      type: 'like' | 'comment';
      actorName: string;
      actorAvatar?: string | null;
      targetId?: string | number;
      docPath?: string;
      message: string;
    }) => {
      if (!targetUid || !user?.uid || targetUid === user.uid) return;
      try {
        await addDoc(collection(firestore, 'notifications'), {
          type,
          scope: 'social',
          channel: 'community',
          actorId: user.uid,
          actorName,
          actorAvatar: actorAvatar ?? null,
          targetUid,
          targetType: 'feed',
          targetId: targetId ?? null,
          docPath: docPath ?? null,
          message,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Failed to create notification', err);
      }
    },
    [user?.uid, user?.displayName],
  );

  const handleLike = (id: ReviewItem['id']) => {
    const targetReview = reviews.find((item) => item.id === id);
    if (!targetReview) return;
    const nextLiked = !targetReview.liked;
    const delta = nextLiked ? 1 : -1;

    setReviews((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, liked: nextLiked, likes: Math.max(0, item.likes + delta) }
          : item,
      ),
    );

    if (targetReview.origin === 'firestore' && targetReview.docId) {
      const reviewRef = doc(firestore, 'reviews', targetReview.docId);
      updateDoc(reviewRef, {
        likes: increment(delta),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Failed to persist like', err));

      if (nextLiked) {
        const actorName =
          user?.displayName || user?.email?.split('@')[0] || 'Movie fan';
        createNotification({
          targetUid: targetReview.userId,
          type: 'like',
          actorName,
          actorAvatar: (user as any)?.photoURL ?? null,
          targetId: targetReview.docId,
          docPath: `reviews/${targetReview.docId}`,
          message: `${actorName} liked your feed${targetReview.movie ? ` about "${targetReview.movie}"` : ''}.`,
        });
      }
    }
  };

  const handleBookmark = (id: ReviewItem['id']) => {
    setReviews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, bookmarked: !item.bookmarked } : item))
    );
  };

  const handleComment = (id: ReviewItem['id'], text?: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    const commenter =
      user?.displayName || user?.email?.split('@')[0] || user?.uid || 'You';

    let pendingDoc: { docId: string } | null = null;
    const localComment = {
      id: Date.now(),
      user: commenter,
      text: trimmed,
      spoiler: false,
    };

    setReviews((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.origin === 'firestore' && item.docId) {
          pendingDoc = { docId: item.docId };
        }
        return {
          ...item,
          commentsCount: item.commentsCount + 1,
          comments: [localComment, ...(item.comments || [])],
        };
      })
    );

    if (pendingDoc) {
      const reviewRef = doc(firestore, 'reviews', pendingDoc.docId);
      const commentsRef = collection(reviewRef, 'comments');
      const payload = {
        userId: user?.uid ?? 'anonymous',
        userDisplayName: commenter,
        text: trimmed,
        spoiler: false,
        createdAt: serverTimestamp(),
      };

      const commentPromise = addDoc(commentsRef, payload).then((commentDoc) => {
        createNotification({
          targetUid: reviews.find((r) => r.id === id)?.userId,
          type: 'comment',
          actorName: commenter,
          actorAvatar: (user as any)?.photoURL ?? null,
          targetId: pendingDoc!.docId,
          docPath: commentDoc.path,
          message: `${commenter} commented on your feed${trimmed ? `: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '…' : ''}"` : ''}`,
        });
      });

      Promise.all([
        updateDoc(reviewRef, {
          commentsCount: increment(1),
          updatedAt: serverTimestamp(),
        }),
        commentPromise,
      ]).catch((err) => console.warn('Failed to persist comment', err));
    }
  };

  const handleWatch = (id: ReviewItem['id']) => {
    setReviews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, watched: item.watched + 1 } : item))
    );
  };

  const handleShare = (id: ReviewItem['id']) => {
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
