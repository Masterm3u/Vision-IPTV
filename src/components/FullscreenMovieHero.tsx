import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Film, 
  Star, 
  Heart, 
  ChevronLeft, 
  X, 
  Clock, 
  Calendar, 
  Users, 
  Video, 
  Sparkles, 
  Loader2, 
  Tv, 
  ExternalLink 
} from 'lucide-react';
import { IPTVChannel } from '../types/iptv';
import { fetchTmdbMovieInfo, TmdbMovieInfo } from '../services/tmdbService';
import { fixUtf8 } from '../utils/utf8';
import { cn } from '../App';

interface FullscreenMovieHeroProps {
  channel: IPTVChannel;
  categoryName?: string | null;
  onPlay: (channel: IPTVChannel) => void;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function FullscreenMovieHero({
  channel,
  categoryName,
  onPlay,
  onClose,
  isFavorite = false,
  onToggleFavorite
}: FullscreenMovieHeroProps) {
  const [movieInfo, setMovieInfo] = useState<TmdbMovieInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Button refs for precision TV D-pad navigation
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const trailerButtonRef = useRef<HTMLButtonElement>(null);
  const favoriteButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const trailerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const youtubeButtonRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchTmdbMovieInfo(channel.name)
      .then((data) => {
        if (isMounted) {
          setMovieInfo(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMovieInfo(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [channel.id, channel.name]);

  // Autofocus the "Regarder" (Play) button by default on open
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showTrailerModal) {
        playButtonRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [channel.id, showTrailerModal]);

  // Dedicated TV Remote D-Pad and Keyboard navigation for Fullscreen Hero
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If Trailer Modal is Open
      if (showTrailerModal) {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
          e.preventDefault();
          setShowTrailerModal(false);
          setTimeout(() => trailerButtonRef.current?.focus(), 50);
          return;
        }

        // Left/Right inside Trailer Modal if YouTube fallback exists
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          if (youtubeButtonRef.current) {
            e.preventDefault();
            youtubeButtonRef.current.focus();
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          if (trailerCloseButtonRef.current) {
            e.preventDefault();
            trailerCloseButtonRef.current.focus();
          }
        }
        return;
      }

      // 2. Back / Escape keys -> return to VOD grid
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        e.preventDefault();
        onClose();
        return;
      }

      // Quick shortcut keys
      if (e.key === 't' || e.key === 'T' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setShowTrailerModal(true);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onToggleFavorite?.(channel.id);
        return;
      }

      // 3. D-Pad Directional Navigation
      const active = document.activeElement;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (active === playButtonRef.current) {
          trailerButtonRef.current?.focus();
        } else if (active === trailerButtonRef.current) {
          if (favoriteButtonRef.current) {
            favoriteButtonRef.current.focus();
          }
        } else if (active === backButtonRef.current) {
          closeButtonRef.current?.focus();
        } else {
          // If focus was lost, bring it to "Regarder"
          playButtonRef.current?.focus();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (active === favoriteButtonRef.current) {
          trailerButtonRef.current?.focus();
        } else if (active === trailerButtonRef.current) {
          playButtonRef.current?.focus();
        } else if (active === closeButtonRef.current) {
          backButtonRef.current?.focus();
        } else {
          playButtonRef.current?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active === playButtonRef.current || active === trailerButtonRef.current) {
          backButtonRef.current?.focus();
        } else if (active === favoriteButtonRef.current) {
          closeButtonRef.current?.focus();
        } else {
          backButtonRef.current?.focus();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active === backButtonRef.current) {
          playButtonRef.current?.focus();
        } else if (active === closeButtonRef.current) {
          if (favoriteButtonRef.current) {
            favoriteButtonRef.current.focus();
          } else {
            trailerButtonRef.current?.focus();
          }
        } else if (!active || active === document.body) {
          playButtonRef.current?.focus();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        // If no button is currently focused, Enter launches playback directly
        if (!active || active === document.body) {
          e.preventDefault();
          onPlay(channel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal, onClose, onToggleFavorite, onPlay, channel]);

  const backdropImage = movieInfo?.backdrop_url || movieInfo?.poster_url || channel.logo;
  const posterImage = movieInfo?.poster_url || channel.logo;
  const is4K = /\b(4K|UHD|2160p)\b/i.test(channel.name);
  const isFHD = /\b(FHD|1080p|HD)\b/i.test(channel.name);
  const genresList = movieInfo?.genres && movieInfo.genres.length > 0 ? movieInfo.genres : [];

  const formatRuntime = (mins?: number | null) => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
    return `${m} min`;
  };

  const runtimeStr = formatRuntime(movieInfo?.runtime);
  const trailerKey = movieInfo?.trailer_key;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movieInfo?.title || channel.name} bande annonce francaise trailer`)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[60] bg-[#070b12] text-white flex flex-col overflow-hidden select-none"
    >
      {/* High-Resolution Ambient Fanart Backdrop */}
      {backdropImage && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={backdropImage}
            alt={channel.name}
            className="w-full h-full object-cover object-center filter brightness-[0.38] contrast-110 scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          {/* Cinematic Multilayer Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b12] via-[#070b12]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/60 to-[#070b12]/40" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#070b12]/30 to-[#070b12]/90" />
        </div>
      )}

      {/* Top Floating Action Bar */}
      <header className="relative z-20 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 border-b border-white/10 bg-[#070b12]/70 backdrop-blur-xl">
        {/* Back to VOD Grid button */}
        <button
          ref={backButtonRef}
          onClick={onClose}
          tabIndex={0}
          data-tv-focusable="true"
          className="flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black focus:bg-emerald-500 focus:text-black focus:ring-4 focus:ring-emerald-400 focus:outline-none border border-white/15 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer group"
          title="Retourner à la grille VOD (Échap ou Retour)"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:text-black group-focus:text-black transition-colors" />
          <span>Retour à la grille</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 group-hover:bg-black/20 group-focus:bg-black/20 text-white/70 group-hover:text-black group-focus:text-black font-mono font-bold hidden sm:inline">
            Échap
          </span>
        </button>

        {/* Category & Badge */}
        <div className="flex items-center gap-2">
          {categoryName && (
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-medium hidden sm:inline-block">
              {fixUtf8(categoryName)}
            </span>
          )}
          {is4K && (
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 font-extrabold text-[11px] uppercase tracking-wider border border-cyan-500/30">
              4K Ultra HD
            </span>
          )}
        </div>

        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          tabIndex={0}
          data-tv-focusable="true"
          className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/15 focus:bg-white/20 focus:ring-4 focus:ring-emerald-400 focus:outline-none text-white/60 hover:text-white focus:text-white transition-all cursor-pointer"
          title="Fermer (Échap)"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </header>

      {/* Main Fullscreen Hero Content Container */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 md:px-12 lg:px-16 py-6 sm:py-10 flex flex-col justify-center max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Poster Presentation Card */}
          <div className="lg:col-span-4 flex justify-center lg:justify-start">
            <div className="relative group w-48 sm:w-56 md:w-64 lg:w-72 aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0c1420] border-2 border-white/15 shadow-2xl shadow-black/80 flex-shrink-0">
              {posterImage ? (
                <img
                  src={posterImage}
                  alt={channel.name}
                  className="w-full h-full object-cover object-center transform transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30 bg-gradient-to-br from-neutral-900 to-[#0c1420]">
                  <Film className="w-16 h-16" />
                  <span className="text-xs font-bold">Affiche indisponible</span>
                </div>
              )}

              {/* Glossy Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Quality & Rating Badges Over Poster */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                {is4K && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500 text-black font-black text-[10px] uppercase shadow-md">
                    4K
                  </span>
                )}
                {isFHD && !is4K && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-black text-[10px] uppercase shadow-md">
                    FHD
                  </span>
                )}
              </div>

              {movieInfo?.vote_average && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-amber-300 font-extrabold border border-amber-500/40 text-xs shadow-lg">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{movieInfo.vote_average.toFixed(1)} / 10</span>
                  </div>
                  {movieInfo.vote_count ? (
                    <span className="text-[10px] text-white/60 font-mono">
                      {movieInfo.vote_count} votes
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right Details, Synopsis & Action Buttons Column */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            
            {/* Title & Original Title */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                {fixUtf8(movieInfo?.title || channel.name)}
              </h1>
              {movieInfo?.original_title && movieInfo.original_title !== movieInfo.title && (
                <p className="text-sm sm:text-base text-white/50 font-medium italic">
                  Titre original : {movieInfo.original_title}
                </p>
              )}
            </div>

            {/* Badges Metadata Row: Rating, Year, Runtime, Genres */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold text-white/85">
              {/* TMDB Rating */}
              {movieInfo?.vote_average ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{movieInfo.vote_average.toFixed(1)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white/80 font-bold">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>VOD</span>
                </div>
              )}

              {/* Release Year */}
              {movieInfo?.year && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white/90">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{movieInfo.year}</span>
                </div>
              )}

              {/* Runtime Duration */}
              {runtimeStr && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white/90">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{runtimeStr}</span>
                </div>
              )}

              {/* Genres Chips */}
              {genresList.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Synopsis / Plot Description */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synopsis</span>
              </h3>
              {loading ? (
                <div className="flex items-center gap-3 py-3 text-white/50 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Recherche des informations TMDB...</span>
                </div>
              ) : (
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal select-text">
                  {fixUtf8(movieInfo?.overview || "Aucun résumé disponible pour ce film. Lancez la lecture pour découvrir le contenu.")}
                </p>
              )}
            </div>

            {/* Cast & Director Row (if available) */}
            {(movieInfo?.director || (movieInfo?.cast && movieInfo.cast.length > 0)) && (
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-white/70 pt-1">
                {movieInfo.director && (
                  <div>
                    <span className="text-white/40 block text-[11px] font-bold uppercase">Réalisateur</span>
                    <span className="text-white/90 font-semibold">{movieInfo.director}</span>
                  </div>
                )}
                {movieInfo.cast && movieInfo.cast.length > 0 && (
                  <div>
                    <span className="text-white/40 block text-[11px] font-bold uppercase">Avec</span>
                    <span className="text-white/90 font-semibold">{movieInfo.cast.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Primary Action Buttons: Regarder, Bande-annonce, Favori */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3">
              {/* 1. Regarder Button */}
              <button
                ref={playButtonRef}
                onClick={() => onPlay(channel)}
                tabIndex={0}
                data-tv-focusable="true"
                className="flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 bg-emerald-500 hover:bg-emerald-400 focus:bg-emerald-400 text-black font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/25 hover:scale-105 focus:scale-105 focus:ring-4 focus:ring-white focus:outline-none active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Regarder</span>
              </button>

              {/* 2. Bande-annonce (Trailer) Button - Right after Regarder */}
              <button
                ref={trailerButtonRef}
                onClick={() => setShowTrailerModal(true)}
                tabIndex={0}
                data-tv-focusable="true"
                className="flex items-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 bg-white/10 hover:bg-white/20 focus:bg-white/20 text-white font-bold text-sm sm:text-base rounded-2xl border border-white/15 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400 focus:outline-none focus:scale-105 transition-all shadow-lg active:scale-95 cursor-pointer hover:border-emerald-500/40"
                title="Regarder la bande-annonce officielle (Touche B ou T)"
              >
                <Video className="w-5 h-5 text-emerald-400" />
                <span>Bande-annonce</span>
              </button>

              {/* 3. Favori Button */}
              {onToggleFavorite && (
                <button
                  ref={favoriteButtonRef}
                  onClick={() => onToggleFavorite(channel.id)}
                  tabIndex={0}
                  data-tv-focusable="true"
                  className={cn(
                    "flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl border transition-all text-sm font-semibold cursor-pointer active:scale-95 focus:ring-4 focus:ring-emerald-400 focus:outline-none focus:scale-105",
                    isFavorite
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 focus:bg-red-500/30"
                      : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/15 focus:text-white"
                  )}
                  title={isFavorite ? "Retirer des favoris (Touche F)" : "Ajouter aux favoris (Touche F)"}
                >
                  <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                  <span className="hidden sm:inline">{isFavorite ? 'Favori' : 'Ajouter aux favoris'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Trailer Video Player Modal */}
      <AnimatePresence>
        {showTrailerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="w-full max-w-4xl bg-[#09101b] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
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
                  ref={trailerCloseButtonRef}
                  onClick={() => setShowTrailerModal(false)}
                  tabIndex={0}
                  data-tv-focusable="true"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 focus:bg-emerald-500 focus:text-black focus:ring-4 focus:ring-emerald-400 focus:outline-none text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Fermer (Échap)"
                >
                  <X className="w-4 h-4" />
                  <span>Fermer</span>
                </button>
              </div>

              {/* Video Embed Frame or Fallback */}
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
                        La bande-annonce n'a pas été indexée automatiquement sur TMDB. Vous pouvez la rechercher en un clic sur YouTube :
                      </p>
                      <a
                        ref={youtubeButtonRef}
                        href={youtubeSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        tabIndex={0}
                        data-tv-focusable="true"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 focus:bg-red-500 focus:ring-4 focus:ring-white focus:outline-none text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-600/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Ouvrir sur YouTube</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
