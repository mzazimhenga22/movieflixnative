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
import { getAccentFromPosterPath } from '../../constants/theme';
import { useAccent } from '../components/AccentContext';

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
    <View style={[styles.glassCard, styles.skelHeader]}>
      <View style={styles.skelTitle} />
    </View>

    <View style={[styles.glassCard, styles.skelCategories]}>
      <View style={styles.skelRow} />
      <View style={[styles.skelRow, { width: '70%', marginTop: 12 }]} />
    </View>

    <View style={[styles.glassCard, styles.skelList]}>
      <View style={styles.skelLine} />
      <View style={styles.skelLine} />
      <View style={styles.skelLineShort} />
    </View>
  </View>
);

  const CategoriesScreen: React.FC = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [moviesByGenre, setMoviesByGenre] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { setAccentColor } = useAccent();

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

  const selectedGenreName = selectedGenre
    ? genres.find((g) => g.id === selectedGenre)?.name ?? 'Genre'
    : null;

  const accentColor = getAccentFromPosterPath(
      moviesByGenre[0]?.poster_path || mainCategories[0]?.image || undefined
    );

    useEffect(() => {
      if (accentColor) {
        setAccentColor(accentColor);
      }
    }, [accentColor, setAccentColor]);

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={[accentColor, '#150a13', '#05060f']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      >
        {/* liquid background orbs for glassy depth */}
        <LinearGradient
          colors={['rgba(125,216,255,0.2)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.bgOrbPrimary}
        />
        <LinearGradient
          colors={['rgba(113,0,255,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.bgOrbSecondary}
        />
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header / Title (glassy hero) */}
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={['#e50914', '#b20710']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGlow}
            />
            <View style={styles.headerGlass}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerAccent} />
                <View>
                  <Text style={styles.headerEyebrow}>Browse by vibe</Text>
                  <Text style={styles.headerText}>Categories</Text>
                </View>
              </View>
              <View style={styles.headerMetaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>Genres</Text>
                </View>
                <View style={[styles.metaPill, styles.metaPillAlt]}>
                  <Text style={styles.metaText}>New & Trending</Text>
                </View>
                <View style={[styles.metaPill, styles.metaPillGhost]}>
                  <Text style={styles.metaText}>Curated</Text>
                </View>
              </View>
            </View>
          </View>

          {/* If genres are loading show skeleton that matches home screen */}
          {genresLoading ? (
            <GlassSkeleton />
          ) : (
            <>
              {/* Main Categories — glass card */}
              <View style={styles.sectionGlass}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Spotlight</Text>
                  <Text style={styles.sectionSubtitle}>Pick a vibe</Text>
                </View>
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
              </View>

              {/* Genre selector */}
              <View style={[styles.sectionGlass, styles.genreGlass]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Genres</Text>
                  <Text style={styles.sectionSubtitle}>Tap to filter</Text>
                </View>
                <GenreSelector
                  genres={genres}
                  selectedGenre={selectedGenre}
                  onSelectGenre={handleSelectGenre}
                />
              </View>

              {/* Results / loader */}
              {isLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#E50914" />
                </View>
              ) : selectedGenre !== null ? (
                <View style={[styles.sectionGlass, styles.resultsGlass]}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Results</Text>
                    {selectedGenreName ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{selectedGenreName}</Text>
                      </View>
                    ) : null}
                  </View>
                  <MovieList title="Results" movies={moviesByGenre} carousel={true} />
                </View>
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
  bgOrbPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -60,
    left: -50,
    opacity: 0.65,
    transform: [{ rotate: '14deg' }],
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -80,
    right: -20,
    opacity: 0.55,
    transform: [{ rotate: '-10deg' }],
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 18,
    paddingBottom: 48,
  },

  // Header
  headerWrap: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  headerGlass: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerText: {
    color: '#fefefe',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  metaPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  metaPillAlt: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metaPillGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  metaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fefefe',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },

  // Section glass card
  sectionGlass: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
