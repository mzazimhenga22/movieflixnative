
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
import { BlurView } from 'expo-blur';
import ScreenWrapper from '../../components/ScreenWrapper';
import MovieList from '../../components/MovieList';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Media } from '../../types';
import { IconSymbol } from '../../components/ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RED_TEXT = '#E50914'; // Cinematic Glass Red

const SearchScreen = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const inputBackground = 'rgba(255, 255, 255, 0.05)';
  const headerOverlay = 'rgba(0, 0, 0, 0.2)';
  const borderColor = 'rgba(255, 255, 255, 0.1)';

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <View style={styles.root}>
          {/* Full-width blurred header card (edge-to-edge) */}
          <View style={styles.headerWrap}>
            <BlurView
              intensity={80}
              tint="dark"
              style={[styles.blur, { width: SCREEN_WIDTH }]}
            >
              <View style={[styles.headerInner, { backgroundColor: headerOverlay }]}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.iconButton}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <IconSymbol name="arrow.left" size={20} color={RED_TEXT} />
                </TouchableOpacity>

                <Animated.View style={[styles.searchWrap, { transform: [{ scale: scaleAnim }] }]}>
                  <TextInput
                    placeholder="Search movies, TV shows, actors, genres..."
                    placeholderTextColor={RED_TEXT + '99'}
                    value={query}
                    onChangeText={setQuery}
                    style={[
                      styles.input,
                      {
                        backgroundColor: inputBackground,
                        color: RED_TEXT,
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
                      <IconSymbol name="xmark" size={16} color={RED_TEXT} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.micIconPlaceholder}>
                      <IconSymbol name="magnifyingglass" size={16} color={RED_TEXT + '88'} />
                    </View>
                  )}
                </Animated.View>
              </View>
            </BlurView>
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
                <Text style={[styles.emptyTitle, { color: RED_TEXT }]}>No results</Text>
                <Text style={[styles.emptySubtitle, { color: RED_TEXT + '99' }]}>
                  Try a different title or remove filters.
                </Text>
              </View>
            ) : (
              // Centered hint card
              <View style={styles.hintContainer}>
                <BlurView intensity={50} tint={'dark'} style={styles.hintCardBlur}>
                  <View
                    style={[
                      styles.hintCard,
                      {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: borderColor,
                      },
                    ]}
                  >
                    <IconSymbol name="sparkles" size={36} color={RED_TEXT} />
                    <Text style={[styles.hintTitle, { color: RED_TEXT }]}>Find your next watch</Text>
                    <Text style={[styles.hintSubtitle, { color: RED_TEXT + '99' }]}>
                      Type at least 3 characters to search movies, actors, and genres.
                    </Text>
                  </View>
                </BlurView>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
  root: {
    flex: 1,
    paddingTop: 18,
  },
  headerWrap: {
    marginBottom: 12,
    alignItems: 'center',
  },
  blur: {
    alignSelf: 'center',
    borderRadius: 0,
    overflow: 'hidden',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    height: 36,
    width: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 6,
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
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 260,
    maxWidth: 360,
  },
  hintCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  hintTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  hintSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
});

export default SearchScreen;
