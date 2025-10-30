export interface Media {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  backdrop_path?: string; // Add this
  overview?: string;      // Add this
}

export interface Genre {
  id: number;
  name: string;
}
