import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import CategoryCard from '../components/categories/CategoryCard';
import GenreSelector from '../components/categories/GenreSelector';
import MovieList from '../../components/MovieList';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Genre, Media } from '../../types';

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

const CategoriesScreen: React.FC = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [moviesByGenre, setMoviesByGenre] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (error) {
        console.error('Error fetching genres:', error);
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
        const response = await fetch(`${API_BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenre}`);
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
    // Handle navigation or filtering based on main categories here
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Categories</Text>

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

        <GenreSelector
          genres={genres}
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#1e90ff" style={styles.loader} />
        ) : selectedGenre !== null ? (
          <MovieList
            title="Results"
            movies={moviesByGenre}
            carousel={true} // Use a simpler vertical list
          />
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  mainCategoriesSection: {
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default CategoriesScreen;
