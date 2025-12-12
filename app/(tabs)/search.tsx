// app/(tabs)/search.tsx  (SearchScreen)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ScreenWrapper from '../../components/ScreenWrapper';
import MovieList from '../../components/MovieList';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Media } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { getAccentFromPosterPath } from '../../constants/theme';
import { useAccent } from '../components/AccentContext';

const RED_TEXT = '#e50914';

const SearchScreen = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const { setAccentColor } = useAccent();

  const scaleAnim = useRef(new Animated.Value(1)).current;

  /** SEARCH LOGIC */
  useEffect(() => {
    if (query.length > 2) {
      setLoading(true);

      Promise.all([
        fetch(
          `${API_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
            query
          )}`
        ),
        fetch(
          `${API_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
            query
          )}`
        ),
      ])
        .then(async ([movieRes, tvRes]) => {
          const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
          const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

          const movies = (movieData.results || []).map((m: any) => ({
            ...m,
            media_type: 'movie',
            title: m.title ?? m.original_title ?? '',
            release_date: m.release_date ?? null,
          }));

          const tvs = (tvData.results || []).map((t: any) => ({
            ...t,
            media_type: 'tv',
            title: t.name ?? t.original_name ?? '',
            release_date: t.first_air_date ?? null,
          }));

          const combined = [...movies, ...tvs].sort(
            (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
          );

          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setResults(combined);
          setLoading(false);
        })
        .catch((err) => {
          console.warn('Search error', err);
          setLoading(false);
        });
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setResults([]);
    }
  }, [query]);

  /** ACCENT UPDATE */
  const accentColor =
    getAccentFromPosterPath(results[0]?.poster_path) ?? '#e50914';

  useEffect(() => {
    setAccentColor(accentColor);
  }, [accentColor, setAccentColor]);

  const clear = () => setQuery('');

  // Title to satisfy MovieListProps
  const listTitle =
    results.length > 0
      ? query.length > 2
        ? `Results for “${query}”`
        : 'Results'
      : '';

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* BACKGROUND */}
        <LinearGradient
          colors={[accentColor, '#150a13', '#05060f']}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.gradient}
        />

        {/* TRANSPARENT GLASS HEADER */}
        <View style={styles.headerContainer}>
          <BlurView intensity={45} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              {/* Back Icon */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              {/* Hero Text */}
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroSubtitle}>Find your next watch</Text>
                <Text style={styles.heroTitle}>Search</Text>
              </View>
            </View>

            {/* Search Bar */}
            <Animated.View
              style={[
                styles.searchWrap,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color="#fff"
                style={styles.searchIcon}
              />

              <TextInput
                placeholder="Search movies, TV shows, actors..."
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />

              {query.length > 0 && (
                <TouchableOpacity onPress={clear} style={styles.clearBtn}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </Animated.View>
          </BlurView>
        </View>

        {/* CONTENT */}
        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={RED_TEXT} />
            </View>
          ) : results.length > 0 ? (
            <MovieList movies={results} title={listTitle} />
          ) : query.length > 2 ? (
            <View style={styles.empty}>
              <Ionicons
                name="film-outline"
                size={42}
                color={RED_TEXT + 'CC'}
              />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySubtitle}>
                Try a different title or spelling.
              </Text>
            </View>
          ) : (
            <View style={styles.centerHint}>
              <Text style={styles.hintBig}>Start typing to search…</Text>
              <Text style={styles.hintSmall}>
                Movies, series, actors, genres and more.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },

  /** HEADER */
  headerContainer: {
    paddingTop: 26,
    paddingHorizontal: 14,
  },
  headerBlur: {
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  /** SEARCH BAR */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  clearBtn: {
    padding: 6,
  },

  /** CONTENT */
  body: {
    flex: 1,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyTitle: { marginTop: 10, color: '#fff', fontSize: 16 },
  emptySubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  centerHint: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hintBig: { color: '#ffffffcc', fontSize: 18, marginBottom: 6 },
  hintSmall: { color: '#ffffff88', fontSize: 13 },
});

export default SearchScreen;
