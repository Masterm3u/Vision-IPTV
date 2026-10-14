export interface TmdbMovieInfo {
  found: boolean;
  id?: number;
  title?: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  year?: string | null;
  vote_average?: number | null;
  vote_count?: number;
  poster_url?: string | null;
  backdrop_url?: string | null;
  genres?: string[];
  cleanedTitle?: string;
  trailer_key?: string | null;
  trailer_name?: string | null;
  cast?: string[];
  director?: string | null;
  runtime?: number | null;
}

const clientCache = new Map<string, TmdbMovieInfo>();

export async function fetchTmdbMovieInfo(rawTitle: string): Promise<TmdbMovieInfo> {
  const key = rawTitle.toLowerCase().trim();
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  try {
    const res = await fetch(`/api/tmdb/movie?title=${encodeURIComponent(rawTitle)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: TmdbMovieInfo = await res.json();
    clientCache.set(key, data);
    return data;
  } catch (err) {
    console.error('Failed to fetch TMDB info for:', rawTitle, err);
    return {
      found: false,
      title: rawTitle,
      overview: 'Impossible de charger le synopsis TMDB.',
      genres: []
    };
  }
}
