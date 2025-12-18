import AsyncStorage from '@react-native-async-storage/async-storage';

type InteractionEvent = {
  type: string; // 'view'|'like'|'comment'|'share'|'story_view' etc
  actorId?: string | null;
  targetId?: string | number | null;
  targetUserId?: string | null;
  timestamp: number;
  meta?: Record<string, any>;
};

const EVENTS_KEY = 'algo_events_v1';
const MAX_EVENTS = 2000;

async function loadEvents(): Promise<InteractionEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InteractionEvent[];
  } catch (e) {
    return [];
  }
}

async function saveEvents(events: InteractionEvent[]) {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch (e) {
    // ignore
  }
}

export async function logInteraction(evt: Omit<InteractionEvent, 'timestamp'>) {
  try {
    const events = await loadEvents();
    events.push({ ...evt, timestamp: Date.now() });
    await saveEvents(events);
  } catch (e) {
    // ignore logging failures
  }
}

type FeedItem = any & {
  id: string | number;
  userId?: string | null;
  likes?: number;
  commentsCount?: number;
  watched?: number;
  createdAt?: number | string | null;
};

function hoursSince(ts: number) {
  return Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
}

function recencyBoost(createdAt?: number | string | null) {
  if (!createdAt) return 0.5;
  const t = typeof createdAt === 'string' ? Date.parse(createdAt) : Number(createdAt);
  if (!t || Number.isNaN(t)) return 0.5;
  const hrs = hoursSince(t);
  // more recent -> higher (1..0)
  return Math.exp(-hrs / 24);
}

export async function recommendForFeed(items: FeedItem[], opts?: { userId?: string | null; friends?: string[]; now?: number }) {
  const events = await loadEvents();
  const friendsSet = new Set((opts?.friends || []).map(String));
  const now = opts?.now ?? Date.now();

  // Compute affinity: how many times current user interacted with an item's author
  const actorAffinities: Record<string, number> = {};
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e.actorId || !e.targetUserId) continue;
    const key = `${e.actorId}:${e.targetUserId}`;
    actorAffinities[key] = (actorAffinities[key] || 0) + 1;
  }

  const scored = items.map((it) => {
    const likes = Number(it.likes ?? 0);
    const comments = Number(it.commentsCount ?? 0);
    const watched = Number(it.watched ?? 0);
    const popularity = Math.log(1 + likes + comments + watched);

    const recency = recencyBoost(it.createdAt ?? null);

    let affinity = 0;
    if (opts?.userId && it.userId) {
      affinity = actorAffinities[`${opts.userId}:${String(it.userId)}`] ?? 0;
      // normalize
      affinity = Math.min(5, affinity) / 5;
    }

    const friendBoost = it.userId && friendsSet.has(String(it.userId)) ? 1 : 0;

    // timeOfDay boost: if item created roughly same hour-of-day as now
    let todBoost = 0;
    try {
      const created = it.createdAt ? new Date(it.createdAt as any) : null;
      if (created) {
        const nowHour = new Date(now).getHours();
        const createdHour = created.getHours();
        const diff = Math.abs(nowHour - createdHour);
        todBoost = Math.max(0, 1 - diff / 12);
      }
    } catch (e) {
      todBoost = 0;
    }

    const score =
      popularity * 0.45 +
      recency * 0.25 +
      affinity * 0.18 +
      friendBoost * 0.08 +
      todBoost * 0.04;

    return { item: it, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => ({ ...s.item, _score: s.score }));
}

export async function recommendForStories(stories: any[], opts?: { userId?: string | null; friends?: string[]; now?: number }) {
  // simple story ranking: prefer friends and recent
  const now = opts?.now ?? Date.now();
  const friendsSet = new Set((opts?.friends || []).map(String));

  const scored = stories.map((s) => {
    const createdAt = s?.createdAt?.toMillis ? s.createdAt.toMillis() : Number(s.createdAt) || 0;
    const rec = recencyBoost(createdAt || null);
    const friend = s?.userId && friendsSet.has(String(s.userId)) ? 1 : 0;
    const score = rec * 0.7 + friend * 0.3;
    return { story: s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => ({ ...s.story, _score: s.score }));
}

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

export default { logInteraction, recommendForFeed, recommendForStories, shuffle };
