import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Tv, 
  Play, 
  Pause,
  Heart, 
  Info, 
  Search, 
  X, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Calendar, 
  Clock, 
  Star, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2,
  SkipBack,
  SkipForward,
  ArrowLeft,
  Loader2, 
  AlertCircle,
  Layers,
  Check,
  Film,
  Clapperboard,
  Video,
  Bookmark,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ListFilter,
  Folder,
  FolderOpen,
  Bell,
  Disc,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { IPTVChannel, IPTVPlaylist, StreamProxyMode, UserAgentMode, RecordingItem, ProgramReminder } from '../types/iptv';
import { fixUtf8 } from '../utils/utf8';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =========================================================================
// UNIFIED TIVIMATE PLAYER (Seamless Mini-Player & Fullscreen with Same Video)
// =========================================================================

interface TiviMateMiniPlayerProps {
  channel: IPTVChannel | null;
  streamProxyMode?: StreamProxyMode;
  userAgentMode?: UserAgentMode;
  customUserAgent?: string;
  isActive?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onExitFullscreen?: () => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  activeProgram?: any;
  programMeta?: any;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  currentTime?: Date;
  onWatch?: () => void;
}

export function TiviMateMiniPlayer({
  channel,
  streamProxyMode = 'auto',
  userAgentMode = 'auto',
  customUserAgent = '',
  isActive = true,
  isFullscreen = false,
  onToggleFullscreen,
  onExitFullscreen,
  onPrevChannel,
  onNextChannel,
  activeProgram,
  programMeta,
  isFavorite,
  onToggleFavorite,
  currentTime = new Date(),
  onWatch
}: TiviMateMiniPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vision_epg_mini_muted');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false;
  });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingProxy, setIsUsingProxy] = useState(streamProxyMode === 'always');
  const [aspectRatioMode, setAspectRatioMode] = useState<'contain' | 'cover' | 'fill' | '4:3'>('contain');
  const [showOsd, setShowOsd] = useState(false);
  const [osdChannelNotification, setOsdChannelNotification] = useState<string | null>(null);
  const osdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveUa = useMemo(() => {
    if (userAgentMode === 'custom' && customUserAgent) return customUserAgent;
    if (channel?.userAgent) return channel.userAgent;
    return 'VLC/3.0.18 LibVLC/3.0.18';
  }, [channel, userAgentMode, customUserAgent]);

  const getStreamUrl = (rawUrl: string, useProxy: boolean) => {
    if (!useProxy && streamProxyMode !== 'always') return rawUrl;
    let proxied = `/api/stream?url=${encodeURIComponent(rawUrl)}&ua=${encodeURIComponent(effectiveUa)}`;
    if (channel?.httpReferrer) {
      proxied += `&referer=${encodeURIComponent(channel.httpReferrer)}`;
    }
    return proxied;
  };

  useEffect(() => {
    setIsUsingProxy(streamProxyMode === 'always');
  }, [streamProxyMode, channel?.url]);

  // Keep DOM video element's muted property synchronized with isMuted state
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, isActive]);

  // Handle channel change notification banner in fullscreen
  useEffect(() => {
    if (isFullscreen && channel?.name) {
      setOsdChannelNotification(channel.name);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => {
        setOsdChannelNotification(null);
      }, 2500);
    }
  }, [channel?.id, isFullscreen]);

  // Fullscreen OSD auto-hide timer
  const resetOsdTimer = () => {
    setShowOsd(true);
    if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    if (isFullscreen) {
      osdTimeoutRef.current = setTimeout(() => {
        setShowOsd(false);
      }, 4000);
    }
  };

  useEffect(() => {
    if (isFullscreen) {
      // In fullscreen mode, start completely clean with top and bottom bars hidden
      setShowOsd(false);
      if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    } else {
      setShowOsd(true);
      if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    }
  }, [isFullscreen]);

  // Global Keyboard & Remote Navigation when in Fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      const code = e.keyCode || e.which;
      const key = e.key;

      resetOsdTimer();

      if (
        key === 'Escape' ||
        key === 'Back' ||
        key === 'GoBack' ||
        key === 'BrowserBack' ||
        key === 'Backspace' ||
        code === 10009 ||
        code === 461
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (onExitFullscreen) onExitFullscreen();
      } else if (key === 'ArrowUp' || key === 'PageUp' || key === 'ChannelUp' || key === 'w' || key === 'W' || code === 427) {
        e.preventDefault();
        if (onPrevChannel) onPrevChannel();
      } else if (key === 'ArrowDown' || key === 'PageDown' || key === 'ChannelDown' || key === 's' || key === 'S' || code === 428) {
        e.preventDefault();
        if (onNextChannel) onNextChannel();
      } else if (key === ' ' || key === 'k' || key === 'K') {
        e.preventDefault();
        togglePlayInternal();
      } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        toggleMuteInternal();
      } else if (key === 'f' || key === 'F' || key === 'Enter') {
        e.preventDefault();
        if (onToggleFullscreen) onToggleFullscreen();
      } else if (key === 'a' || key === 'A') {
        e.preventDefault();
        cycleAspectRatio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onExitFullscreen, onPrevChannel, onNextChannel, isPlaying, isMuted]);

  // Continuous Video Stream Manager (never unmounts or restarts on fullscreen toggle)
  useEffect(() => {
    if (!isActive || !channel || !channel.url) {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
      return;
    }

    let hlsInstance: Hls | null = null;
    let isCancelled = false;
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    // Apply mute state immediately before playback begins
    video.muted = isMuted;

    const streamUrl = getStreamUrl(channel.url, isUsingProxy);

    const safePlay = () => {
      if (isCancelled || !video || !isActive) return;
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!isCancelled) {
              setIsLoading(false);
              setIsPlaying(true);
              video.muted = isMuted;
            }
          })
          .catch((err: any) => {
            if (err.name === 'NotAllowedError' && !isMuted) {
              // If browser restricts unmuted autoplay, start muted then unmute
              video.muted = true;
              video.play().then(() => {
                if (!isCancelled) {
                  video.muted = isMuted;
                }
              }).catch(() => {});
            } else if (err.name === 'AbortError') {
              return;
            }
          });
      }
    };

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isCancelled && isActive) safePlay();
      });

      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (!isUsingProxy && streamProxyMode === 'auto') {
            setIsUsingProxy(true);
          } else {
            setHasError(true);
            setIsLoading(false);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      const handleLoadedMetadata = () => {
        if (isActive) safePlay();
      };
      const handleError = () => {
        if (!isUsingProxy && streamProxyMode === 'auto') {
          setIsUsingProxy(true);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        isCancelled = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      };
    } else {
      video.src = streamUrl;
      video.addEventListener('loadeddata', () => {
        if (isActive) safePlay();
      });
    }

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        try {
          hlsInstance.stopLoad();
          hlsInstance.detachMedia();
          hlsInstance.destroy();
        } catch {
          // ignore
        }
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      }
    };
  }, [channel?.url, isUsingProxy, isActive]);

  const togglePlayInternal = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlayInternal();
  };

  const toggleMuteInternal = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    try {
      localStorage.setItem('vision_epg_mini_muted', String(nextMuted));
    } catch {}
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMuteInternal();
  };

  const cycleAspectRatio = () => {
    setAspectRatioMode(prev => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      if (prev === 'fill') return '4:3';
      return 'contain';
    });
  };

  const retryStream = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUsingProxy(prev => !prev);
    setHasError(false);
    setIsLoading(true);
  };

  if (!channel) {
    return (
      <div className="w-full h-full bg-[#080d14] flex flex-col items-center justify-center border border-white/10 rounded-2xl text-white/30 p-4">
        <Tv className="w-12 h-12 mb-2 stroke-[1.5]" />
        <span className="text-xs uppercase tracking-widest font-bold">Sélectionnez une chaîne</span>
      </div>
    );
  }

  const videoClass = cn(
    "w-full h-full bg-black transition-all duration-200",
    aspectRatioMode === 'cover' && "object-cover",
    aspectRatioMode === 'fill' && "object-fill",
    aspectRatioMode === '4:3' && "aspect-[4/3] object-contain max-h-full mx-auto",
    aspectRatioMode === 'contain' && "object-contain"
  );

  const playerElement = (
    <div 
      className={cn(
        "bg-black select-none flex items-center justify-center transition-all duration-300",
        isFullscreen 
          ? cn("fixed inset-0 z-[99999] w-screen h-screen flex flex-col justify-between overflow-hidden", !showOsd ? "cursor-none" : "cursor-default") 
          : "relative w-full h-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl group"
      )}
      onClick={() => {
        if (!isFullscreen) {
          if (onToggleFullscreen) onToggleFullscreen();
          else if (onWatch) onWatch();
        } else {
          resetOsdTimer();
        }
      }}
      onMouseMove={isFullscreen ? resetOsdTimer : undefined}
      onTouchStart={isFullscreen ? resetOsdTimer : undefined}
      onDoubleClick={() => {
        if (onToggleFullscreen) onToggleFullscreen();
      }}
    >
      {/* Video Stream Element (Continuous & Unified) */}
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        autoPlay
        className={cn(videoClass, isFullscreen && "absolute inset-0 w-full h-full")}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
      />

      {/* ======================================================== */}
      {/* FULLSCREEN OSD CONTROLS & PROGRAM METADATA */}
      {/* ======================================================== */}
      {isFullscreen ? (
        <>
          {/* Top Bar OSD */}
          <div 
            className={cn(
              "absolute top-0 inset-x-0 z-30 p-5 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between transition-all duration-500",
              showOsd ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Back / Minimize Button & Channel Details */}
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onExitFullscreen) onExitFullscreen();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black text-white font-bold text-sm border border-white/15 transition-all shadow-lg active:scale-95 group/btn"
                title="Retour au Guide TV (Échap / Retour)"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1" />
                <span>Guide TV</span>
              </button>

              <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                {channel.logo ? (
                  <img 
                    src={channel.logo} 
                    alt={channel.name} 
                    className="w-9 h-9 object-contain rounded-lg bg-black/40 p-0.5 border border-white/10" 
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
                    <Tv className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white tracking-wide truncate max-w-sm">
                      {channel.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-black uppercase">
                      {channel.group || 'Direct'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions, Aspect Ratio, Mute, Clock, Fullscreen */}
            <div className="flex items-center gap-3">
              {/* Aspect Ratio Cycler */}
              <button
                onClick={cycleAspectRatio}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-colors uppercase tracking-wider flex items-center gap-1.5"
                title="Changer le ratio d'aspect"
              >
                <span>Ratio: {aspectRatioMode.toUpperCase()}</span>
              </button>

              {/* Mute Toggle */}
              <button
                onClick={toggleMute}
                className={cn(
                  "p-2.5 rounded-xl border transition-all",
                  isMuted 
                    ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white" 
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                )}
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Favorite Toggle */}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all",
                    isFavorite 
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                      : "bg-white/10 border-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                  title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star className={cn("w-4 h-4", isFavorite ? "fill-amber-400" : "")} />
                </button>
              )}

              {/* Live Clock */}
              <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/10 font-mono text-sm font-black text-cyan-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Exit Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onExitFullscreen) onExitFullscreen();
                }}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                title="Quitter le plein écran"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Channel Notification Badge during Zapping */}
          <AnimatePresence>
            {osdChannelNotification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="absolute top-24 left-8 z-40 bg-black/85 backdrop-blur-xl border border-cyan-500/40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3.5"
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-lg font-black text-white">{osdChannelNotification}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Bar OSD: Live Program, Progress & Controls */}
          <div 
            className={cn(
              "absolute bottom-0 inset-x-0 z-30 p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-4 transition-all duration-500",
              showOsd ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-6 pointer-events-none"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Program Title, Times & Synopsis */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5 max-w-4xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    DIRECT
                  </span>

                  {programMeta?.pgRating && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white font-bold text-xs">
                      {programMeta.pgRating}
                    </span>
                  )}

                  {programMeta?.timeRangeStr && (
                    <span className="text-white/60 font-mono text-sm font-semibold">
                      {programMeta.timeRangeStr}
                    </span>
                  )}

                  {programMeta?.remainingMins && (
                    <span className="text-cyan-400 font-bold text-sm">
                      (encore {programMeta.remainingMins} min)
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                  {fixUtf8(activeProgram?.title || channel.name)}
                </h1>

                {(activeProgram?.desc || activeProgram?.description) && (
                  <p className="text-sm sm:text-base text-white/70 line-clamp-2 max-w-3xl leading-relaxed">
                    {fixUtf8(activeProgram.desc || activeProgram.description)}
                  </p>
                )}
              </div>

              {/* Channel Switcher Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onPrevChannel && (
                  <button
                    onClick={onPrevChannel}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                    title="Chaîne précédente (Haut / W)"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span className="hidden sm:inline">Précédente</span>
                  </button>
                )}

                <button
                  onClick={togglePlay}
                  className="p-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black transition-all active:scale-95 shadow-lg shadow-cyan-500/30"
                  title={isPlaying ? 'Mettre en pause' : 'Reprendre la lecture'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {onNextChannel && (
                  <button
                    onClick={onNextChannel}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                    title="Chaîne suivante (Bas / S)"
                  >
                    <span className="hidden sm:inline">Suivante</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Progress Bar */}
            {programMeta && (
              <div className="w-full space-y-1">
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, programMeta.progressPercent || 0))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ======================================================== */
        /* MINI-PLAYER DOCKED OVERLAY (Inside EPG Grid Top-Left) */
        /* ======================================================== */
        <>
          {/* Top Left Live Badge */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            <span className="text-[10px] font-black tracking-widest text-white uppercase">DIRECT</span>
          </div>

          {/* Top Right Channel Badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white/90">
            <span className="max-w-[130px] truncate">{channel.name}</span>
          </div>

          {/* Controls Overlay */}
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 fill-current text-cyan-400" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleFullscreen) onToggleFullscreen();
                else if (onWatch) onWatch();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-lg text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/30"
              title="Agrandir en plein écran (2e clic / Entrée)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Plein écran</span>
            </button>
          </div>
        </>
      )}

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-xs text-white/80 font-medium mb-3">Flux momentanément indisponible</p>
          <button
            onClick={retryStream}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </button>
        </div>
      )}
    </div>
  );

  return playerElement;
}

