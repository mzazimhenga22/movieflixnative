
// SearchScreen.tsx
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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ScreenWrapper from '../../components/ScreenWrapper';
import MovieList from '../../components/MovieList';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Media } from '../../types';
import { getAccentFromPosterPath } from '../../constants/theme';
import { useAccent } from '../components/AccentContext';
import { IconSymbol } from '../../components/ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RED_TEXT = '#e50914'; // Warm movie accent

  const SearchScreen = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const { setAccentColor } = useAccent();

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (query.length > 2) {
      setLoading(true);

      Promise.all([
        fetch(`${API_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`),
        fetch(`${API_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`)
      ])
        .then(async ([movieRes, tvRes]) => {
          if (!movieRes.ok && !tvRes.ok) throw new Error('Both searches failed');

          const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
          const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

          const movies = (movieData.results || []).map((m: any) => ({
            ...m,
            media_type: m.media_type ?? 'movie',
            title: m.title ?? m.original_title ?? '',
            release_date: m.release_date ?? m.first_air_date ?? null,
          }));

          const tvs = (tvData.results || []).map((t: any) => ({
            ...t,
            media_type: 'tv',
            title: t.name ?? t.original_name ?? '',
            release_date: t.first_air_date ?? t.first_air_date ?? null,
          }));

          const combined = [...movies, ...tvs].sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

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

  const clear = () => setQuery('');
  const accentColor = getAccentFromPosterPath(results[0]?.poster_path);

    useEffect(() => {
      if (accentColor) {
        setAccentColor(accentColor);
      }
    }, [accentColor, setAccentColor]);

  const inputBackground = 'transparent';
  const borderColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <LinearGradient
          colors={[accentColor, '#150a13', '#05060f']}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['rgba(125,216,255,0.2)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.bgOrbPrimary}
        />
        <LinearGradient
          colors={['rgba(229,9,20,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.bgOrbSecondary}
        />
        <View style={styles.root}>
          {/* Glassy hero header */}
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={['#e50914', '#b20710']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGlow}
            />
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.iconButton}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <IconSymbol name="arrow.left" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                  <Text style={styles.eyebrow}>Find your next watch</Text>
                  <Text style={styles.title}>Search</Text>
                </View>
              </View>

              <Animated.View style={[styles.searchWrap, { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.searchBg}
                />
                <TextInput
                  placeholder="Search movies, TV shows, actors, genres..."
                  placeholderTextColor={'#fefefe99'}
                  value={query}
                  onChangeText={setQuery}
                  style={[
                    styles.input,
                    {
                      color: '#fefefe',
                      borderColor: borderColor,
                    },
                  ]}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  returnKeyType="search"
                  accessible
                  accessibilityLabel="Search input"
                />

                {query.length > 0 ? (
                  <TouchableOpacity onPress={clear} style={styles.clearBtn} accessibilityRole="button">
                    <IconSymbol name="xmark" size={16} color="#fefefe" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.micIconPlaceholder}>
                    <IconSymbol name="magnifyingglass" size={16} color={'#fefefe88'} />
                  </View>
                )}
              </Animated.View>
            </View>
          </View>

          {/* Content */}
          <View style={[styles.body, { paddingHorizontal: 16 }]}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={RED_TEXT} />
              </View>
            ) : results.length > 0 ? (
              <MovieList movies={results} title={query.length > 2 ? 'Search Results' : ''} />
            ) : query.length > 2 ? (
              <View style={styles.empty}>
                <IconSymbol name="film" size={42} color={RED_TEXT + '88'} />
                <Text style={[styles.emptyTitle, { color: '#fefefe' }]}>No results</Text>
                <Text style={[styles.emptySubtitle, { color: '#fefefe99' }]}>
                  Try a different title or remove filters.
                </Text>
              </View>
            ) : (
              // Centered hint card
              <View style={styles.hintContainer}>
                <View style={styles.hintCardBlur}>
                  <View style={styles.hintCard}>
                    <IconSymbol name="wand.and.stars" size={36} color={'#fefefe'} />
                    <Text style={styles.hintTitle}>Find your next watch</Text>
                    <Text style={styles.hintSubtitle}>
                      Type at least 3 characters to search movies, actors, and genres.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -80,
    left: -40,
    opacity: 0.6,
    transform: [{ rotate: '16deg' }],
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -90,
    right: -20,
    opacity: 0.55,
    transform: [{ rotate: '-12deg' }],
  },
  flex: { flex: 1 },
  root: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 0,
  },
  headerWrap: {
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
    borderRadius: 18,
  },
  headerCard: {
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  titleWrap: {
    flex: 1,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    color: '#fefefe',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  searchBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    height: 36,
    width: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  micIconPlaceholder: {
    position: 'absolute',
    right: 10,
    height: 36,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 36,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  hintContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 260,
    maxWidth: 360,
  },
  hintCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  hintTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#fefefe',
  },
  hintSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
    color: '#fefefe99',
  },
});

export default SearchScreen;
