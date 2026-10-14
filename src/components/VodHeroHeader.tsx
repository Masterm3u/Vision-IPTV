import React, { useState, useEffect } from 'react';
import { Star, Play, Heart, Film, Sparkles, Loader2, Video, X, ExternalLink } from 'lucide-react';
import { IPTVChannel } from '../types/iptv';
import { fetchTmdbMovieInfo, TmdbMovieInfo } from '../services/tmdbService';
import { fixUtf8 } from '../utils/utf8';
import { cn } from '../App';

interface VodHeroHeaderProps {
  channel: IPTVChannel | null;
  categoryName?: string | null;
  onPlay: (channel: IPTVChannel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onOpenFullscreenHero?: (channel: IPTVChannel) => void;
}

export function VodHeroHeader({
  channel,
  categoryName,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  onOpenFullscreenHero
}: VodHeroHeaderProps) {
  const [movieInfo, setMovieInfo] = useState<TmdbMovieInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  useEffect(() => {
    if (!channel) {
      setMovieInfo(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchTmdbMovieInfo(channel.name).then((data) => {
      if (isMounted) {
        setMovieInfo(data);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setMovieInfo(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [channel?.id, channel?.name]);

  if (!channel) return null;

  const backdropImage = movieInfo?.backdrop_url || movieInfo?.poster_url || channel.logo;
  const is4K = /\b(4K|UHD|2160p)\b/i.test(channel.name);
  const isFHD = /\b(FHD|1080p|HD)\b/i.test(channel.name);
  const genresList = movieInfo?.genres && movieInfo.genres.length > 0 ? movieInfo.genres : [];
  const trailerKey = movieInfo?.trailer_key;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movieInfo?.title || channel.name} bande annonce francaise trailer`)}`;

  return (
    <>
      <div 
        onClick={() => onOpenFullscreenHero?.(channel)}
        data-tv-no-focus="true"
        data-no-dpad="true"
        tabIndex={-1}
        className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-[#09101b] border border-white/10 hover:border-emerald-500/40 shadow-2xl h-[210px] sm:h-[230px] md:h-[245px] shrink-0 flex flex-col justify-between group select-none cursor-pointer transition-all duration-300 pointer-events-auto"
      >
        {/* Backdrop Fanart Artwork on Right with Soft Gradients */}
        {backdropImage && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 md:w-3/5 lg:w-1/2 pointer-events-none overflow-hidden">
            <img
              src={backdropImage}
              alt={channel.name}
              className="w-full h-full object-cover object-center filter brightness-75 sm:brightness-85 md:brightness-95 contrast-105 transition-all duration-500 scale-105 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            {/* Multi-stage horizontal and vertical gradient blends */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#09101b] via-[#09101b]/85 md:via-[#09101b]/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09101b] via-[#09101b]/20 to-[#09101b]/40" />
            <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/60" />
          </div>
        )}

        {/* Left Details Panel */}
        <div className="relative z-10 p-4 sm:p-6 md:p-7 flex flex-col justify-between max-w-xl md:max-w-2xl lg:max-w-3xl h-full pointer-events-auto">
          <div className="space-y-2">
            {/* Main Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md truncate max-w-full group-hover:text-emerald-300 transition-colors">
              {fixUtf8(channel.name)}
            </h1>

            {/* Metadata Row: Rating, Year, Genres, Quality Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold text-white/90 h-6">
              {/* Rating Box */}
              {movieInfo?.vote_average ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-xs shadow-md">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{movieInfo.vote_average.toFixed(1)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-bold text-xs">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VOD</span>
                </div>
              )}

              {/* Release Year */}
              {movieInfo?.year ? (
                <span className="text-white/90 font-bold">{movieInfo.year}</span>
              ) : null}

              {/* Separator */}
              {(movieInfo?.year || genresList.length > 0) && (
                <span className="text-white/30 font-bold">•</span>
              )}

              {/* Genres / Category */}
              {genresList.length > 0 ? (
                <span className="text-white/75 truncate max-w-xs sm:max-w-md font-medium">
                  {genresList.slice(0, 4).join(', ')}
                </span>
              ) : channel.group ? (
                <span className="text-white/60 truncate max-w-xs font-medium">
                  {fixUtf8(channel.group)}
                </span>
              ) : null}

              {/* Resolution Badges */}
              {is4K && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] tracking-wider uppercase border border-cyan-500/30">
                  4K UHD
                </span>
              )}
              {isFHD && !is4K && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-500/30">
                  FHD
                </span>
              )}
            </div>

            {/* Plot Synopsis / Description (Strictly Fixed Height container) */}
            <div className="h-14 sm:h-16 md:h-18 overflow-hidden pt-0.5">
              {loading ? (
                <div className="flex items-center gap-2 py-1.5 text-white/40 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Chargement du synopsis TMDB...</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal select-text line-clamp-2 sm:line-clamp-3 drop-shadow-sm max-w-2xl">
                  {fixUtf8(movieInfo?.overview || "Sélectionnez un film pour ouvrir sa fiche plein écran, regarder la bande-annonce ou lancer la lecture.")}
                </p>
              )}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
            {/* 1. Regarder Button */}
            <button
              type="button"
              tabIndex={-1}
              data-tv-focusable="false"
              onClick={() => onPlay(channel)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Regarder</span>
            </button>

            {/* 2. Bande-annonce (Trailer) Button - Right after Regarder */}
            <button
              type="button"
              tabIndex={-1}
              data-tv-focusable="false"
              onClick={() => setShowTrailerModal(true)}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/15 transition-all shadow-md active:scale-95 cursor-pointer hover:border-emerald-500/40"
              title="Regarder la bande-annonce"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Bande-annonce</span>
            </button>

            {/* 3. Favori Button */}
            {onToggleFavorite && (
              <button
                type="button"
                tabIndex={-1}
                data-tv-focusable="false"
                onClick={() => onToggleFavorite(channel.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border transition-all text-xs sm:text-sm font-semibold cursor-pointer",
                  isFavorite
                    ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                <span className="hidden sm:inline">{isFavorite ? 'Favori' : 'Favori'}</span>
              </button>
            )}

            {categoryName && (
              <span className="hidden sm:inline-block ml-auto text-xs text-white/40 font-mono">
                {categoryName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-4xl bg-[#09101b] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0c1420]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Bande-annonce : {fixUtf8(movieInfo?.title || channel.name)}
                  </h3>
                  {movieInfo?.trailer_name && (
                    <p className="text-xs text-white/50">{movieInfo.trailer_name}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowTrailerModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Fermer</span>
              </button>
            </div>

            <div className="aspect-video w-full bg-black relative flex items-center justify-center">
              {trailerKey ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                  title={`Bande-annonce ${channel.name}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <Film className="w-7 h-7" />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-base font-bold text-white mb-1">
                      Bande-annonce directe non trouvée
                    </h4>
                    <p className="text-xs text-white/60 mb-4">
                      Recherchez la bande-annonce sur YouTube :
                    </p>
                    <a
                      href={youtubeSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ouvrir sur YouTube</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