// =========================================================================
// MAIN TIVIMATE EPG GRID VIEW
// =========================================================================

export interface EPGGridViewProps {
  channels: IPTVChannel[];
  selectedChannel?: IPTVChannel | null;
  onWatch: (c: IPTVChannel) => void;
  onSelectProgram: (p: any, c: IPTVChannel) => void;
  favoriteIds: string[];
  onToggleFavorite?: (id: string) => void;
  playlist: IPTVPlaylist | null;
  playlists?: IPTVPlaylist[];
  onSelectPlaylist?: (p: IPTVPlaylist) => void;
  onNavigate?: (view: string) => void;
  onNavigateToSettings?: () => void;
  onOpenMenu?: () => void;
  isMenuOpen?: boolean;
  isProgramModalOpen?: boolean;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  streamProxyMode?: StreamProxyMode;
  userAgentMode?: UserAgentMode;
  customUserAgent?: string;
  isPlayerFullscreen?: boolean;
  onPlayerFullscreenChange?: (isFullscreen: boolean) => void;
  isFavoritesView?: boolean;
  recordings?: RecordingItem[];
  onAddRecording?: (data: Omit<RecordingItem, 'id' | 'createdAt'>) => void;
  onDeleteRecording?: (id: string) => void;
  reminders?: ProgramReminder[];
  onAddReminder?: (data: Omit<ProgramReminder, 'id' | 'createdAt'>) => void;
  onDeleteReminder?: (id: string) => void;
}

