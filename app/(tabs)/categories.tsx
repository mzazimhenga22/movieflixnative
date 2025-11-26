import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import CategoryCard from '../components/categories/CategoryCard';
import GenreSelector from '../components/categories/GenreSelector';
import MovieList from '../../components/MovieList';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Genre, Media } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const mainCategories = [
  {
    id: 'featured',
    title: 'Featured',
    image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800&q=80',
  },
  {
    id: 'new',
    title: 'New Releases',
    image: 'https://images.unsplash.com/photo-1608170825933-2824ad7c4a2c?w=800&q=80',
  },
  {
    id: 'trending',
    title: 'Trending',
    image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&q=80',
  },
];

const GlassSkeleton = () => (
  <View style={styles.skeletonWrap}>
    <BlurView intensity={50} tint="dark" style={[styles.glassCard, styles.skelHeader]}>
      <View style={styles.skelTitle} />
    </BlurView>

    <BlurView intensity={45} tint="dark" style={[styles.glassCard, styles.skelCategories]}>
      <View style={styles.skelRow} />
      <View style={[styles.skelRow, { width: '70%', marginTop: 12 }]} />
    </BlurView>

    <BlurView intensity={40} tint="dark" style={[styles.glassCard, styles.skelList]}>
      <View style={styles.skelLine} />
      <View style={styles.skelLine} />
      <View style={styles.skelLineShort} />
    </BlurView>
  </View>
);

const CategoriesScreen: React.FC = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [moviesByGenre, setMoviesByGenre] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      setGenresLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (error) {
        console.error('Error fetching genres:', error);
      } finally {
        setGenresLoading(false);
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    if (selectedGenre === null) {
      setMoviesByGenre([]);
      return;
    }

    const fetchMoviesByGenre = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenre}`
        );
        const data = await response.json();
        setMoviesByGenre(data.results || []);
      } catch (error) {
        console.error('Error fetching movies by genre:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoviesByGenre();
  }, [selectedGenre]);

  const handleSelectGenre = (genreId: number) => {
    setSelectedGenre((prev) => (prev === genreId ? null : genreId));
  };

  const handleCategoryPress = (categoryId: string) => {
    console.log(`Category pressed: ${categoryId}`);
    // Add navigation or filtering logic here if desired
  };

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#2b0000', '#120206', '#06060a']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header / Title (glass) */}
          <BlurView intensity={60} tint="dark" style={styles.headerGlass}>
            <Text style={styles.headerText}>Categories</Text>
          </BlurView>

          {/* If genres are loading show skeleton that matches home screen */}
          {genresLoading ? (
            <GlassSkeleton />
          ) : (
            <>
              {/* Main Categories — glass card */}
              <BlurView intensity={48} tint="dark" style={styles.sectionGlass}>
                <View style={styles.mainCategoriesSection}>
                  {mainCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      title={category.title}
                      image={category.image}
                      onPress={() => handleCategoryPress(category.id)}
                    />
                  ))}
                </View>
              </BlurView>

              {/* Genre selector */}
              <BlurView intensity={44} tint="dark" style={[styles.sectionGlass, styles.genreGlass]}>
                <GenreSelector
                  genres={genres}
                  selectedGenre={selectedGenre}
                  onSelectGenre={handleSelectGenre}
                />
              </BlurView>

              {/* Results / loader */}
              {isLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#E50914" />
                </View>
              ) : selectedGenre !== null ? (
                <BlurView intensity={36} tint="dark" style={[styles.sectionGlass, styles.resultsGlass]}>
                  <MovieList title="Results" movies={moviesByGenre} carousel={true} />
                </BlurView>
              ) : null}
            </>
          )}

          {/* bottom spacing */}
          <View style={{ height: 90 }} />
        </ScrollView>
      </LinearGradient>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 48 : 18,
    paddingBottom: 40,
  },

  // Header
  headerGlass: {
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // Section glass card
  sectionGlass: {
    borderRadius: 14,
    marginBottom: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // main categories
  mainCategoriesSection: {
    flexDirection: 'column',
    gap: 12,
  },

  // genre selector glass tweaks
  genreGlass: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  resultsGlass: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },

  // Loader wrapper
  loaderWrap: {
    alignItems: 'center',
    marginTop: 18,
  },

  // Skeleton styles (to match homescreen look)
  skeletonWrap: {
    paddingVertical: 6,
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
  skelHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skelCategories: {
    minHeight: 120,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  skelList: {
    minHeight: 140,
    padding: 12,
  },
  skelTitle: {
    height: 14,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  skelRow: {
    height: 40,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  skelLine: {
    height: 12,
    width: '85%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skelLineShort: {
    height: 12,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
});

export default CategoriesScreen;
