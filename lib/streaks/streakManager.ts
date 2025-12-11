import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakContext =
  | { kind: 'chat'; conversationId: string; partnerId?: string | null; partnerName?: string | null }
  | { kind: 'story'; userId: string; username?: string | null }
  | { kind: 'feed_like'; userId?: string | null }
  | { kind: 'feed_comment'; userId?: string | null }
  | { kind: 'feed_share'; userId?: string | null };

type StoredStreak = {
  count: number;
  lastDate: string;
  partnerId?: string | null;
  partnerName?: string | null;
  type?: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const buildKey = (ctx: StreakContext): string => {
  switch (ctx.kind) {
    case 'chat':
      return `streak:chat:${ctx.conversationId}`;
    case 'story':
      return `streak:story:${ctx.userId}`;
    case 'feed_like':
      return 'streak:feed:like';
    case 'feed_comment':
      return 'streak:feed:comment';
    case 'feed_share':
      return 'streak:feed:share';
    default:
      return 'streak:generic';
  }
};

export const updateStreakForContext = async (ctx: StreakContext): Promise<void> => {
  const key = buildKey(ctx);
  const today = todayKey();

  try {
    const raw = await AsyncStorage.getItem(key);
    let stored: StoredStreak | null = null;

    if (raw) {
      try {
        stored = JSON.parse(raw) as StoredStreak;
      } catch {
        stored = null;
      }
    }

    let count = stored?.count ?? 0;
    const lastDate = stored?.lastDate ?? null;

    if (lastDate !== today) {
      count += 1;
    }

    const payload: StoredStreak = {
      count,
      lastDate: today,
      type: ctx.kind,
    };

    if (ctx.kind === 'chat') {
      payload.partnerId = ctx.partnerId ?? stored?.partnerId ?? null;
      payload.partnerName = ctx.partnerName ?? stored?.partnerName ?? null;
    } else if (ctx.kind === 'story') {
      payload.partnerId = ctx.userId;
      payload.partnerName = ctx.username ?? stored?.partnerName ?? null;
    }

    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to update streak for context', err);
  }
};

export const getAllStreaks = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const streakKeys = keys.filter((k) => k.startsWith('streak:'));
    if (streakKeys.length === 0) return [];
    const entries = await AsyncStorage.multiGet(streakKeys);
    return entries;
  } catch (err) {
    console.error('Failed to list streaks', err);
    return [];
  }
};

export const getChatStreak = async (
  conversationId: string,
): Promise<{ count: number; lastDate: string } | null> => {
  try {
    const key = `streak:chat:${conversationId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredStreak;
    return {
      count: data.count ?? 0,
      lastDate: data.lastDate,
    };
  } catch (err) {
    console.error('Failed to read chat streak', err);
    return null;
  }
};
