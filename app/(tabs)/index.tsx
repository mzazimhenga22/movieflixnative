import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import ScreenWrapper from '../../components/ScreenWrapper';
import Story from '../../components/Story';
import FeaturedMovie from '../../components/FeaturedMovie';
import SongList from '../../components/SongList';
import MovieList from '../../components/MovieList';
import { Media, Genre } from '../../types';

const shuffleArray = (array: any[]) => {
  if (!array) return [];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const HomeScreen = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchProviderMovies = async (providerId: number) => {
          const response = await fetch(
            `${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_watch_providers=${providerId}&watch_region=US&with_watch_monetization_types=flatrate`
          );
          const data = await response.json();
          return data.results || [];
        };

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
          fetch(`${API_BASE_URL}/trending/movie/day?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/trending/tv/day?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/trending/all/day?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/movie/upcoming?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/movie/top_rated?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/movie/popular?api_key=${API_KEY}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}`).then(res => res.json()),
        ]);

        setNetflix(netflixMovies || []);
        setAmazon(amazonMovies || []);
        setHbo(hboMovies || []);

        const combinedStories = [
          ...(movieStoriesData?.results || []),
          ...(tvStoriesData?.results || []),
        ].map(item => ({
          id: item.id,
          title: item.title || item.name,
          image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
        }));

        setStories(shuffleArray(combinedStories));

        const trendingResults = trendingData?.results || [];
        setTrending(trendingResults);
        setFeaturedMovie(trendingResults[0] || null);

        setSongs(songsData?.results || []);
        setMovieReels(movieReelsData?.results || []);
        setRecommended(recommendedData?.results || []);
        setGenres(genresData?.genres || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (trending.length > 1) {
      const interval = setInterval(() => {
        setFeaturedMovie(currentFeatured => {
          if (!currentFeatured) return trending[0];
          const currentIndex = trending.findIndex(m => m.id === currentFeatured.id);
          const nextIndex = (currentIndex + 1) % trending.length;
          return trending[nextIndex];
        });
      }, 20000);

      return () => clearInterval(interval);
    }
  }, [trending]);

  useEffect(() => {
    if (stories.length > 4) {
      const interval = setInterval(() => {
        setStoryIndex(prevIndex => {
          const nextIndex = prevIndex + 4;
          return nextIndex >= stories.length ? 0 : nextIndex;
        });
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [stories]);

  const getGenreNames = (genreIds: number[] = []) => {
    if (!genres.length) return '';
    return genreIds
      .map(id => genres.find(g => g.id === id)?.name)
      .filter(name => name)
      .join(', ');
  };

  const displayedStories = stories.slice(storyIndex, storyIndex + 4);

  return (
    <ScreenWrapper>
      {/* ensure status bar not translucent */}
      <StatusBar style="light" translucent={false} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Welcome, watcher</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity>
              <Ionicons name="search" size={24} color="white" style={styles.iconMargin} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="list-sharp" size={24} color="white" style={styles.iconMargin} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // replace so Home is removed from stack (prevents showing through)
                router.replace('/profile');
              }}
            >
              <FontAwesome name="user-circle" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <>
              <View style={styles.storiesSection}>
                <Story stories={displayedStories} />
              </View>

              {featuredMovie && <FeaturedMovie movie={featuredMovie} getGenreNames={getGenreNames} />}

              <SongList title="Songs of the Moment" songs={songs} />

              <MovieList title="Movie Reels" movies={movieReels} />
              <MovieList title="Trending" movies={trending} />
              <MovieList title="Recommended" movies={recommended} />

              <MovieList title="Netflix Originals" movies={netflix} />
              <MovieList title="Amazon Prime Video" movies={amazon} />
              <MovieList title="HBO Max" movies={hbo} />
            </>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // opaque background so previous screens don't show
  },
  scrollViewContent: {
    paddingBottom: 80,
    paddingTop: 10,
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'transparent',
  },
  headerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: 15,
  },
  storiesSection: {
    marginVertical: 10,
  },
});

export default HomeScreen;
