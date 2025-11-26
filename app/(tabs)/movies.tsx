import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { API_KEY, API_BASE_URL } from '../../constants/api';
import ScreenWrapper from '../../components/ScreenWrapper';
import Story from '../../components/Story';
import FeaturedMovie from '../../components/FeaturedMovie';
import SongList from '../../components/SongList';
import MovieList from '../../components/MovieList';
import { Media, Genre } from '../../types/index';
import { authPromise, firestore } from '../../constants/firebase';

const shuffleArray = <T,>(array: T[] | undefined): T[] => {
  if (!array) return [];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {/* Header skeleton */}
    <BlurView intensity={50} tint="dark" style={[styles.glassCard, styles.skeletonHeader]}>
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonIconRow} />
    </BlurView>

    {/* Stories skeleton */}
    <BlurView intensity={40} tint="dark" style={[styles.glassCard, styles.skeletonStory]}>
      <View style={styles.skeletonLine} />
    </BlurView>

    {/* Featured skeleton */}
    <BlurView intensity={35} tint="dark" style={[styles.glassCard, styles.skeletonFeatured]}>
      <View style={styles.skeletonLineLarge} />
    </BlurView>

    {/* Lists skeletons - mimic MovieList rows */}
    <BlurView intensity={30} tint="dark" style={[styles.glassCard, styles.skeletonList]}>
      <View style={styles.skeletonRow} />
    </BlurView>
    <BlurView intensity={30} tint="dark" style={[styles.glassCard, styles.skeletonList]}>
      <View style={styles.skeletonRow} />
    </BlurView>
    <BlurView intensity={30} tint="dark" style={[styles.glassCard, styles.skeletonList]}>
      <View style={styles.skeletonRow} />
    </BlurView>
  </View>
);

