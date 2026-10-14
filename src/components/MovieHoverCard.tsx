import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Play, Heart, Film, Calendar, Sparkles, Loader2, X } from 'lucide-react';
import { IPTVChannel } from '../types/iptv';
import { fetchTmdbMovieInfo, TmdbMovieInfo } from '../services/tmdbService';
import { fixUtf8 } from '../utils/utf8';

interface MovieHoverCardProps {
  channel: IPTVChannel;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onMouseEnterPopup?: () => void;
  onMouseLeavePopup?: () => void;
}

export default function MovieHoverCard({
  channel,
  anchorRect,
  isOpen,
  onClose,
  onPlay,
  isFavorite,
  onToggleFavorite,
  onMouseEnterPopup,
  onMouseLeavePopup
}: MovieHoverCardProps) {
  const [movieInfo, setMovieInfo] = useState<TmdbMovieInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !channel) return;

    let isMounted = true;
    setLoading(true);

    fetchTmdbMovieInfo(channel.name).then((data) => {
      if (isMounted) {
        setMovieInfo(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, channel]);

  if (!isOpen || !anchorRect) return null;

  // Viewport dimensions
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Dynamic sizing
  const cardWidth = Math.min(360, viewportWidth - 24);
  const maxCardHeight = Math.min(480, viewportHeight - 24);

  // Horizontal position: Center relative to anchor, clamp within screen
  let left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2;
  left = Math.max(12, Math.min(left, viewportWidth - cardWidth - 12));

  // Vertical position:
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let top = 0;
  let transformOrigin = 'top center';

  if (spaceBelow >= 360) {
    // Plenty of space below the anchor card
    top = anchorRect.bottom + 8;
    // Prevent overflowing bottom of viewport
    if (top + maxCardHeight > viewportHeight - 12) {
      top = Math.max(12, viewportHeight - maxCardHeight - 12);
    }
    transformOrigin = 'top center';
  } else if (spaceAbove >= 360) {
    // Plenty of space above the anchor card
    top = anchorRect.top - maxCardHeight - 8;
    if (top < 12) {
      top = 12;
    }
    transformOrigin = 'bottom center';
  } else {
    // Tight space on both sides: clamp cleanly within viewport
    top = Math.max(12, Math.min(anchorRect.top - 40, viewportHeight - maxCardHeight - 12));
    transformOrigin = 'center center';
  }

  const backdropImage = movieInfo?.backdrop_url || movieInfo?.poster_url || channel.logo;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: transformOrigin.includes('top') ? -6 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${cardWidth}px`,
            maxHeight: `${maxCardHeight}px`,
            transformOrigin,
            zIndex: 9999,
          }}
          onMouseEnter={onMouseEnterPopup}
          onMouseLeave={onMouseLeavePopup}
          className="bg-[#121212]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden text-white pointer-events-auto flex flex-col"
        >
          {/* Header Media Banner */}
          <div className="relative h-36 sm:h-40 w-full bg-black/80 flex-shrink-0 overflow-hidden">
            {backdropImage ? (
              <img
                src={backdropImage}
                alt={movieInfo?.title || channel.name}
                className="w-full h-full object-cover object-center filter brightness-90"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-900 to-black text-white/20">
                <Film className="w-10 h-10" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Aperçu Film</span>
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 text-emerald-400 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  TMDB
                </span>
                {movieInfo?.year && (
                  <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 text-white/80 font-medium text-[10px] px-2 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3 text-white/60" />
                    {movieInfo.year}
                  </span>
                )}
              </div>

              {movieInfo?.vote_average ? (
                <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold shadow-lg">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{movieInfo.vote_average.toFixed(1)}</span>
                  <span className="text-[10px] text-amber-300/60 font-normal">/10</span>
                </div>
              ) : null}
            </div>

            {/* Title on Banner Bottom */}
            <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10">
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug line-clamp-1 drop-shadow-md">
                {fixUtf8(movieInfo?.title || channel.name)}
              </h3>
              {movieInfo?.original_title && movieInfo.original_title !== movieInfo.title && (
                <p className="text-[10px] text-white/60 italic truncate">
                  Titre original : {fixUtf8(movieInfo.original_title)}
                </p>
              )}
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {/* Genre Tags */}
            {movieInfo?.genres && movieInfo.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {movieInfo.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="text-[10px] font-medium px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/70"
                  >
                    {fixUtf8(genre)}
                  </span>
                ))}
                {channel.group && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md truncate max-w-[120px]">
                    {fixUtf8(channel.group)}
                  </span>
                )}
              </div>
            )}

            {/* Synopsis / Description */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Synopsis
              </span>
              {loading ? (
                <div className="flex items-center gap-2 py-2 text-white/40 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Recherche du synopsis TMDB...</span>
                </div>
              ) : (
                <p className="text-xs text-white/80 leading-relaxed font-normal select-text">
                  {fixUtf8(movieInfo?.overview || "Aucun synopsis disponible pour ce titre.")}
                </p>
              )}
            </div>
          </div>

          {/* Action Bar (Always Visible at Bottom) */}
          <div className="p-3 sm:p-3.5 bg-[#141414] border-t border-white/10 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Regarder</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-2 rounded-xl border transition-all ${
                isFavorite
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
