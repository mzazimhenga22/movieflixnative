import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import MovieDetailsView from './MovieDetailsView';
import { API_KEY, API_BASE_URL } from '../../constants/api';
import { Media } from '../../types';

interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
}

const MovieDetailsContainer: React.FC = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState<Media | null>(null);
  const [trailers, setTrailers] = useState<Video[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    // small guard: if no id, don't fetch
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchMovieDetails = async () => {
      setIsLoading(true);
      try {
        // fetch details in parallel
        const [detailsRes, videosRes, relatedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/movie/${id}?api_key=${API_KEY}`),
          fetch(`${API_BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`),
          fetch(`${API_BASE_URL}/movie/${id}/recommendations?api_key=${API_KEY}`),
        ]);

        const movieDetailsData = await detailsRes.json();
        const movieVideosData = await videosRes.json();
        const relatedMoviesData = await relatedRes.json();

        if (!mounted) return;

        setMovie(movieDetailsData || null);
        setTrailers(
          (movieVideosData?.results || []).filter(
            (video: Video) => video.site === 'YouTube' && video.type === 'Trailer'
          )
        );
        setRelatedMovies(relatedMoviesData?.results || []);
      } catch (error) {
        console.error('Error fetching movie details:', error);
        if (mounted) {
          setMovie(null);
          setTrailers([]);
          setRelatedMovies([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // small delay to let UI render the skeleton immediately for better perceived performance
    const t = setTimeout(fetchMovieDetails, 120);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [id]);

  const handleWatchTrailer = (key?: string) => {
    const trailerKey = key || (trailers.length > 0 ? trailers[0].key : null);
    if (trailerKey) {
      WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${trailerKey}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <MovieDetailsView
        movie={movie}
        trailers={trailers}
        relatedMovies={relatedMovies}
        isLoading={isLoading}
        onWatchTrailer={handleWatchTrailer}
        onBack={handleBack}
        onSelectRelated={(relatedId: number) => router.push(`/details/${relatedId}`)}
      />
    </>
  );
};

export default MovieDetailsContainer;