const HomeScreen: React.FC = () => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [movieReels, setMovieReels] = useState<Media[]>([]);
  const [recommended, setRecommended] = useState<Media[]>([]);
  const [songs, setSongs] = useState<Media[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Media | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [netflix, setNetflix] = useState<Media[]>([]);
  const [amazon, setAmazon] = useState<Media[]>([]);
  const [hbo, setHbo] = useState<Media[]>([]);
  const [userName, setUserName] = useState('watcher');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    const fetchUserData = async () => {
      try {
        const auth = await authPromise;
        // initial fetch
        const user = auth.currentUser;
        if (user) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists()) {
              setUserName((userDoc.data() as any).name ?? 'watcher');
            }
          } catch (err) {
            console.error('Failed to fetch user data:', err);
          }
        }

        // subscribe to auth changes after auth is ready
        unsubAuth = onAuthStateChanged(auth, async (u) => {
          if (u) {
            try {
              const userDoc = await getDoc(doc(firestore, 'users', u.uid));
              if (userDoc.exists()) {
                setUserName((userDoc.data() as any).name ?? 'watcher');
              } else {
                setUserName('watcher');
              }
            } catch (err) {
              console.error('Failed to fetch user data on auth change:', err);
              setUserName('watcher');
            }
          } else {
            setUserName('watcher');
          }
        });
      } catch (err) {
        console.error('Auth initialization failed in HomeScreen:', err);
      }
    };

    fetchUserData();

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  useEffect(() => {
    const fetchProviderMovies = async (providerId: number): Promise<Media[]> => {
      const res = await fetch(
        `${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=${providerId}&watch_region=US&with_watch_monetization_types=flatrate`
      );
      const json = await res.json();
      return json?.results || [];
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          netflixMovies,
          amazonMovies,
          hboMovies,
          movieStoriesData,
          tvStoriesData,
          trendingData,
          movieReelsData,
          recommendedData,
          songsData,
          genresData,
        ] = await Promise.all([
          fetchProviderMovies(8),
          fetchProviderMovies(9),
          fetchProviderMovies(384),
          fetch(`${API_BASE_URL}/trending/movie/day?api_key=${API_KEY}`).then(
            (r) => r.json()
          ),
          fetch(`${API_BASE_URL}/trending/tv/day?api_key=${API_KEY}`).then(
            (r) => r.json()
          ),
          fetch(`${API_BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(
            (r) => r.json()
          ),
          fetch(`${API_BASE_URL}/movie/upcoming?api_key=${API_KEY}`).then((r) =>
            r.json()
          ),
          fetch(`${API_BASE_URL}/movie/top_rated?api_key=${API_KEY}`).then(
            (r) => r.json()
          ),
          fetch(`${API_BASE_URL}/movie/popular?api_key=${API_KEY}`).then((r) =>
            r.json()
          ),
          fetch(`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}`).then(
            (r) => r.json()
          ),
        ]);

        setNetflix(netflixMovies || []);
        setAmazon(amazonMovies || []);
        setHbo(hboMovies || []);

        const combinedStories = [
          ...(movieStoriesData?.results || []),
          ...(tvStoriesData?.results || []),
        ].map((item: any) => ({
          id: item.id,
          title: item.title || item.name || 'Untitled',
          image: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : null,
          media_type: item.media_type,
        }));

        setStories(shuffleArray(combinedStories));
        const trendingResults = (trendingData?.results || []) as Media[];
        setTrending(trendingResults);
        setFeaturedMovie(trendingResults[0] || null);

        setSongs((songsData?.results || []) as Media[]);
        setMovieReels((movieReelsData?.results || []) as Media[]);
        setRecommended((recommendedData?.results || []) as Media[]);
        setGenres((genresData?.genres || []) as Genre[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // rotate featured movie every 20s
  useEffect(() => {
    if (trending.length <= 1) return;

    const interval = setInterval(() => {
      setFeaturedMovie((currentFeatured) => {
        if (!currentFeatured) return trending[0] || null;
        const currentIndex = trending.findIndex((m) => m.id === currentFeatured.id);
        const nextIndex = (currentIndex + 1) % trending.length;
        return trending[nextIndex] || trending[0] || null;
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [trending]);

  // rotate stories in blocks of 4 every 8s
  useEffect(() => {
    if (stories.length <= 4) return;

    const interval = setInterval(() => {
      setStoryIndex((prevIndex) => {
        const nextIndex = prevIndex + 4;
        return nextIndex >= stories.length ? 0 : nextIndex;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [stories]);

  const getGenreNames = (genreIds: number[] = []) => {
    if (!genres.length || !genreIds?.length) return '';
    return genreIds
      .map((id) => genres.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleShuffle = () => {
    const allContent = [...trending, ...movieReels, ...recommended, ...netflix, ...amazon, ...hbo];
    if (allContent.length > 0) {
      const randomItem = allContent[Math.floor(Math.random() * allContent.length)];
      router.push(`/details/${randomItem.id}?mediaType=${randomItem.media_type || 'movie'}`);
    }
  };

  const displayedStories = stories.slice(storyIndex, storyIndex + 4);

  if (loading) {
    return (
      <ScreenWrapper>
        <LoadingSkeleton />
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#2b0000', '#120206', '#06060a']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Header (glass) */}
          <BlurView intensity={60} tint="dark" style={styles.headerGlass}>
            <Text style={styles.headerText}>Welcome, {userName}</Text>

            <View style={styles.headerIcons}>
              <Link href="/search" asChild>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="search" size={22} color="#FFF" style={styles.iconMargin} />
                </TouchableOpacity>
              </Link>

              <Link href="/my-list" asChild>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="list-sharp" size={22} color="#FFF" style={styles.iconMargin} />
                </TouchableOpacity>
              </Link>

              <Link href="/profile" asChild>
                <TouchableOpacity style={styles.iconBtn}>
                  <FontAwesome name="user-circle" size={26} color="#FFF" />
                </TouchableOpacity>
              </Link>
            </View>
          </BlurView>

          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {stories.length === 0 && recommended.length === 0 && trending.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No movies or shows available right now.</Text>
              </View>
            ) : (
              <>
                <View style={styles.storiesSection}>
                  <BlurView intensity={40} tint="dark" style={styles.sectionGlass}>
                    <Story stories={displayedStories} />
                  </BlurView>
                </View>

                {featuredMovie && (
                  <BlurView intensity={36} tint="dark" style={styles.sectionGlass}>
                    <FeaturedMovie movie={featuredMovie} getGenreNames={getGenreNames} />
                  </BlurView>
                )}

                <BlurView intensity={32} tint="dark" style={styles.sectionGlass}>
                  <SongList title="Songs of the Moment" songs={songs} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="Movie Reels" movies={movieReels} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="Trending" movies={trending} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="Recommended" movies={recommended} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="Netflix Originals" movies={netflix} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="Amazon Prime Video" movies={amazon} />
                </BlurView>

                <BlurView intensity={28} tint="dark" style={styles.sectionGlass}>
                  <MovieList title="HBO Max" movies={hbo} />
                </BlurView>
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.fab} onPress={handleShuffle}>
            <Ionicons name="shuffle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    borderRadius: 0,
  },
  container: {
    flex: 1,
    paddingBottom: 0,
  },
  // Header glass card
  headerGlass: {
    margin: 12,
    marginTop: Platform.OS === 'ios' ? 48 : 18,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // glass border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
  },
  iconMargin: {
    marginRight: 4,
  },

  scrollViewContent: {
    paddingBottom: 160,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  storiesSection: {
    marginVertical: 8,
  },

  sectionGlass: {
    borderRadius: 14,
    marginBottom: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  fab: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    right: 18,
    bottom: 110,
    // Glassy red FAB
    backgroundColor: 'rgba(229,9,20,0.95)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 12,
    shadowColor: '#E50914',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },

  emptyText: {
    color: '#E6E6E6',
    fontSize: 16,
  },

  // Skeleton / glass card styles
  skeletonContainer: {
    padding: 14,
    gap: 12,
  },
  glassCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    marginBottom: 12,
  },
  skeletonHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonStory: {
    height: 120,
  },
  skeletonFeatured: {
    height: 220,
  },
  skeletonList: {
    height: 140,
  },
  skeletonLine: {
    height: 12,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonLineLarge: {
    height: 14,
    width: '80%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonLineShort: {
    height: 12,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  skeletonIconRow: {
    width: 110,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  skeletonRow: {
    height: 86,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
});

export default HomeScreen;