export function EPGGridView({
  channels,
  selectedChannel,
  onWatch,
  onSelectProgram,
  favoriteIds,
  onToggleFavorite,
  playlist,
  playlists = [],
  onSelectPlaylist,
  onNavigate,
  onNavigateToSettings,
  onOpenMenu,
  isMenuOpen = false,
  isProgramModalOpen = false,
  selectedCategory,
  onSelectCategory,
  streamProxyMode = 'auto',
  userAgentMode = 'auto',
  customUserAgent = '',
  isPlayerFullscreen,
  onPlayerFullscreenChange,
  isFavoritesView = false,
  recordings = [],
  onAddRecording,
  onDeleteRecording,
  reminders = [],
  onAddReminder,
  onDeleteReminder
}: EPGGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const CHANNEL_HEADER_WIDTH = 288; // Largeur de la colonne sticky des chaînes (w-72)
  const miniPlayerSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);
  const [visibleCount, setVisibleCount] = useState(150);

  const [realEpgData, setRealEpgData] = useState<Record<string, any[]>>({});
  const [loadingChannels, setLoadingChannels] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TiviMate Left Sidebar states (Categories & Playlists column)
  const [isAllPlaylistsOpen, setIsAllPlaylistsOpen] = useState(true);
  const [isCurrentPlaylistOpen, setIsCurrentPlaylistOpen] = useState(true);
  const [openPlaylistAccordions, setOpenPlaylistAccordions] = useState<Record<string, boolean>>({});
  const [sidebarCatSearch, setSidebarCatSearch] = useState('');

  // Mini Menu Context Modal state (TiviMate quick actions: Rappel, Enregistrer, Canceller)
  const [quickMenuTarget, setQuickMenuTarget] = useState<{
    program: any;
    channel: IPTVChannel;
  } | null>(null);

  // Long press detection state (holding for 2-3s in grid opens the mini menu)
  const [holdingProgramKey, setHoldingProgramKey] = useState<string | null>(null);
  const [holdingProgress, setHoldingProgress] = useState<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
    setHoldingProgramKey(null);
    setHoldingProgress(0);
  }, []);

  const startHold = useCallback((prog: any, channel: IPTVChannel) => {
    cancelHold();
    const key = `${channel.id}_${prog.title}_${prog.start}`;
    setHoldingProgramKey(key);
    setHoldingProgress(0);

    const HOLD_MS = 2200; // ~2.2s deliberate long press
    const startTime = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / HOLD_MS) * 100));
      setHoldingProgress(pct);
    }, 40);

    holdTimerRef.current = setTimeout(() => {
      cancelHold();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40]); } catch {}
      }
      setQuickMenuTarget({ program: prog, channel });
    }, HOLD_MS);
  }, [cancelHold]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const getProgramTimestamps = useCallback((prog: any) => {
    if (prog.rawStart && prog.rawStop) {
      return {
        startTs: typeof prog.rawStart === 'number' ? prog.rawStart : new Date(prog.rawStart).getTime(),
        stopTs: typeof prog.rawStop === 'number' ? prog.rawStop : new Date(prog.rawStop).getTime()
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const baseMidnight = today.getTime();
    const currentHourStart = currentHour - 1;
    const startTs = baseMidnight + (currentHourStart + prog.start) * 3600 * 1000;
    const stopTs = startTs + (prog.duration || 1) * 3600 * 1000;
    return { startTs, stopTs };
  }, [currentHour]);

  // Update clock every 10 seconds for real-time tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    channels.forEach(ch => {
      const g = ch.group?.trim() || 'Uncategorized';
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [channels]);

  const favoritesCount = useMemo(() => {
    return channels.filter(ch => favoriteIds.includes(ch.id)).length;
  }, [channels, favoriteIds]);

  const filteredSidebarCategories = useMemo(() => {
    if (!sidebarCatSearch.trim()) return categories;
    const q = sidebarCatSearch.toLowerCase().trim();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, sidebarCatSearch]);

  const filteredChannels = useMemo(() => {
    let result = channels;

    if (selectedCategory === '__favorites__') {
      result = result.filter(ch => favoriteIds.includes(ch.id));
    } else if (selectedCategory) {
      result = result.filter(ch => (ch.group?.trim() || 'Uncategorized') === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(ch => 
        (ch.name && ch.name.toLowerCase().includes(q)) ||
        (ch.group && ch.group.toLowerCase().includes(q))
      );
    }

    return result;
  }, [channels, selectedCategory, searchQuery, favoriteIds]);

  // Focused channel and focused program states for TiviMate guide inspection
  // Initialized with memory retention (selectedChannel -> localStorage -> 1st channel)
  const [focusedChannel, setFocusedChannel] = useState<IPTVChannel | null>(() => {
    if (selectedChannel && channels.some(c => c.id === selectedChannel.id)) {
      return selectedChannel;
    }
    const savedId = typeof window !== 'undefined' 
      ? (localStorage.getItem('vision_last_epg_playing_id') || localStorage.getItem('vision_last_epg_channel_id')) 
      : null;
    if (savedId) {
      const found = channels.find(c => c.id === savedId);
      if (found) return found;
    }
    return channels[0] || null;
  });
  const [focusedProgram, setFocusedProgram] = useState<any | null>(null);

  // Dedicated Active Playing Channel state for top-left live video player
  // Browsing/zapping in EPG does NOT interrupt playback until explicitly selected
  const [playingChannel, setPlayingChannel] = useState<IPTVChannel | null>(() => {
    if (selectedChannel && channels.some(c => c.id === selectedChannel.id)) {
      return selectedChannel;
    }
    const savedPlayId = typeof window !== 'undefined' ? (localStorage.getItem('vision_last_epg_playing_id') || localStorage.getItem('vision_last_epg_channel_id')) : null;
    if (savedPlayId) {
      const found = channels.find(c => c.id === savedPlayId);
      if (found) return found;
    }
    return channels[0] || null;
  });

  // Unified Fullscreen Player state for EPG (same player instance, 0ms delay, zero reload)
  const [isFullscreen, setIsFullscreen] = useState(isPlayerFullscreen ?? false);

  useEffect(() => {
    if (isPlayerFullscreen !== undefined && isPlayerFullscreen !== isFullscreen) {
      setIsFullscreen(isPlayerFullscreen);
    }
  }, [isPlayerFullscreen]);

  const toggleFullscreen = (val?: boolean) => {
    const nextVal = val !== undefined ? val : !isFullscreen;
    setIsFullscreen(nextVal);
    onPlayerFullscreenChange?.(nextVal);
  };

  useEffect(() => {
    return () => {
      onPlayerFullscreenChange?.(false);
    };
  }, [onPlayerFullscreenChange]);

  const updatePlayingChannel = (channel: IPTVChannel) => {
    setPlayingChannel(channel);
    try {
      localStorage.setItem('vision_last_epg_playing_id', channel.id);
    } catch {}
  };

  const handlePrevChannel = () => {
    const list = filteredChannels.length > 0 ? filteredChannels : channels;
    if (list.length === 0) return;
    const currentId = (playingChannel || focusedChannel)?.id;
    const idx = list.findIndex(c => c.id === currentId);
    const nextIdx = idx > 0 ? idx - 1 : list.length - 1;
    const targetChan = list[nextIdx];
    updatePlayingChannel(targetChan);
    updateFocusedChannel(targetChan);
  };

  const handleNextChannel = () => {
    const list = filteredChannels.length > 0 ? filteredChannels : channels;
    if (list.length === 0) return;
    const currentId = (playingChannel || focusedChannel)?.id;
    const idx = list.findIndex(c => c.id === currentId);
    const nextIdx = idx < list.length - 1 ? idx + 1 : 0;
    const targetChan = list[nextIdx];
    updatePlayingChannel(targetChan);
    updateFocusedChannel(targetChan);
  };

  const handleOpenFullscreen = (channelToWatch?: IPTVChannel) => {
    const target = channelToWatch || playingChannel || focusedChannel;
    if (target) {
      updatePlayingChannel(target);
      updateFocusedChannel(target);
    }
    toggleFullscreen(true);
  };

  // Active Focus Pane state ('categories' | 'channels')
  const [activePane, setActivePane] = useState<'categories' | 'channels'>('channels');

  // Flattened list of category identifiers for keyboard navigation in category column
  const selectableCategoryKeys = useMemo(() => {
    const keys: string[] = ['__favorites__', '__all__'];
    filteredSidebarCategories.forEach(cat => {
      keys.push(cat.name);
    });
    return keys;
  }, [filteredSidebarCategories]);

  // Current category selection index
  const activeCategoryKey = selectedCategory === null ? '__all__' : selectedCategory;
  const currentCatIndex = useMemo(() => {
    const idx = selectableCategoryKeys.indexOf(activeCategoryKey);
    return idx >= 0 ? idx : 1; // default to '__all__'
  }, [selectableCategoryKeys, activeCategoryKey]);

  // Auto-focus and scroll to the chosen category when entering or returning to Column 1 (categories pane)
  useEffect(() => {
    if (activePane === 'categories') {
      const activeKey = selectedCategory === null ? '__all__' : selectedCategory;
      const targetId = `cat-btn-${encodeURIComponent(activeKey)}`;
      
      const focusTarget = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.focus();
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      };

      focusTarget();
      const rAF = requestAnimationFrame(focusTarget);
      const t1 = setTimeout(focusTarget, 50);
      const t2 = setTimeout(focusTarget, 150);
      const t3 = setTimeout(focusTarget, 320);
      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [activePane, selectedCategory]);

  // Helper to generate schedule for a channel starting 1 hour before current time
  const getChannelSchedule = useCallback((channelId: string) => {
    // Grid starts exactly 1 hour before current time (at (currentHour - 1):00)
    const gridStartHourTime = new Date(currentTime);
    gridStartHourTime.setHours(currentHour - 1, 0, 0, 0);
    const gridStartMs = gridStartHourTime.getTime();
    const gridEndMs = gridStartMs + 24 * 60 * 60 * 1000;

    const list = realEpgData[channelId];
    if (list && list.length > 0) {
      // Only retain programs that end after the grid start (1 hour before current time)
      const dayListings = list.filter(item => {
        const itemStart = item.startTimestamp || item.start || 0;
        const itemEnd = item.endTimestamp || item.stop || 0;
        return itemEnd > gridStartMs && itemStart < gridEndMs;
      });

      if (dayListings.length > 0) {
        dayListings.sort((a, b) => (a.startTimestamp || a.start || 0) - (b.startTimestamp || b.start || 0));

        const nonOverlapping: any[] = [];
        for (let i = 0; i < dayListings.length; i++) {
          const item = { ...dayListings[i] };
          const itemStart = item.startTimestamp || item.start || 0;
          const itemEnd = item.endTimestamp || item.stop || 0;

          if (itemEnd <= itemStart) continue;

          if (nonOverlapping.length === 0) {
            nonOverlapping.push(item);
            continue;
          }

          const prev = nonOverlapping[nonOverlapping.length - 1];
          const prevStart = prev.startTimestamp || prev.start || 0;

          if (itemStart <= prevStart) continue;

          if ((prev.endTimestamp || prev.stop || 0) > itemStart) {
            prev.endTimestamp = itemStart;
            prev.stop = itemStart;
          }

          nonOverlapping.push(item);
        }

        return nonOverlapping.map((item) => {
          const itemStart = item.startTimestamp || item.start || 0;
          const itemEnd = item.endTimestamp || item.stop || 0;

          const clampedStartMs = Math.max(gridStartMs, itemStart);
          const clampedEndMs = Math.min(gridEndMs, itemEnd);

          const relativeStart = Math.max(0, (clampedStartMs - gridStartMs) / (60 * 60 * 1000));
          const relativeEnd = Math.min(24, (clampedEndMs - gridStartMs) / (60 * 60 * 1000));
          const duration = Math.max(0.1, relativeEnd - relativeStart);

          return {
            title: fixUtf8(item.title) || 'Programme',
            desc: fixUtf8(item.desc || item.description || '') || '',
            description: fixUtf8(item.desc || item.description || '') || '',
            start: relativeStart,
            duration: duration,
            isReal: true,
            rawStart: itemStart,
            rawStop: itemEnd,
            category: item.category || 'Général'
          };
        });
      }
    }

    // Default Fallback schedule starting from 1 hour before current time
    const seed = channelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const programs = [];
    let currentGridHour = 0;
    
    const titles = [
      "Journal Télévisé", "Émission Matinale", "Grand Reportage", "Cinéma & Découverte", 
      "Magazine Culturel", "Documentaire Nature", "Le Direct Info", "Soirée Cinéma",
      "Débat en Direct", "Science & Futur", "Évasion & Voyage", "Série Dramatique",
      "Grand Soir Événement", "Comédie Club", "Hit Mix Musique", "Nuit Électro"
    ];

    const descriptions = [
      "L'actualité complète en direct avec nos envoyés spéciaux, reportages exclusifs et analyses détaillées de la rédaction.",
      "Interviews exclusives, chroniques société, météo et revue de presse pour démarrer la journée en direct.",
      "Immersion au cœur des grands événements, enquêtes approfondies et dossiers du monde contemporain.",
      "Une sélection des plus grands classiques du 7ème art et des films primés à découvrir en haute définition.",
      "Découvertes culturelles, gastronomie, patrimoine et secrets des plus grands artistes contemporains.",
      "Exploration des plus beaux sanctuaires de la vie sauvage et immersion au cœur de la faune et de la flore.",
      "Le point complet sur l'actualité politique, économique, technologique et internationale en direct continu."
    ];

    while (currentGridHour < 24) {
      const progIndex = (seed + programs.length) % titles.length;
      const duration = 1 + ((seed + programs.length * 3) % 3) * 0.5; // 1h, 1.5h, 2h
      const actualDuration = Math.min(duration, 24 - currentGridHour);
      
      const startMs = gridStartMs + currentGridHour * 3600000;
      const stopMs = startMs + actualDuration * 3600000;
      const progDesc = descriptions[progIndex % descriptions.length];

      programs.push({
        title: titles[progIndex],
        desc: progDesc,
        description: progDesc,
        start: currentGridHour,
        duration: actualDuration,
        isReal: false,
        rawStart: startMs,
        rawStop: stopMs,
        category: progIndex % 2 === 0 ? "Information" : "Divertissement"
      });
      currentGridHour += actualDuration;
    }

    return programs;
  }, [currentTime, currentHour, realEpgData]);

  // Global Keyboard Navigation strictly isolated per activePane
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // When in fullscreen mode, or when the main menu / modal is open, do not handle keys here
      if (isFullscreen || isMenuOpen || isProgramModalOpen) return;

      // Ignore when typing inside input fields or textareas
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // When quick context menu is open, handle close on Escape/Backspace
      if (quickMenuTarget) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setQuickMenuTarget(null);
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (onOpenMenu) onOpenMenu();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setActivePane(prev => prev === 'categories' ? 'channels' : 'categories');
      } else if (e.key === 'r' || e.key === 'R') {
        // Quick shortcut to open mini menu for focused program
        if (activePane === 'channels' && focusedChannel) {
          e.preventDefault();
          const prog = focusedProgram || getChannelSchedule(focusedChannel.id)[0];
          if (prog) {
            setQuickMenuTarget({ program: prog, channel: focusedChannel });
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (activePane === 'categories') {
          e.preventDefault();
          setActivePane('channels');
        } else if (activePane === 'channels' && focusedChannel) {
          // Navigate horizontally to the next program on the timeline
          const schedule = getChannelSchedule(focusedChannel.id);
          if (schedule.length > 0) {
            e.preventDefault();
            const curIdx = focusedProgram ? schedule.findIndex(p => p.title === focusedProgram.title) : -1;
            const nextIdx = curIdx < schedule.length - 1 ? curIdx + 1 : 0;
            updateFocusedChannel(focusedChannel, schedule[nextIdx]);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (activePane === 'channels' && focusedChannel) {
          // Navigate to previous program on timeline, or jump back to categories
          const schedule = getChannelSchedule(focusedChannel.id);
          const curIdx = focusedProgram ? schedule.findIndex(p => p.title === focusedProgram.title) : -1;
          if (curIdx > 0) {
            e.preventDefault();
            updateFocusedChannel(focusedChannel, schedule[curIdx - 1]);
          } else {
            e.preventDefault();
            setActivePane('categories');
          }
        } else if (activePane === 'categories') {
          e.preventDefault();
          if (onOpenMenu) onOpenMenu();
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (activePane === 'channels') {
          e.preventDefault();
          setActivePane('categories');
        } else if (activePane === 'categories') {
          e.preventDefault();
          if (onOpenMenu) onOpenMenu();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activePane === 'categories') {
          // Navigate up through categories ONLY
          if (currentCatIndex > 0) {
            const nextKey = selectableCategoryKeys[currentCatIndex - 1];
            const catVal = nextKey === '__all__' ? null : nextKey;
            try {
              if (catVal) localStorage.setItem('vision_last_epg_category', catVal);
              else localStorage.removeItem('vision_last_epg_category');
            } catch {}
            onSelectCategory(catVal);
            const targetId = `cat-btn-${encodeURIComponent(nextKey)}`;
            const el = document.getElementById(targetId);
            if (el) {
              el.focus();
              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        } else if (activePane === 'channels') {
          // Navigate up through channels ONLY in EPG guide without moving category/playlist cursor
          if (filteredChannels.length === 0) return;
          const currentIdx = filteredChannels.findIndex(c => c.id === focusedChannel?.id);
          const nextIdx = currentIdx > 0 ? currentIdx - 1 : filteredChannels.length - 1;
          const nextChan = filteredChannels[nextIdx];
          updateFocusedChannel(nextChan);
          const el = document.getElementById(`epg-row-${nextChan.id}`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activePane === 'categories') {
          // Navigate down through categories ONLY
          if (currentCatIndex < selectableCategoryKeys.length - 1) {
            const nextKey = selectableCategoryKeys[currentCatIndex + 1];
            const catVal = nextKey === '__all__' ? null : nextKey;
            try {
              if (catVal) localStorage.setItem('vision_last_epg_category', catVal);
              else localStorage.removeItem('vision_last_epg_category');
            } catch {}
            onSelectCategory(catVal);
            const targetId = `cat-btn-${encodeURIComponent(nextKey)}`;
            const el = document.getElementById(targetId);
            if (el) {
              el.focus();
              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        } else if (activePane === 'channels') {
          // Navigate down through channels ONLY in EPG guide without moving category/playlist cursor
          if (filteredChannels.length === 0) return;
          const currentIdx = filteredChannels.findIndex(c => c.id === focusedChannel?.id);
          const nextIdx = currentIdx < filteredChannels.length - 1 ? currentIdx + 1 : 0;
          const nextChan = filteredChannels[nextIdx];
          updateFocusedChannel(nextChan);
          const el = document.getElementById(`epg-row-${nextChan.id}`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        if (activePane === 'categories') {
          e.preventDefault();
          setActivePane('channels');
        } else if (activePane === 'channels' && focusedChannel) {
          e.preventDefault();
          if (!e.repeat && !holdingProgramKey) {
            const prog = focusedProgram || getChannelSchedule(focusedChannel.id)[0];
            if (prog) {
              startHold(prog, focusedChannel);
            }
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (focusedChannel && onToggleFavorite) {
          e.preventDefault();
          onToggleFavorite(focusedChannel.id);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (holdingProgramKey) {
          cancelHold();
          // Short tap on Enter: standard TiviMate channel playback switch
          if (activePane === 'channels' && focusedChannel) {
            if (playingChannel?.id !== focusedChannel.id) {
              updatePlayingChannel(focusedChannel);
            } else {
              handleOpenFullscreen(focusedChannel);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isFullscreen,
    isMenuOpen,
    isProgramModalOpen,
    quickMenuTarget,
    holdingProgramKey,
    activePane,
    currentCatIndex,
    selectableCategoryKeys,
    filteredChannels,
    focusedChannel,
    focusedProgram,
    playingChannel,
    onSelectCategory,
    onWatch,
    onToggleFavorite,
    onOpenMenu,
    startHold,
    cancelHold,
    getChannelSchedule
  ]);

  // When returning from main menu to EPG, ensure focus resumes on channels column
  const prevMenuOpenRef = useRef(isMenuOpen);
  useEffect(() => {
    if (prevMenuOpenRef.current && !isMenuOpen) {
      setActivePane('channels');
    }
    prevMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  // Helper to update focused channel and persist to localStorage
  const updateFocusedChannel = (channel: IPTVChannel, program: any = null) => {
    setFocusedChannel(channel);
    setFocusedProgram(program);
    try {
      localStorage.setItem('vision_last_epg_channel_id', channel.id);
    } catch {}
  };

  // Sync when selectedChannel prop updates from outside (e.g. clicked in another view)
  useEffect(() => {
    if (selectedChannel && filteredChannels.some(c => c.id === selectedChannel.id)) {
      updateFocusedChannel(selectedChannel);
      updatePlayingChannel(selectedChannel);
    }
  }, [selectedChannel?.id]);

  // Preserve focused channel across category/search filtering without defaulting to channel 1
  useEffect(() => {
    if (filteredChannels.length === 0) {
      setFocusedChannel(null);
      setFocusedProgram(null);
      return;
    }

    // 1. If currently focused channel is still in the filtered list, KEEP IT!
    if (focusedChannel && filteredChannels.some(c => c.id === focusedChannel.id)) {
      return;
    }

    // 2. Try selectedChannel prop if in filtered list
    if (selectedChannel && filteredChannels.some(c => c.id === selectedChannel.id)) {
      updateFocusedChannel(selectedChannel);
      return;
    }

    // 3. Try saved channel ID in localStorage (prefer playing channel first)
    const savedId = typeof window !== 'undefined' 
      ? (localStorage.getItem('vision_last_epg_playing_id') || localStorage.getItem('vision_last_epg_channel_id')) 
      : null;
    if (savedId) {
      const found = filteredChannels.find(c => c.id === savedId);
      if (found) {
        updateFocusedChannel(found);
        return;
      }
    }

    // 4. Only if no previous selection exists in filtered list, fallback to 1st
    updateFocusedChannel(filteredChannels[0]);
  }, [filteredChannels]);

  // Auto-scroll vertically to the focused channel row when EPG mounts or changes without altering horizontal scroll
  useEffect(() => {
    if (!focusedChannel || !scrollContainerRef.current) return;

    const timeout = setTimeout(() => {
      const targetEl = document.getElementById(`epg-row-${focusedChannel.id}`);
      const container = scrollContainerRef.current;
      if (targetEl && container) {
        const targetTop = targetEl.offsetTop;
        const targetHeight = targetEl.offsetHeight;
        const containerHeight = container.clientHeight;
        const currentScrollTop = container.scrollTop;

        // Ensure vertical row visibility without affecting scrollLeft
        if (targetTop < currentScrollTop + 50 || targetTop + targetHeight > currentScrollTop + containerHeight) {
          container.scrollTo({
            top: Math.max(0, targetTop - (containerHeight / 2) + (targetHeight / 2)),
            behavior: 'smooth'
          });
          hasInitialScrolledRef.current = true;
        }
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [focusedChannel?.id, isMenuOpen, activePane]);

  // Dynamically ensure displayed channels include the focused channel
  const displayedChannels = useMemo(() => {
    const focusedIdx = filteredChannels.findIndex(c => c.id === focusedChannel?.id);
    const countNeeded = Math.max(visibleCount, focusedIdx >= 0 ? focusedIdx + 30 : 0);
    return filteredChannels.slice(0, Math.min(filteredChannels.length, countNeeded));
  }, [filteredChannels, visibleCount, focusedChannel?.id]);

  // Refresh EPG data handler
  const handleRefreshEpg = async () => {
    setIsRefreshing(true);
    try {
      if (playlist?.epgUrl) {
        const { clearXMLTVCache } = await import('../services/xmltvService');
        clearXMLTVCache();
      }
    } catch (e) {
      console.warn('Failed to clear XMLTV cache:', e);
    }
    setRealEpgData({});
    setLoadingChannels({});
    setRefreshKey(k => k + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  // XMLTV / Xtream loading logic
  useEffect(() => {
    if (!playlist || channels.length === 0) return;

    let active = true;

    if (playlist.epgUrl) {
      const fetchXmltvEpg = async () => {
        try {
          const { XMLTVService } = await import('../services/xmltvService');
          const service = new XMLTVService(playlist.epgUrl!);
          const { programmesByChannel } = await service.loadEPG();
          
          if (!active) return;
          const targetChannels = (filteredChannels.length > 0 ? filteredChannels : channels).slice(0, 100);
          const newEpgData: Record<string, any[]> = {};

          targetChannels.forEach(chan => {
            const progs = XMLTVService.findProgramsForChannel(chan, programmesByChannel);
            if (progs && progs.length > 0) {
              newEpgData[chan.id] = progs.map(p => ({
                title: p.title,
                desc: p.desc,
                startTimestamp: p.startTimestamp,
                endTimestamp: p.endTimestamp,
                category: p.category
              }));
            }
          });

          if (active && Object.keys(newEpgData).length > 0) {
            setRealEpgData(prev => ({ ...prev, ...newEpgData }));
          }
        } catch (err) {
          console.error('Failed to load XMLTV EPG', err);
        }
      };

      fetchXmltvEpg();
    } else if (playlist.type === 'xtream') {
      const fetchXtreamEpg = async () => {
        try {
          const { XtreamService } = await import('../services/xtreamService');
          const service = new XtreamService(playlist);
          
          const targetChannels = (filteredChannels.length > 0 ? filteredChannels : channels).slice(0, 60);
          
          const batchSize = 6;
          for (let i = 0; i < targetChannels.length; i += batchSize) {
            if (!active) break;
            const batch = targetChannels.slice(i, i + batchSize);
            await Promise.all(batch.map(async (chan) => {
              if (realEpgData[chan.id] || loadingChannels[chan.id]) return;
              try {
                setLoadingChannels(prev => ({ ...prev, [chan.id]: true }));
                const listings = await service.getShortEpg(chan.id);
                if (active && listings && listings.length > 0) {
                  setRealEpgData(prev => ({ ...prev, [chan.id]: listings }));
                }
              } catch (err) {
                console.error('Failed to load EPG for channel ' + chan.id, err);
              } finally {
                if (active) {
                  setLoadingChannels(prev => ({ ...prev, [chan.id]: false }));
                }
              }
            }));
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } catch (err) {
          console.error('EPG background fetch error', err);
        }
      };

      fetchXtreamEpg();
    }

    return () => {
      active = false;
    };
  }, [playlist, channels, filteredChannels, refreshKey]);

  // Align the timeline needle exactly right below the end (right border) of the mini player
  // The EPG grid starts 1 hour before current time (at (currentHour - 1):00)
  const jumpToNow = useCallback((smooth: boolean = true) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    if (!containerRect.width || containerRect.width <= 0) return;

    // Measure the exact right edge of the mini player preview section relative to the EPG grid
    let targetX = 460;
    if (miniPlayerSectionRef.current) {
      const miniRect = miniPlayerSectionRef.current.getBoundingClientRect();
      targetX = Math.round(miniRect.right - containerRect.left);
    }

    // Ensure the target is to the right of the sticky channel header (CHANNEL_HEADER_WIDTH)
    const safeTargetX = Math.max(CHANNEL_HEADER_WIDTH + 16, Math.min(targetX, containerRect.width - 60));

    // Timeline starts at (currentHour - 1):00, so live needle is at 1h + currentMinute offset
    const timeOffsetHours = 1 + currentMinute / 60;
    const needleAbsLeft = CHANNEL_HEADER_WIDTH + (timeOffsetHours * 256);

    // Scroll so that needleAbsLeft aligns exactly with safeTargetX (right below the mini player end)
    const scrollPos = Math.max(0, Math.round(needleAbsLeft - safeTargetX));

    container.scrollTo({
      left: scrollPos,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [currentMinute, CHANNEL_HEADER_WIDTH]);

  // Centrage automatique de la frise sous la fin du mini player dès le montage initial
  useEffect(() => {
    jumpToNow(false);
    const r1 = requestAnimationFrame(() => jumpToNow(false));
    const t1 = setTimeout(() => jumpToNow(false), 80);
    const t2 = setTimeout(() => jumpToNow(false), 250);
    const t3 = setTimeout(() => jumpToNow(false), 600);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [jumpToNow]);

  // Recentrage automatique dès que les chaînes ou catégories changent/sont chargées
  useEffect(() => {
    if (displayedChannels.length > 0) {
      jumpToNow(false);
      const t = setTimeout(() => jumpToNow(false), 100);
      return () => clearTimeout(t);
    }
  }, [displayedChannels.length, selectedCategory, jumpToNow]);

  // Maintien automatique de l'alignement sous le mini-player en cas de redimensionnement de l'écran
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    let timer: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        jumpToNow(false);
      }, 60);
    });

    observer.observe(el);
    if (miniPlayerSectionRef.current) {
      observer.observe(miniPlayerSectionRef.current);
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [jumpToNow]);

  // Derive current active program for focused channel (timeline starts at currentHour - 1)
  const activeProgram = useMemo(() => {
    if (!focusedChannel) return null;
    if (focusedProgram && focusedProgram.channelId === focusedChannel.id) {
      return focusedProgram;
    }
    const schedule = getChannelSchedule(focusedChannel.id);
    const timeDecimal = 1 + currentMinute / 60;
    const currentProg = schedule.find(p => timeDecimal >= p.start && timeDecimal < (p.start + p.duration));
    return currentProg ? { ...currentProg, channelId: focusedChannel.id } : (schedule[0] ? { ...schedule[0], channelId: focusedChannel.id } : null);
  }, [focusedChannel, focusedProgram, realEpgData, currentTime]);

  // Compute program progress & duration metadata
  const programMeta = useMemo(() => {
    if (!activeProgram) return null;
    const timeDecimal = 1 + currentMinute / 60;
    const progStart = activeProgram.start;
    const progDuration = activeProgram.duration;
    const progEnd = progStart + progDuration;

    const isCurrentlyOnAir = timeDecimal >= progStart && timeDecimal < progEnd;
    const elapsedRatio = isCurrentlyOnAir ? Math.max(0, Math.min(1, (timeDecimal - progStart) / progDuration)) : 0;
    const remainingMins = isCurrentlyOnAir ? Math.max(1, Math.round((progEnd - timeDecimal) * 60)) : Math.round(progDuration * 60);
    const progressPercent = Math.round(elapsedRatio * 100);

    const formatHour = (dec: number) => {
      const h = ((Math.floor(currentHour - 1 + dec) % 24) + 24) % 24;
      const m = Math.round((dec % 1) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    let timeRangeStr = '';
    if (activeProgram.rawStart && activeProgram.rawStop) {
      const s = new Date(activeProgram.rawStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const e = new Date(activeProgram.rawStop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      timeRangeStr = `${s} — ${e}`;
    } else {
      timeRangeStr = `${formatHour(progStart)} — ${formatHour(progEnd)}`;
    }

    // Determine age / PG classification badge
    let pgRating = 'Tout Public';
    const textToCheck = `${activeProgram.title} ${activeProgram.desc || activeProgram.description || ''} ${activeProgram.category || ''}`.toLowerCase();
    if (textToCheck.includes('18+') || textToCheck.includes('-18') || textToCheck.includes('interdit aux mineurs')) {
      pgRating = '18+';
    } else if (textToCheck.includes('16+') || textToCheck.includes('-16')) {
      pgRating = '16+';
    } else if (textToCheck.includes('12+') || textToCheck.includes('-12')) {
      pgRating = '12+';
    } else if (textToCheck.includes('pg-13') || textToCheck.includes('pg13')) {
      pgRating = 'PG-13';
    } else if (textToCheck.includes('pg') || textToCheck.includes('parental')) {
      pgRating = 'PG';
    }

    return {
      timeRangeStr,
      isCurrentlyOnAir,
      elapsedRatio,
      progressPercent,
      remainingMins,
      remainingMinutes: remainingMins,
      pgRating
    };
  }, [activeProgram, currentTime]);

  // Quality Tag Helper
  const getQualityTag = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('4K') || n.includes('UHD')) return '4K';
    if (n.includes('FHD') || n.includes('1080')) return 'FHD';
    if (n.includes('HD') || n.includes('720')) return 'HD';
    return 'SD';
  };

  // Formatted date string in French / Locale for top timeline
  const formattedLiveDate = useMemo(() => {
    return currentTime.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, [currentTime]);

  const formattedLiveTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, [currentTime]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b11] text-white overflow-hidden select-none">
      
      {/* ========================================================= */}
      {/* TOP ZONE (TiviMate Master Layout: Left Player, Right Info) */}
      {/* ========================================================= */}
      <div className="flex-shrink-0 flex flex-col lg:flex-row border-b border-white/10 bg-[#0b1018] relative z-20 shadow-xl h-[270px] lg:h-[300px]">
        
        {/* TOP LEFT: LIVE VIDEO PLAYER PREVIEW (Starts directly at top-left) */}
        <div 
          ref={miniPlayerSectionRef}
          className="flex-shrink-0 flex items-center justify-center w-full lg:w-[460px] xl:w-[500px] h-full p-4 bg-black/40 border-r border-white/10"
        >
          <div className="w-full h-full max-w-[480px] max-h-[260px] relative">
            <TiviMateMiniPlayer
              channel={playingChannel || focusedChannel}
              streamProxyMode={streamProxyMode}
              userAgentMode={userAgentMode}
              customUserAgent={customUserAgent}
              isActive={true}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => toggleFullscreen()}
              onExitFullscreen={() => toggleFullscreen(false)}
              onPrevChannel={handlePrevChannel}
              onNextChannel={handleNextChannel}
              activeProgram={activeProgram}
              programMeta={programMeta}
              isFavorite={favoriteIds.includes((playingChannel || focusedChannel)?.id || '')}
              onToggleFavorite={() => {
                const ch = playingChannel || focusedChannel;
                if (ch && onToggleFavorite) onToggleFavorite(ch.id);
              }}
              currentTime={currentTime}
              onWatch={() => handleOpenFullscreen()}
            />
          </div>
        </div>

        {/* TOP RIGHT: TV GUIDE DESCRIPTION & PG INFORMATION */}
        <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between overflow-hidden bg-gradient-to-r from-[#0d141f] to-[#080d14]">
          {focusedChannel ? (
            <div className="flex flex-col justify-between h-full space-y-3">
              
              {/* Header Badges & Channel Info */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  {/* Channel Group / Category */}
                  <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
                    {focusedChannel.group || 'Général'}
                  </span>

                  {/* Channel Name */}
                  <span className="text-white/80 font-bold text-sm truncate max-w-[200px]">
                    {focusedChannel.name}
                  </span>

                  {/* Live Player indicator if currently streaming */}
                  {playingChannel?.id === focusedChannel.id && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      <span>En écoute</span>
                    </span>
                  )}

                  {/* PG Badge */}
                  {programMeta && (
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border",
                      programMeta.pgRating === '18+' ? "bg-red-500/20 text-red-400 border-red-500/40" :
                      programMeta.pgRating === '16+' ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                      programMeta.pgRating === '12+' || programMeta.pgRating === 'PG-13' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
                      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    )}>
                      {programMeta.pgRating}
                    </span>
                  )}

                  {/* Resolution Quality Badge */}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white/70 border border-white/10">
                    {getQualityTag(focusedChannel.name)}
                  </span>
                </div>

                {/* Favorite Star Button */}
                <button
                  onClick={() => onToggleFavorite && onToggleFavorite(focusedChannel.id)}
                  className={cn(
                    "p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0",
                    favoriteIds.includes(focusedChannel.id)
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10"
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                  )}
                  title={favoriteIds.includes(focusedChannel.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Star className={cn("w-5 h-5", favoriteIds.includes(focusedChannel.id) && "fill-current text-amber-400")} />
                </button>
              </div>

              {/* Main Program Title */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug truncate">
                  {fixUtf8(activeProgram?.title || focusedChannel.name || 'Aucune information disponible')}
                </h2>

                {/* Schedule & Progress Row */}
                {programMeta && (
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm sm:text-base font-bold">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{programMeta.timeRangeStr}</span>
                    </div>

                    {/* Progress Bar & Remaining time */}
                    {programMeta.isCurrentlyOnAir && (
                      <div className="flex items-center gap-3 flex-1 max-w-xs">
                        <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-[#a4e235] transition-all duration-300 rounded-full"
                            style={{ width: `${programMeta.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/60 font-mono font-medium whitespace-nowrap">
                          {programMeta.remainingMinutes} min restantes
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Program Description */}
              <div className="text-xs sm:text-sm text-white/70 line-clamp-3 leading-relaxed overflow-y-auto max-h-24 custom-scrollbar pr-1">
                {(activeProgram?.desc || activeProgram?.description) ? (
                  <p>{fixUtf8(activeProgram.desc || activeProgram.description)}</p>
                ) : (
                  <span className="italic text-white/40">
                    {focusedChannel ? `Retrouvez en direct la diffusion des programmes et divertissements sur ${focusedChannel.name}.` : "Aucune description détaillée n'est disponible pour ce programme."}
                  </span>
                )}
              </div>

              {/* Actions & Live Button */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {/* Switch preview player to this channel if different */}
                {playingChannel?.id !== focusedChannel.id ? (
                  <button
                    onClick={() => updatePlayingChannel(focusedChannel)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 hover:scale-102 active:scale-98"
                    title="Écouter et afficher cette chaîne dans l'aperçu vidéo"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Écouter dans l'aperçu (Entrée)</span>
                  </button>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>En lecture dans l'aperçu</span>
                  </div>
                )}

                <button
                  onClick={() => handleOpenFullscreen(focusedChannel)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all border border-white/10 hover:scale-102 active:scale-98 cursor-pointer"
                  title="Afficher en plein écran (Entrée x2)"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Grand écran</span>
                </button>

                <div className="text-[11px] text-white/40 font-mono flex items-center gap-2 ml-auto sm:ml-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{formattedLiveTime}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <Tv className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="text-xs">Sélectionnez une chaîne dans la grille ci-dessous</p>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* BOTTOM ZONE: TIVIMATE LAYOUT (Categories + Channels/EPG)   */}
      {/* ========================================================= */}
      <div className={cn("flex-1 flex min-h-0 overflow-hidden relative", isFullscreen && "hidden")}>
        
        {/* COLUMN 1: CATEGORIES / GROUPS COLUMN (Sliding Drawer / Collapsible Column) */}
        <div 
          className={cn(
            "bg-[#080f19] border-r border-white/10 flex flex-col flex-shrink-0 select-none shadow-2xl transition-all duration-300 ease-in-out z-30",
            activePane === 'categories' 
              ? "w-64 lg:w-72 opacity-100 translate-x-0" 
              : "w-0 opacity-0 -translate-x-full overflow-hidden border-none pointer-events-none"
          )}
          onClick={() => setActivePane('categories')}
        >
          {/* Header with Back to Menu & Close Column buttons */}
          <div className="p-2.5 border-b border-white/10 bg-[#060c14] flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => {
                if (onOpenMenu) onOpenMenu();
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="Menu principal (Échap ou Flèche Gauche)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>
            <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider">
              {isFavoritesView ? 'Favoris' : 'Groupes'}
            </span>
            <button
              onClick={() => setActivePane('channels')}
              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Masquer (Flèche Droite)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Categories Search Box */}
          <div className="p-2.5 border-b border-white/10 bg-[#060c14]/80 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Filtrer les groupes..."
                value={sidebarCatSearch}
                onChange={(e) => setSidebarCatSearch(e.target.value)}
                className="w-full bg-[#111a28] text-xs text-white pl-8 pr-7 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-400 placeholder:text-white/30"
              />
              {sidebarCatSearch && (
                <button
                  onClick={() => setSidebarCatSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Unified Category List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            
            {/* IN FAVORITES VIEW: Show 'Toutes les favorites' */}
            {isFavoritesView ? (
              <button
                id="cat-btn-__all__"
                data-tv-focusable="true"
                tabIndex={0}
                onClick={() => {
                  try { localStorage.removeItem('vision_last_epg_category'); } catch {}
                  onSelectCategory(null);
                  setActivePane('channels');
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all outline-none",
                  !selectedCategory || selectedCategory === '__favorites__'
                    ? (activePane === 'categories'
                        ? "bg-rose-900/60 text-rose-300 font-bold border-l-4 border-rose-400 shadow-md ring-2 ring-rose-400/80 scale-[1.01]"
                        : "bg-rose-950/40 text-rose-300 font-bold border-l-2 border-rose-500/50")
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-amber-400 fill-current" />
                  Toutes les favorites
                </span>
                <span className="text-[10px] text-white/40 font-mono">{channels.length}</span>
              </button>
            ) : (
              <>
                {/* FAVORITES BUTTON */}
                <button
                  id="cat-btn-__favorites__"
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => {
                    try { localStorage.setItem('vision_last_epg_category', '__favorites__'); } catch {}
                    onSelectCategory('__favorites__');
                    setActivePane('channels');
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all outline-none",
                    selectedCategory === '__favorites__'
                      ? (activePane === 'categories'
                          ? "bg-[#1f4e82] text-cyan-300 font-bold border-l-4 border-cyan-400 shadow-md ring-2 ring-cyan-400/80 scale-[1.01]"
                          : "bg-[#132235] text-cyan-300 font-bold border-l-2 border-cyan-500/50")
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    Favoris
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">{favoritesCount}</span>
                </button>

                {/* ALL CHANNELS BUTTON */}
                <button
                  id="cat-btn-__all__"
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => {
                    try { localStorage.removeItem('vision_last_epg_category'); } catch {}
                    onSelectCategory(null);
                    setActivePane('channels');
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all outline-none",
                    !selectedCategory
                      ? (activePane === 'categories'
                          ? "bg-[#1f4e82] text-cyan-300 font-bold border-l-4 border-cyan-400 shadow-md ring-2 ring-cyan-400/80 scale-[1.01]"
                          : "bg-[#132235] text-cyan-300 font-bold border-l-2 border-cyan-500/50")
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Tv className="w-3 h-3 text-cyan-400" />
                    Toutes les chaînes
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">{channels.length}</span>
                </button>
              </>
            )}

            {/* DIVIDER */}
            <div className="py-1">
              <div className="h-px bg-white/5 mx-1" />
            </div>

            {/* DYNAMIC CATEGORIES */}
            {filteredSidebarCategories.map(cat => {
              const isCatSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  id={`cat-btn-${encodeURIComponent(cat.name)}`}
                  data-tv-focusable="true"
                  tabIndex={0}
                  onClick={() => {
                    try { localStorage.setItem('vision_last_epg_category', cat.name); } catch {}
                    onSelectCategory(cat.name);
                    setActivePane('channels');
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between group outline-none",
                    isCatSelected
                      ? (activePane === 'categories'
                          ? "bg-[#1f4e82] text-cyan-300 font-bold border-l-4 border-cyan-400 shadow-md ring-2 ring-cyan-400/80 scale-[1.01]"
                          : "bg-[#132235] text-cyan-300 font-bold border-l-2 border-cyan-500/50")
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="truncate pr-1.5">{cat.name}</span>
                  <span className={cn(
                    "text-[10px] font-mono",
                    isCatSelected ? "text-cyan-300/90 font-bold" : "text-white/40 group-hover:text-white/60"
                  )}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: CHANNELS & EPG TIMELINE GRID */}
        <div 
          className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#060a0f]" 
          onClick={() => setActivePane('channels')}
        >

      {/* ========================================================= */}
      {/* BOTTOM ZONE: TIVIMATE TIMELINE & PROGRAM SCHEDULE GRID    */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-[#060a0f]" ref={scrollContainerRef}>
        {channels.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 text-red-400 border border-red-500/20">
              {isFavoritesView ? <Star className="w-8 h-8 text-amber-400 fill-amber-400" /> : <Calendar className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {isFavoritesView ? "Aucune chaîne favorite" : "Aucune chaîne trouvée"}
            </h3>
            <p className="text-xs text-white/40 max-w-sm mb-6">
              {isFavoritesView
                ? "Appuyez sur la touche F ou cliquez sur l'étoile d'une chaîne dans le guide TV pour l'ajouter à vos favoris."
                : "Veuillez ajouter une playlist M3U ou Xtream pour explorer le guide TV."}
            </p>
            {isFavoritesView && onNavigate ? (
              <button
                onClick={() => onNavigate('epg')}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Explorer la TV en direct
              </button>
            ) : onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="px-6 py-2.5 bg-cyan-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20"
              >
                Ajouter une playlist
              </button>
            )}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/20 border border-white/10">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchQuery ? `Aucune chaîne trouvée pour "${searchQuery}"` : "Aucune chaîne dans cette catégorie"}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              {selectedCategory && (
                <button
                  onClick={() => onSelectCategory(null)}
                  className="px-4 py-2 bg-cyan-500 text-black text-xs font-bold rounded-xl"
                >
                  Toutes les catégories
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-xl"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="min-w-[6400px] relative">
            
            {/* TIMELINE TIME RULER HEADER */}
            <div className="flex border-b border-white/10 sticky top-0 bg-[#0b121b] z-30 shadow-md">
              
              {/* Top-Left Date & Live Clock + Categories Quick Toggle Button */}
              <div className="w-72 flex-shrink-0 border-r border-white/10 p-2.5 bg-[#090f18] sticky left-0 z-40 flex items-center justify-between shadow-[4px_0_12px_rgba(0,0,0,0.5)] gap-2">
                <button
                  onClick={() => setActivePane(prev => prev === 'categories' ? 'channels' : 'categories')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-black text-cyan-300 text-xs font-bold transition-all shadow-sm cursor-pointer min-w-0"
                  title="Afficher/Masquer les groupes (Flèche Gauche / Touche C)"
                >
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[100px]">{selectedCategory === '__favorites__' ? 'Favoris' : (selectedCategory || 'Tous les groupes')}</span>
                  <ChevronRight className={cn("w-3 h-3 flex-shrink-0 transition-transform", activePane === 'categories' && "rotate-180")} />
                </button>
                <button
                  onClick={() => jumpToNow(true)}
                  className="flex items-center gap-1 text-white/90 font-mono text-[11px] font-bold bg-white/10 hover:bg-cyan-500 hover:text-black px-2 py-1 rounded-md flex-shrink-0 transition-colors cursor-pointer"
                  title="Recentrer la frise du temps sous la fin du mini player"
                >
                  <Clock className="w-3 h-3 text-cyan-400 group-hover:text-black" />
                  <span>{formattedLiveTime}</span>
                </button>
              </div>

              {/* 24-Hour Time Columns starting 1 hour before current time (30-min intervals) */}
              <div className="flex flex-1">
                {Array.from({ length: 48 }, (_, i) => {
                  const hourOffset = (currentHour - 1) + Math.floor(i / 2);
                  const displayHour = ((hourOffset % 24) + 24) % 24;
                  const min = (i % 2) * 30;
                  const isCurrentSlot = (i === 2 && currentMinute < 30) || (i === 3 && currentMinute >= 30);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-32 flex-shrink-0 px-3 py-3 text-xs font-mono font-bold border-r border-white/5 flex items-center justify-between",
                        isCurrentSlot ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-white/40"
                      )}
                    >
                      <span>{displayHour.toString().padStart(2, '0')}:{min.toString().padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VERTICAL LIVE TIME NEEDLE (Positioned at exact current time, 1 hour from grid start) */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-30 pointer-events-none shadow-[0_0_12px_rgba(34,211,238,0.9)]"
              style={{ left: `${CHANNEL_HEADER_WIDTH + (1 + currentMinute / 60) * 256}px` }}
            >
              {/* Sticky Top Live Badge */}
              <div className="sticky top-0 -ml-8 mt-1 px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-mono font-black rounded-md shadow-lg flex items-center gap-1 pointer-events-auto border border-cyan-300 w-fit z-40 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                <span>{formattedLiveTime}</span>
              </div>
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,1)] border-2 border-black" />
            </div>

            {/* CHANNEL ROWS & PROGRAM PILLS */}
            {displayedChannels.map((channel, channelIndex) => {
              const isChannelFocused = focusedChannel?.id === channel.id;
              const isChannelPlaying = playingChannel?.id === channel.id;
              const schedule = getChannelSchedule(channel.id);

              return (
                <div
                  key={channel.id}
                  id={`epg-row-${channel.id}`}
                  className={cn(
                    "flex border-b border-white/5 transition-colors group h-[76px]",
                    isChannelFocused ? "bg-cyan-950/20" : "hover:bg-white/[0.02]"
                  )}
                >
                  {/* Channel Header (Sticky Left) */}
                  <div
                    onClick={() => {
                      setActivePane('channels');
                      if (focusedChannel?.id === channel.id || playingChannel?.id === channel.id) {
                        // 2nd click on the selected/playing channel: open player in fullscreen
                        handleOpenFullscreen(channel);
                      } else {
                        // 1st click: focus and start playback in preview player
                        updateFocusedChannel(channel, null);
                        updatePlayingChannel(channel);
                      }
                    }}
                    onDoubleClick={() => {
                      handleOpenFullscreen(channel);
                    }}
                    className={cn(
                      "w-72 flex-shrink-0 border-r border-white/10 p-3 flex items-center gap-3 sticky left-0 z-20 cursor-pointer shadow-[4px_0_12px_rgba(0,0,0,0.5)] transition-all",
                      isChannelFocused
                        ? (activePane === 'channels'
                            ? "bg-[#142338] text-white border-l-4 border-cyan-400 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-950/50"
                            : "bg-[#101b2b] text-white border-l-2 border-cyan-500/50")
                        : isChannelPlaying
                        ? "bg-[#0c1824] text-white border-l-2 border-emerald-500"
                        : "bg-[#090f18] text-white/90 hover:bg-[#0f1825]"
                    )}
                    title={
                      isChannelFocused || isChannelPlaying
                        ? `${channel.name} — Cliquez une 2e fois pour ouvrir en plein écran`
                        : `${channel.name} — Cliquez pour sélectionner`
                    }
                  >
                    {/* Active Arrow or Playing Audio Indicator */}
                    <div className="w-3 flex-shrink-0 flex items-center justify-center">
                      {isChannelPlaying ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      ) : isChannelFocused ? (
                        <Play className="w-3 h-3 fill-current text-cyan-400" />
                      ) : (
                        <span className="text-[10px] font-mono text-white/30 font-bold">
                          {channelIndex + 1}
                        </span>
                      )}
                    </div>

                    {/* Logo */}
                    <div className="w-10 h-10 bg-[#141d2a] rounded-lg flex items-center justify-center overflow-hidden border border-white/10 flex-shrink-0 relative">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <Tv className="w-5 h-5 opacity-30" />
                      )}
                      {isChannelPlaying && (
                        <div className="absolute inset-0 bg-emerald-500/20 border border-emerald-500/50 rounded-lg pointer-events-none" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className={cn(
                          "font-bold text-xs sm:text-sm truncate",
                          isChannelFocused ? "text-cyan-300 font-black" : isChannelPlaying ? "text-emerald-300 font-bold" : ""
                        )}>
                          {channel.name}
                        </h4>
                        {favoriteIds.includes(channel.id) && (
                          <Star className="w-3 h-3 text-amber-400 fill-current flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isChannelPlaying ? (
                          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                            En cours de lecture
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40 truncate uppercase tracking-wider">
                            {channel.group || 'Général'}
                          </span>
                        )}
                        <span className="text-[9px] font-mono font-bold px-1 rounded bg-white/10 text-white/60">
                          {getQualityTag(channel.name)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button: Preview switch if not playing, or Fullscreen if already playing */}
                    {!isChannelPlaying && isChannelFocused ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePlayingChannel(channel);
                        }}
                        className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 transition-all flex-shrink-0"
                        title="Écouter dans l'aperçu"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    ) : isChannelFocused || isChannelPlaying ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFullscreen(channel);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 transition-all flex-shrink-0"
                        title="Ouvrir en plein écran (2e clic)"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>

                  {/* Program Cards Grid */}
                  <div className="flex-1 relative">
                    {schedule.map((prog, idx) => {
                      const liveOffset = 1 + currentMinute / 60;
                      const isLive = liveOffset >= prog.start && liveOffset < (prog.start + prog.duration);
                      const widthPx = Math.max(20, prog.duration * 256);
                      const isNarrow = widthPx < 90;
                      const isVeryNarrow = widthPx < 50;
                      const isThisProgFocused = isChannelFocused && focusedProgram?.title === prog.title;

                      const isRecordingScheduled = recordings.some(r => r.programTitle === prog.title && r.channelId === channel.id && r.status !== 'completed');
                      const isRecordingActive = recordings.some(r => r.programTitle === prog.title && r.channelId === channel.id && r.status === 'recording');
                      const hasReminder = reminders.some(r => r.programTitle === prog.title && r.channelId === channel.id);
                      const thisKey = `${channel.id}_${prog.title}_${prog.start}`;
                      const isHoldingThis = holdingProgramKey === thisKey;

                      const formatProgHour = (dec: number) => {
                        const h = ((Math.floor(currentHour - 1 + dec) % 24) + 24) % 24;
                        const m = Math.round((dec % 1) * 60);
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };

                      return (
                        <div
                          key={idx}
                          onPointerDown={(e) => {
                            if (e.button === 0) startHold(prog, channel);
                          }}
                          onPointerUp={cancelHold}
                          onPointerLeave={cancelHold}
                          onPointerCancel={cancelHold}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            cancelHold();
                            setQuickMenuTarget({ program: prog, channel });
                          }}
                          onClick={() => {
                            setActivePane('channels');
                            if (focusedChannel?.id === channel.id && focusedProgram?.title === prog.title) {
                              // 2nd click on focused program: open full screen
                              handleOpenFullscreen(channel);
                            } else {
                              updateFocusedChannel(channel, { ...prog, channelId: channel.id });
                              if (playingChannel?.id !== channel.id) {
                                updatePlayingChannel(channel);
                              }
                            }
                          }}
                          onDoubleClick={() => handleOpenFullscreen(channel)}
                          style={{
                            left: `${prog.start * 256}px`,
                            width: `${widthPx - 4}px`
                          }}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 rounded-xl border text-left transition-all overflow-hidden select-none cursor-pointer flex flex-col justify-center px-3 py-1.5 group/card",
                            isThisProgFocused
                              ? "bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950/50 z-20"
                              : isLive
                              ? "bg-[#132338] hover:bg-[#182c46] border-cyan-500/40 shadow-md shadow-cyan-950/30 z-10"
                              : "bg-[#0e1724] hover:bg-[#152234] border-white/5 hover:border-white/20"
                          )}
                          title={`${prog.title} (Clic long 3s ou clic droit pour menu d'enregistrement / rappel)`}
                        >
                          <div className="w-full min-w-0 overflow-hidden flex flex-col justify-center relative">
                            <div className="flex items-center justify-between gap-1 w-full min-w-0">
                              <h5 className={cn(
                                "font-bold truncate text-left flex-1 min-w-0",
                                isNarrow ? "text-[11px]" : "text-xs sm:text-sm",
                                isThisProgFocused ? "text-cyan-200 font-black" : isLive ? "text-cyan-400 font-extrabold" : "text-white/90"
                              )}>
                                {prog.title}
                              </h5>

                              {/* Status Badges & Quick Action Trigger */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isRecordingActive ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                                    <Radio className="w-2.5 h-2.5" />
                                    REC
                                  </span>
                                ) : isRecordingScheduled ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                                    <Disc className="w-2.5 h-2.5 text-rose-400 animate-spin-slow" />
                                    REC
                                  </span>
                                ) : null}

                                {hasReminder && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                                    <Bell className="w-2.5 h-2.5 text-amber-400 fill-current" />
                                  </span>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelHold();
                                    setQuickMenuTarget({ program: prog, channel });
                                  }}
                                  className="opacity-0 group-hover/card:opacity-100 hover:bg-white/20 p-1 rounded text-white/50 hover:text-white transition-opacity"
                                  title="Options rapides TiviMate"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {!isVeryNarrow && (
                              <p className={cn(
                                "text-[10px] truncate w-full block mt-0.5 font-mono text-left",
                                isThisProgFocused ? "text-cyan-300/90" : isLive ? "text-cyan-300/80" : "text-white/40"
                              )}>
                                {isLive && <span className="font-bold text-cyan-400 mr-1">Direct •</span>}
                                {prog.isReal && prog.rawStart && prog.rawStop ? (
                                  `${new Date(prog.rawStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(prog.rawStop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                                ) : (
                                  `${formatProgHour(prog.start)} - ${formatProgHour(prog.start + prog.duration)}`
                                )}
                              </p>
                            )}
                          </div>

                          {/* Holding Progress Overlay (deliberate 3-second hold) */}
                          {isHoldingThis && (
                            <div className="absolute inset-0 bg-[#0b1320]/95 backdrop-blur-sm flex flex-col items-center justify-center p-2 z-30 pointer-events-none rounded-xl border border-cyan-400 shadow-xl">
                              <div className="w-full flex items-center justify-between text-[9px] font-black text-cyan-300 mb-1">
                                <span className="flex items-center gap-1">
                                  <Disc className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
                                  Menu TiviMate...
                                </span>
                                <span className="font-mono">{Math.round(holdingProgress)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-cyan-500/40">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all duration-75"
                                  style={{ width: `${holdingProgress}%` }}
                                />
                              </div>
                              <span className="text-[8px] text-white/60 mt-0.5">Maintenez 3 sec...</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Load more button if there are remaining channels */}
            {displayedChannels.length < filteredChannels.length && (
              <div className="p-4 flex items-center justify-center sticky left-0 w-72 z-20 bg-[#090f18] border-r border-white/10">
                <button
                  onClick={() => setVisibleCount(c => c + 100)}
                  className="px-4 py-2 bg-white/10 hover:bg-cyan-500 hover:text-black text-white text-xs font-bold rounded-xl transition-all"
                >
                  Charger plus de chaînes (+{Math.min(100, filteredChannels.length - displayedChannels.length)})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* TIVIMATE MINI MENU MODAL (Rappel, Enregistrer, Annuler)   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {quickMenuTarget && (
          <div 
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setQuickMenuTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-[#0b1320] border-2 border-cyan-500/40 rounded-3xl shadow-2xl p-6 overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with Channel Logo, Name & Program Title */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {quickMenuTarget.channel.logo ? (
                      <img src={quickMenuTarget.channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Tv className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block truncate">
                      {quickMenuTarget.channel.name}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white line-clamp-1">
                      {fixUtf8(quickMenuTarget.program.title)}
                    </h3>
                    <span className="text-xs text-white/50 font-mono">
                      {quickMenuTarget.program.isReal && quickMenuTarget.program.rawStart && quickMenuTarget.program.rawStop
                        ? `${new Date(quickMenuTarget.program.rawStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(quickMenuTarget.program.rawStop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                        : "Diffusion au programme"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setQuickMenuTarget(null)}
                  className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* The 3 Core Options as requested */}
              <div className="py-4 space-y-2.5">
                {(() => {
                  const targetProg = quickMenuTarget.program;
                  const targetChan = quickMenuTarget.channel;
                  const isScheduledRec = recordings.some(r => r.programTitle === targetProg.title && r.channelId === targetChan.id && r.status !== 'completed');
                  const isLiveRec = recordings.some(r => r.programTitle === targetProg.title && r.channelId === targetChan.id && r.status === 'recording');
                  const hasRem = reminders.some(r => r.programTitle === targetProg.title && r.channelId === targetChan.id);

                  const { startTs, stopTs } = getProgramTimestamps(targetProg);
                  const isCurrentlyLive = Date.now() >= startTs && Date.now() < stopTs;

                  return (
                    <>
                      {/* OPTION 1: RAPPEL (5 min avant) */}
                      <button
                        onClick={() => {
                          if (hasRem) {
                            const existingRem = reminders.find(r => r.programTitle === targetProg.title && r.channelId === targetChan.id);
                            if (existingRem) onDeleteReminder?.(existingRem.id);
                          } else {
                            onAddReminder?.({
                              programTitle: targetProg.title,
                              channelId: targetChan.id,
                              channelName: targetChan.name,
                              channelLogo: targetChan.logo,
                              startTs,
                              stopTs,
                              remindMinutesBefore: 5,
                              remindAtTs: startTs - 5 * 60 * 1000
                            });
                          }
                          setQuickMenuTarget(null);
                        }}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group outline-none",
                          hasRem 
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30" 
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            hasRem ? "bg-amber-500/25 text-amber-400" : "bg-white/10 text-amber-400 group-hover:scale-105"
                          )}>
                            <Bell className={cn("w-5 h-5", hasRem && "fill-current animate-bounce")} />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold flex items-center gap-2">
                              <span>{hasRem ? "Rappel activé" : "Définir un rappel"}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                                5 min avant
                              </span>
                            </div>
                            <div className="text-xs text-white/50 mt-0.5">
                              {hasRem 
                                ? "Vous recevrez une alerte 5 minutes avant le début"
                                : "Notification automatique 5 min avant le début de l'émission"}
                            </div>
                          </div>
                        </div>
                        {hasRem ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        ) : (
                          <span className="text-xs font-bold text-amber-400/80 group-hover:text-amber-300 flex-shrink-0">
                            Activer
                          </span>
                        )}
                      </button>

                      {/* OPTION 2: ENREGISTRER (automatique) */}
                      <button
                        onClick={() => {
                          if (isScheduledRec || isLiveRec) {
                            const existingRec = recordings.find(r => r.programTitle === targetProg.title && r.channelId === targetChan.id && r.status !== 'completed');
                            if (existingRec) onDeleteRecording?.(existingRec.id);
                          } else {
                            const duration = Math.max(15, Math.round((stopTs - startTs) / (60 * 1000)));
                            onAddRecording?.({
                              programTitle: targetProg.title,
                              channelId: targetChan.id,
                              channelName: targetChan.name,
                              channelLogo: targetChan.logo,
                              streamUrl: targetChan.url,
                              startTime: startTs,
                              endTime: stopTs,
                              status: isCurrentlyLive ? 'recording' : 'scheduled',
                              recordedDurationMinutes: duration,
                              fileSize: `${((duration * 25) / 1024).toFixed(1)} Go`,
                              description: targetProg.desc || targetProg.description,
                              category: targetChan.group
                            });
                          }
                          setQuickMenuTarget(null);
                        }}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group outline-none",
                          (isScheduledRec || isLiveRec)
                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30"
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            (isScheduledRec || isLiveRec) ? "bg-rose-500/30 text-rose-400" : "bg-white/10 text-rose-400 group-hover:scale-105"
                          )}>
                            <Disc className={cn("w-5 h-5", (isScheduledRec || isLiveRec) && "animate-spin-slow")} />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold flex items-center gap-2">
                              <span>
                                {isLiveRec 
                                  ? "Enregistrement en direct en cours" 
                                  : isScheduledRec 
                                  ? "Enregistrement programmé" 
                                  : isCurrentlyLive 
                                  ? "Enregistrer le direct maintenant" 
                                  : "Programmer l'enregistrement"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">
                                Auto
                              </span>
                            </div>
                            <div className="text-xs text-white/50 mt-0.5">
                              {isCurrentlyLive 
                                ? "Enregistre immédiatement le flux en direct" 
                                : "S'enregistrera automatiquement à l'heure exacte de diffusion"}
                            </div>
                          </div>
                        </div>
                        {(isScheduledRec || isLiveRec) ? (
                          <CheckCircle2 className="w-5 h-5 text-rose-400 flex-shrink-0" />
                        ) : (
                          <span className="text-xs font-bold text-rose-400/80 group-hover:text-rose-300 flex-shrink-0">
                            Programmer
                          </span>
                        )}
                      </button>

                      {/* OPTION 3: CANCELLER L'ENREGISTREMENT OU LE RAPPEL */}
                      <button
                        onClick={() => {
                          const existingRec = recordings.find(r => r.programTitle === targetProg.title && r.channelId === targetChan.id && r.status !== 'completed');
                          if (existingRec) onDeleteRecording?.(existingRec.id);
                          const existingRem = reminders.find(r => r.programTitle === targetProg.title && r.channelId === targetChan.id);
                          if (existingRem) onDeleteReminder?.(existingRem.id);
                          setQuickMenuTarget(null);
                        }}
                        disabled={!hasRem && !isScheduledRec && !isLiveRec}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between outline-none",
                          (hasRem || isScheduledRec || isLiveRec)
                            ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300 cursor-pointer group"
                            : "opacity-35 border-white/5 text-white/30 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            (hasRem || isScheduledRec || isLiveRec) ? "bg-red-500/20 text-red-400 group-hover:scale-105" : "bg-white/5 text-white/20"
                          )}>
                            <Trash2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-red-300">
                              Canceller l'enregistrement ou le rappel
                            </div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {(hasRem && (isScheduledRec || isLiveRec))
                                ? "Annule le rappel et la programmation de l'enregistrement"
                                : (isScheduledRec || isLiveRec)
                                ? "Annule la programmation de l'enregistrement"
                                : hasRem
                                ? "Annule le rappel programmé"
                                : "Aucun rappel ou enregistrement actif"}
                            </div>
                          </div>
                        </div>
                        {(hasRem || isScheduledRec || isLiveRec) && (
                          <span className="text-xs font-bold text-red-400 flex-shrink-0">
                            Canceller
                          </span>
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Extra actions: Regarder / Détails */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                <button
                  onClick={() => {
                    updateFocusedChannel(quickMenuTarget.channel, quickMenuTarget.program);
                    updatePlayingChannel(quickMenuTarget.channel);
                    setQuickMenuTarget(null);
                  }}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Regarder la chaîne</span>
                </button>
                <button
                  onClick={() => {
                    onSelectProgram(quickMenuTarget.program, quickMenuTarget.channel);
                    setQuickMenuTarget(null);
                  }}
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  <span>Détails</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EPGGridView;
