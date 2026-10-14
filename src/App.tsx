import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  Settings, 
  Plus, 
  Search, 
  ChevronRight,
  Play,
  Info,
  List,
  LayoutGrid,
  Heart,
  History,
  AlertCircle,
  Loader2,
  Filter,
  ExternalLink,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  SkipBack,
  SkipForward,
  Pause,
  RotateCw,
  FastForward,
  Rewind,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Check,
  Globe,
  Radio,
  Upload,
  HardDrive,
  FileCode,
  FileText,
  FileUp,
  FolderArchive,
  RefreshCw,
  Copy,
  Menu,
  Folder,
  Download,
  Smartphone,
  Monitor,
  Laptop,
  HelpCircle,
  Share2,
  Layers,
  Volume2,
  VolumeX,
  Disc,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { IPTVChannel, IPTVPlaylist, ViewMode, UserAgentMode, StreamProxyMode, PlayerChoice, RecordingItem, ProgramReminder } from './types/iptv';
import { parseM3U, extractEpgUrlFromM3U, extractGlobalUserAgentFromM3U } from './utils/m3uParser';
import { fixUtf8 } from './utils/utf8';
import { getLocalFile, saveLocalFile, deleteLocalFile } from './utils/localFileStore';
import { fetchTmdbMovieInfo, TmdbMovieInfo } from './services/tmdbService';
import { 
  SUPPORTED_EXTERNAL_PLAYERS, 
  ExternalPlayerId, 
  launchExternalPlayer, 
  downloadM3uFile, 
  getExternalPlayerUri 
} from './utils/externalPlayer';
import MovieHoverCard from './components/MovieHoverCard';
import { VodHeroHeader } from './components/VodHeroHeader';
import { FullscreenMovieHero } from './components/FullscreenMovieHero';
import { useTVRemoteNavigation } from './hooks/useTVRemoteNavigation';
import { TVRemoteBar } from './components/TVRemoteBar';
import { Language, translations, getInitialLanguage, SUPPORTED_LANGUAGES } from './utils/i18n';
import { LanguageSelector } from './components/LanguageSelector';
import EPGGridView from './components/TiviMateEPG';
import { RecordingsView } from './components/RecordingsView';
import { VisionLogo } from './components/VisionLogo';
import { PWAInstallButton } from './components/PWAInstallButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface UserAgentPresetOption {
  id: UserAgentMode;
  name: string;
  description: string;
  value: string;
  badge: string;
}

export const USER_AGENT_PRESETS: UserAgentPresetOption[] = [
  {
    id: 'auto',
    name: 'Automatique',
    description: 'Priorité aux directives du fichier M3U (#EXTVLCOPT / user-agent), sinon émulation Chrome.',
    value: '',
    badge: 'M3U / Hybride'
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    description: 'Émule un navigateur Web standard pour tromper les protections anti-scripts des serveurs IPTV.',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    badge: 'Windows'
  },
  {
    id: 'safari',
    name: 'Apple Safari',
    description: 'Profil optimisé pour les flux Apple HLS natifs et serveurs orientés macOS / iOS.',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    badge: 'macOS / iOS'
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    description: 'Profil de navigation Mozilla Firefox pour les flux nécessitant un agent alternatif.',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    badge: 'Navigateur'
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    description: 'Identifiant VLC officiel, largement accepté par tous les serveurs et panels IPTV.',
    value: 'VLC/3.0.20 LibVLC/3.0.20',
    badge: 'Lecteur IPTV'
  },
  {
    id: 'tivimate',
    name: 'TiviMate TV',
    description: 'Identifiant du lecteur IPTV pour boîtiers TV Android et Smart TV.',
    value: 'TiviMate/4.7.0 (Android TV; Linux)',
    badge: 'Android TV'
  },
  {
    id: 'smarters',
    name: 'IPTV Smarters Pro',
    description: 'Identifiant officiel de l\'application IPTV Smarters Pro.',
    value: 'IPTVSmarters/3.1.5.1 (Android; Mobile)',
    badge: 'Application'
  },
  {
    id: 'custom',
    name: 'Personnalisé',
    description: 'Définissez votre propre chaîne User-Agent sur mesure requise par votre fournisseur.',
    value: '',
    badge: 'Sur mesure'
  }
];

export function getEffectiveUserAgent(
  mode: UserAgentMode,
  customUa?: string,
  channel?: IPTVChannel,
  playlist?: IPTVPlaylist | null
): string {
  if (mode === 'custom' && customUa && customUa.trim()) {
    return customUa.trim();
  }
  if (mode !== 'auto') {
    const preset = USER_AGENT_PRESETS.find(p => p.id === mode);
    if (preset && preset.value) return preset.value;
  }
  // Mode auto : priorité aux directives M3U (Option 2 par défaut)
  if (channel?.userAgent && channel.userAgent.trim()) {
    return channel.userAgent.trim();
  }
  if (playlist?.userAgent && playlist.userAgent.trim()) {
    return playlist.userAgent.trim();
  }
  return DEFAULT_BROWSER_USER_AGENT;
}

export default function App() {
  const [view, setView] = useState<ViewMode>('setup');
  const [playlists, setPlaylists] = useState<IPTVPlaylist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<IPTVPlaylist | null>(null);
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupsByView, setSelectedGroupsByView] = useState<Record<string, string | null>>(() => {
    try {
      const saved = localStorage.getItem('vision_selected_groups_by_view');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const groupKey = activePlaylist?.id ? `${activePlaylist.id}_${view}` : view;
  const selectedGroup = selectedGroupsByView[groupKey] ?? selectedGroupsByView[view] ?? (
    view === 'epg' && typeof window !== 'undefined' ? (localStorage.getItem('vision_last_epg_category') || null) : null
  );

  const handleSelectGroup = (group: string | null, targetView: ViewMode = view) => {
    const targetKey = activePlaylist?.id ? `${activePlaylist.id}_${targetView}` : targetView;
    if (targetView === 'epg') {
      try {
        if (group) {
          localStorage.setItem('vision_last_epg_category', group);
        } else {
          localStorage.removeItem('vision_last_epg_category');
        }
      } catch {}
    }
    setSelectedGroupsByView(prev => {
      const updated = {
        ...prev,
        [targetKey]: group,
        [targetView]: group
      };
      try {
        localStorage.setItem('vision_selected_groups_by_view', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const [selectedEPGProgram, setSelectedEPGProgram] = useState<any | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>(() => {
    try {
      const saved = localStorage.getItem('vision_recordings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const now = Date.now();
    return [
      {
        id: 'rec-1',
        programTitle: 'Le Journal de 20 Heures',
        channelId: 'tf1-hd',
        channelName: 'TF1 HD',
        startTime: now - 3600 * 1000 * 2,
        endTime: now - 3600 * 1000,
        status: 'completed',
        recordedDurationMinutes: 45,
        fileSize: '1.4 Go',
        description: 'Édition complète du journal télévisé : actualités nationales et internationales, météo et reportages.',
        category: 'Information',
        createdAt: now - 3600 * 1000 * 2
      },
      {
        id: 'rec-2',
        programTitle: 'Grand Match en Direct - Ligue des Champions',
        channelId: 'canal-sport',
        channelName: 'Canal+ Sport',
        startTime: now - 15 * 60 * 1000,
        endTime: now + 75 * 60 * 1000,
        status: 'recording',
        recordedDurationMinutes: 90,
        fileSize: '2.8 Go',
        description: 'Affiche choc en direct avec commentaires d\'experts, multiplex et analyses tactiques.',
        category: 'Sport',
        createdAt: now - 15 * 60 * 1000
      },
      {
        id: 'rec-3',
        programTitle: 'Planète Bleue : Les Trésors des Océans',
        channelId: 'natgeo',
        channelName: 'National Geographic',
        startTime: now + 4 * 3600 * 1000,
        endTime: now + 5 * 3600 * 1000 + 30 * 60 * 1000,
        status: 'scheduled',
        recordedDurationMinutes: 90,
        fileSize: '2.5 Go',
        description: 'Plongez au cœur des récifs coralliens et des abysses inexplorés avec des images 4K exceptionnelles.',
        category: 'Documentaire',
        createdAt: now
      }
    ];
  });

  // Save recordings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vision_recordings', JSON.stringify(recordings));
    } catch (e) {
      console.error(e);
    }
  }, [recordings]);

  // Periodic ticker to automatically transition scheduled -> recording -> completed
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRecordings(prev => {
        let hasChanges = false;
        const updated = prev.map(rec => {
          if (rec.status === 'scheduled' && now >= rec.startTime && now < rec.endTime) {
            hasChanges = true;
            return { ...rec, status: 'recording' as const };
          }
          if (rec.status === 'recording' && now >= rec.endTime) {
            hasChanges = true;
            return { ...rec, status: 'completed' as const };
          }
          return rec;
        });
        return hasChanges ? updated : prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddRecording = (data: Omit<RecordingItem, 'id' | 'createdAt'>) => {
    const newRec: RecordingItem = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now()
    };
    setRecordings(prev => [newRec, ...prev]);
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  const handleStopRecording = (id: string) => {
    setRecordings(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'completed' as const,
          endTime: Date.now()
        };
      }
      return r;
    }));
  };

  const handlePlayRecording = (rec: RecordingItem) => {
    const matchedChannel = channels.find(c => c.id === rec.channelId) || {
      id: rec.channelId,
      name: `${rec.programTitle} (${rec.channelName})`,
      url: rec.streamUrl || '',
      logo: rec.channelLogo,
      group: rec.category || 'Enregistrements'
    };
    handleSelectChannel(matchedChannel);
  };

  const [reminders, setReminders] = useState<ProgramReminder[]>(() => {
    try {
      const saved = localStorage.getItem('vision_reminders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [activeReminderAlert, setActiveReminderAlert] = useState<ProgramReminder | null>(null);

  // Save reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vision_reminders', JSON.stringify(reminders));
    } catch (e) {
      console.error(e);
    }
  }, [reminders]);

  // Check reminders every 5 seconds (notifies 5 min before start)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setReminders(prev => {
        let hasChanges = false;
        const updated = prev.map(rem => {
          if (!rem.notified && now >= rem.remindAtTs) {
            hasChanges = true;
            setActiveReminderAlert(rem);
            return { ...rem, notified: true };
          }
          return rem;
        });
        return hasChanges ? updated : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddReminder = (data: Omit<ProgramReminder, 'id' | 'createdAt'>) => {
    const newRem: ProgramReminder = {
      ...data,
      id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now()
    };
    setReminders(prev => [newRem, ...prev.filter(r => !(r.programTitle === data.programTitle && r.channelId === data.channelId))]);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };
  const [lastChannel, setLastChannel] = useState<IPTVChannel | null>(null);
  const [focusedVodChannel, setFocusedVodChannel] = useState<IPTVChannel | null>(null);
  const [fullscreenVodMovie, setFullscreenVodMovie] = useState<IPTVChannel | null>(null);
  const [isEpgFullscreen, setIsEpgFullscreen] = useState(false);

  const [playlistType, setPlaylistType] = useState<'m3u' | 'xtream' | 'stalker'>('m3u');
  const [playerChoice, setPlayerChoice] = useState<PlayerChoice>(() => {
    const savedChoice = localStorage.getItem('vision_player_choice');
    if (savedChoice === 'vlc' || savedChoice === 'exoplayer' || savedChoice === 'mxplayer' || savedChoice === 'potplayer' || savedChoice === 'iina' || savedChoice === 'mpv' || savedChoice === 'nplayer') {
      return savedChoice as PlayerChoice;
    }
    return 'internal';
  });
  const playerType: 'internal' | 'external' = playerChoice === 'internal' ? 'internal' : 'external';
  const [externalLaunchToast, setExternalLaunchToast] = useState<{ name: string; player: string } | null>(null);

  // User-Agent & Stream Proxy settings (Option 2 active by default, Option 1 configurable)
  const [userAgentMode, setUserAgentMode] = useState<UserAgentMode>(() => {
    return (localStorage.getItem('vision_user_agent_mode') as UserAgentMode) || 'auto';
  });
  const [customUserAgent, setCustomUserAgent] = useState<string>(() => {
    return localStorage.getItem('vision_custom_user_agent') || '';
  });
  const [streamProxyMode, setStreamProxyMode] = useState<StreamProxyMode>(() => {
    return (localStorage.getItem('vision_stream_proxy_mode') as StreamProxyMode) || 'auto';
  });

  // Multilingual i18n localization (6 strategic global IPTV languages)
  const [currentLang, setCurrentLang] = useState<Language>(() => getInitialLanguage());

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('vision_language', lang);
    const langOpt = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    if (langOpt) {
      document.documentElement.dir = langOpt.dir;
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    const langOpt = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);
    if (langOpt) {
      document.documentElement.dir = langOpt.dir;
      document.documentElement.lang = currentLang;
    }
  }, [currentLang]);

  useEffect(() => {
    if (view !== 'epg') {
      setIsEpgFullscreen(false);
    }
  }, [view]);

  const t = translations[currentLang] || translations.fr;

  const handleUserAgentModeChange = (mode: UserAgentMode) => {
    setUserAgentMode(mode);
    localStorage.setItem('vision_user_agent_mode', mode);
  };

  const handleCustomUserAgentChange = (ua: string) => {
    setCustomUserAgent(ua);
    localStorage.setItem('vision_custom_user_agent', ua);
  };

  const handleStreamProxyModeChange = (mode: StreamProxyMode) => {
    setStreamProxyMode(mode);
    localStorage.setItem('vision_stream_proxy_mode', mode);
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedChoice = localStorage.getItem('vision_player_choice');
    if (savedChoice === 'vlc' || savedChoice === 'exoplayer' || savedChoice === 'mxplayer' || savedChoice === 'potplayer' || savedChoice === 'iina' || savedChoice === 'mpv' || savedChoice === 'nplayer') {
      setPlayerChoice(savedChoice as PlayerChoice);
    } else {
      setPlayerChoice('internal');
    }
    
    const savedFavorites = localStorage.getItem('vision_favorites');
    if (savedFavorites) {
      setFavoriteIds(JSON.parse(savedFavorites));
    }

    const savedRecent = localStorage.getItem('vision_recent');
    if (savedRecent) {
      setRecentIds(JSON.parse(savedRecent));
    }
  }, []);

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(fid => fid !== id) 
        : [...prev, id];
      localStorage.setItem('vision_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const addToRecent = (id: string) => {
    setRecentIds(prev => {
      const updated = [id, ...prev.filter(rid => rid !== id)].slice(0, 50);
      localStorage.setItem('vision_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromRecent = (id: string) => {
    setRecentIds(prev => {
      const updated = prev.filter(rid => rid !== id);
      localStorage.setItem('vision_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentIds([]);
    localStorage.removeItem('vision_recent');
  };

  const handleSelectChannel = (channel: IPTVChannel) => {
    if (selectedChannel && (selectedChannel.id !== channel.id || selectedChannel.url !== channel.url)) {
      setLastChannel(selectedChannel);
    }
    addToRecent(channel.id);

    // If an external player is configured in Settings (VLC, ExoPlayer, etc.), launch it directly
    if (playerChoice && playerChoice !== 'internal') {
      const effectiveUa = getEffectiveUserAgent(userAgentMode, customUserAgent, channel, activePlaylist);
      launchExternalPlayer(playerChoice as ExternalPlayerId, channel.url, {
        title: channel.name,
        userAgent: effectiveUa,
        httpReferrer: channel.httpReferrer
      });
      const pInfo = SUPPORTED_EXTERNAL_PLAYERS.find(p => p.id === playerChoice);
      const playerName = pInfo ? pInfo.name : 'Lecteur externe';
      setExternalLaunchToast({ name: channel.name, player: playerName });
      setTimeout(() => setExternalLaunchToast(null), 4000);
      return;
    }

    // Default: Lecteur Web Intégré (opens immediately without any prompt)
    setSelectedChannel(channel);
  };

  const handlePlayerChoiceChange = (choice: PlayerChoice) => {
    setPlayerChoice(choice);
    localStorage.setItem('vision_player_choice', choice);
    localStorage.setItem('vision_player_type', choice === 'internal' ? 'internal' : 'external');
  };

  const handlePlayerTypeChange = (type: 'internal' | 'external') => {
    if (type === 'internal') {
      handlePlayerChoiceChange('internal');
    } else {
      handlePlayerChoiceChange('vlc');
    }
  };

  // Load playlists and remembered active playlist selection from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vision_playlists');
    const savedActiveId = localStorage.getItem('vision_active_playlist_id');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPlaylists(parsed);
      if (parsed.length > 0) {
        setView('epg');
        const targetPlaylist = (savedActiveId && parsed.find((p: any) => p.id === savedActiveId)) || parsed[0];
        loadPlaylist(targetPlaylist);
      }
    }
  }, []);

  const [movies, setMovies] = useState<IPTVChannel[]>([]);
  const [series, setSeries] = useState<IPTVChannel[]>([]);
  const [visibleCount, setVisibleCount] = useState(100);

  const [showCategoriesSidebar, setShowCategoriesSidebar] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Reset visibleCount when view, search, group or playlist changes
  useEffect(() => {
    setVisibleCount(100);
  }, [view, searchQuery, selectedGroup, activePlaylist]);

  const loadPlaylist = async (playlist: IPTVPlaylist) => {
    setIsLoading(true);
    // Remember chosen active playlist across reloads
    if (playlist?.id) {
      localStorage.setItem('vision_active_playlist_id', playlist.id);
    }
    try {
      if (playlist.type === 'm3u') {
        let text = '';
        const effectiveUa = getEffectiveUserAgent(userAgentMode, customUserAgent, undefined, playlist);

        if (playlist.isLocal || playlist.url?.startsWith('local://')) {
          const localKey = playlist.url?.startsWith('local://') 
            ? playlist.url.replace('local://', '') 
            : `m3u_${playlist.id}`;
          const localContent = await getLocalFile(localKey);
          text = localContent || '';
          if (!text && playlist.id) {
            // fallback attempt with `m3u_${id}`
            const fallbackContent = await getLocalFile(`m3u_${playlist.id}`);
            if (fallbackContent) text = fallbackContent;
          }
        } else {
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(playlist.url)}&ua=${encodeURIComponent(effectiveUa)}`;
          const response = await fetch(proxyUrl);
          text = await response.text();
        }

        const parsedChannels = parseM3U(text);

        // Auto-extract EPG and User-Agent from M3U header ONLY if NOT explicitly customized or set
        const headerEpg = extractEpgUrlFromM3U(text);
        const headerUa = extractGlobalUserAgentFromM3U(text);
        let activePl = playlist;
        let shouldUpdateStorage = false;

        if (!playlist.isEpgCustomized && !playlist.epgUrl && headerEpg) {
          activePl = { ...activePl, epgUrl: headerEpg };
          shouldUpdateStorage = true;
        }
        if (!playlist.userAgent && headerUa) {
          activePl = { ...activePl, userAgent: headerUa };
          shouldUpdateStorage = true;
        }

        if (shouldUpdateStorage) {
          setPlaylists(prev => {
            const updated = prev.map(p => p.id === playlist.id ? activePl : p);
            localStorage.setItem('vision_playlists', JSON.stringify(updated));
            return updated;
          });
        }

        setChannels(parsedChannels);
        setMovies([]);
        setSeries([]);
        setActivePlaylist(activePl);
      } else if (playlist.type === 'xtream') {
        const { XtreamService } = await import('./services/xtreamService');
        const xtream = new XtreamService(playlist);
        const [live, vod] = await Promise.all([
          xtream.getLiveChannels(),
          xtream.getMovies()
        ]);
        setChannels(live);
        setMovies(vod);
        setSeries([]);
        setActivePlaylist(playlist);
      }
    } catch (error) {
      console.error('Failed to load playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentContent = useMemo(() => {
    if (view === 'live') return channels;
    if (view === 'vod') return movies;
    if (view === 'series') return series;
    if (view === 'favorites') {
      const allContent = [...channels, ...movies, ...series];
      return allContent.filter(c => favoriteIds.includes(c.id));
    }
    if (view === 'recent') {
      const allContent = [...channels, ...movies, ...series];
      // Map back to the order in recentIds
      return recentIds
        .map(id => allContent.find(c => c.id === id))
        .filter((c): c is IPTVChannel => !!c);
    }
    return [];
  }, [view, channels, movies, series, favoriteIds, recentIds]);

  const groups = useMemo(() => {
    const g = new Set<string>();
    currentContent.forEach(c => {
      const groupName = c.group?.trim();
      if (groupName) {
        g.add(groupName);
      }
    });
    return Array.from(g).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [currentContent]);

  const [favoritesTab, setFavoritesTab] = useState<'epg' | 'vod'>('epg');

  const favoritesCount = useMemo(() => {
    return channels.filter(ch => favoriteIds.includes(ch.id)).length;
  }, [channels, favoriteIds]);

  const favoriteChannels = useMemo(() => {
    return channels.filter(ch => favoriteIds.includes(ch.id));
  }, [channels, favoriteIds]);

  const favoriteVodContent = useMemo(() => {
    return [...movies, ...series].filter(ch => favoriteIds.includes(ch.id));
  }, [movies, series, favoriteIds]);

  const filteredContent = useMemo(() => {
    return currentContent.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesGroup = true;
      if (selectedGroup === '__favorites__') {
        matchesGroup = favoriteIds.includes(c.id);
      } else if (selectedGroup) {
        matchesGroup = c.group === selectedGroup || (c.group?.trim() === selectedGroup) || (c.group?.trim() === selectedGroup.trim());
      }
      return matchesSearch && matchesGroup;
    });
  }, [currentContent, searchQuery, selectedGroup, favoriteIds]);

  const currentVodHeroChannel = useMemo(() => {
    if (focusedVodChannel && filteredContent.some(c => c.id === focusedVodChannel.id)) {
      return focusedVodChannel;
    }
    return filteredContent.length > 0 ? filteredContent[0] : null;
  }, [focusedVodChannel, filteredContent]);

  // Smart TV Remote & Spatial Navigation Engine
  const {
    tvMode,
    toggleTvMode,
    lastRemoteAction,
    channelInputToast
  } = useTVRemoteNavigation({
    view,
    setView,
    selectedChannel,
    setSelectedChannel,
    selectedEPGProgram,
    setSelectedEPGProgram,
    fullscreenVodMovie,
    setFullscreenVodMovie,
    channels: filteredContent.length > 0 ? filteredContent : currentContent,
    onSelectChannel: handleSelectChannel,
    showCategoriesSidebar,
    setShowCategoriesSidebar,
    showNavMenu,
    setShowNavMenu,
    setShowMobileCategories: setShowCategoriesSidebar,
    lang: currentLang,
    favoritesTab
  });

  const handleAddPlaylist = async (data: {
    name: string;
    type: 'm3u' | 'xtream' | 'stalker';
    url: string;
    isLocal?: boolean;
    localM3uFileName?: string;
    localM3uContent?: string;
    epgUrl?: string;
    localEpgFileName?: string;
    localEpgContent?: string;
    username?: string;
    password?: string;
  }) => {
    const id = Math.random().toString(36).substr(2, 9);
    let finalUrl = data.url;
    let finalEpgUrl = data.epgUrl;

    if (data.isLocal && data.localM3uContent) {
      await saveLocalFile(`m3u_${id}`, data.localM3uContent);
      finalUrl = `local://m3u_${id}`;
    }

    if (data.localEpgContent) {
      await saveLocalFile(`epg_${id}`, data.localEpgContent);
      finalEpgUrl = `local://epg_${id}`;
    }

    const newPlaylist: IPTVPlaylist = {
      id,
      name: data.name,
      type: data.type,
      url: finalUrl,
      isLocal: data.isLocal,
      localM3uFileName: data.localM3uFileName,
      epgUrl: finalEpgUrl,
      localEpgFileName: data.localEpgFileName,
      username: data.username,
      password: data.password,
      lastUpdated: Date.now(),
    };
    
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    localStorage.setItem('vision_playlists', JSON.stringify(updated));
    await loadPlaylist(newPlaylist);
    setView('epg');
  };

  const handleUpdatePlaylistEpg = async (
    playlistId: string, 
    newEpgUrl?: string, 
    localEpgFile?: { name: string; content: string }
  ) => {
    let finalEpgUrl = newEpgUrl?.trim() || undefined;
    let localEpgFileName: string | undefined;

    if (localEpgFile) {
      await saveLocalFile(`epg_${playlistId}`, localEpgFile.content);
      finalEpgUrl = `local://epg_${playlistId}`;
      localEpgFileName = localEpgFile.name;
    } else if (finalEpgUrl === undefined) {
      // User explicitly cleared or removed EPG
      await deleteLocalFile(`epg_${playlistId}`);
    }

    // Invalidate XMLTV cache so newly set EPG data or modifications load immediately
    try {
      const { clearXMLTVCache } = await import('./services/xmltvService');
      clearXMLTVCache();
    } catch (err) {
      console.warn('Failed to clear XMLTV cache:', err);
    }

    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          const up: IPTVPlaylist = { 
            ...p, 
            epgUrl: finalEpgUrl,
            localEpgFileName: localEpgFile ? localEpgFileName : (finalEpgUrl?.startsWith('local://') ? p.localEpgFileName : undefined),
            isEpgCustomized: true,
            lastUpdated: Date.now()
          };
          if (activePlaylist?.id === playlistId) {
            setActivePlaylist(up);
          }
          return up;
        }
        return p;
      });
      localStorage.setItem('vision_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateLocalM3uFile = async (playlistId: string, fileName: string, content: string) => {
    await saveLocalFile(`m3u_${playlistId}`, content);
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          const up: IPTVPlaylist = {
            ...p,
            localM3uFileName: fileName,
            lastUpdated: Date.now()
          };
          if (activePlaylist?.id === playlistId) {
            setActivePlaylist(up);
            loadPlaylist(up);
          }
          return up;
        }
        return p;
      });
      localStorage.setItem('vision_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await deleteLocalFile(`m3u_${playlistId}`);
    await deleteLocalFile(`epg_${playlistId}`);
    const updated = playlists.filter(p => p.id !== playlistId);
    setPlaylists(updated);
    localStorage.setItem('vision_playlists', JSON.stringify(updated));
    if (activePlaylist?.id === playlistId) {
      if (updated.length > 0) {
        loadPlaylist(updated[0]);
      } else {
        setActivePlaylist(null);
        setChannels([]);
        setMovies([]);
        setSeries([]);
        setView('setup');
      }
    }
  };

  const addSamplePlaylist = () => {
    const sample: IPTVPlaylist = {
      id: 'sample',
      name: 'Sample Playlist (HLS)',
      type: 'm3u',
      url: 'https://iptv-org.github.io/iptv/index.m3u',
      lastUpdated: Date.now()
    };
    setPlaylists([sample]);
    loadPlaylist(sample);
    setView('epg');
  };

  const handleNavigate = (newView: ViewMode) => {
    if (newView === 'favorites') {
      setFavoritesTab('epg');
    }
    setView(newView);
    setShowNavMenu(false); // Automatically hides the left column on option selection
  };

  // Main Menu Navigation Items Definition (D-Pad indexable)
  // The sections for 'TV en direct' and 'Guide TV' are inverted, keeping the titles and order identical:
  // - Item 1 (Title 'TV en direct') displays the Guide TV (EPG)
  // - Item 4 (Title 'Guide TV (EPG)') displays the Live TV channels cards grid
  const menuNavItems = useMemo(() => [
    { id: 'live', view: 'epg' as ViewMode, label: t.navLive, icon: Tv, count: channels.length },
    { id: 'vod', view: 'vod' as ViewMode, label: t.navMovies, icon: Film, count: movies.length },
    { id: 'series', view: 'series' as ViewMode, label: t.navSeries, icon: Clapperboard, count: series.length },
    { id: 'epg', view: 'live' as ViewMode, label: t.navEpg, icon: Calendar, count: channels.length },
    { id: 'favorites', view: 'favorites' as ViewMode, label: t.navFavorites, icon: Heart, count: favoriteIds.length, color: 'text-red-400' },
    { id: 'recordings', view: 'recordings' as ViewMode, label: t.navRecordings || 'Enregistrements', icon: Disc, count: recordings.length, color: 'text-rose-400' },
    { id: 'recent', view: 'recent' as ViewMode, label: t.navRecent, icon: History, count: recentIds.length, color: 'text-amber-400' },
    { id: 'settings', view: 'settings' as ViewMode, label: t.navSettings, icon: Settings },
    { id: 'setup', action: 'setup', label: t.navAddPlaylist, icon: Plus, color: 'text-emerald-400' }
  ], [t, channels.length, movies.length, series.length, favoriteIds.length, recordings.length, recentIds.length]);

  const [menuFocusIndex, setMenuFocusIndex] = useState(0);

  // Sync menuFocusIndex when opening showNavMenu or when view changes
  useEffect(() => {
    if (showNavMenu) {
      const idx = menuNavItems.findIndex(item => item.view === view);
      setMenuFocusIndex(idx >= 0 ? idx : 0);
    }
  }, [showNavMenu, view, menuNavItems]);

  // Categories Sidebar Items Definition (D-Pad indexable)
  const sidebarCategoryList = useMemo(() => {
    const list: { key: string; label: string; count?: number; isSpecial?: boolean }[] = [
      { key: '__all__', label: `Toutes (${(view === 'live' || view === 'epg') ? 'Chaînes' : view === 'vod' ? 'Films' : view === 'series' ? 'Séries' : view === 'favorites' ? 'Favoris' : 'Récents'})` }
    ];
    if ((view === 'live' || view === 'epg') && favoritesCount > 0) {
      list.push({ key: '__favorites__', label: 'Favoris', count: favoritesCount, isSpecial: true });
    }
    groups.forEach(g => {
      list.push({ key: g, label: g });
    });
    list.push({ key: '__add_playlist__', label: 'Ajouter une playlist', isSpecial: true });
    return list;
  }, [view, favoritesCount, groups]);

  const [categoryFocusIndex, setCategoryFocusIndex] = useState(0);

  // Sync categoryFocusIndex and auto-focus active category when opening sidebar or returning to column 1
  useEffect(() => {
    if (showCategoriesSidebar) {
      const currentKey = selectedGroup === null ? '__all__' : selectedGroup;
      const idx = sidebarCategoryList.findIndex(item => item.key === currentKey);
      const targetIdx = idx >= 0 ? idx : (categoryFocusIndex >= 0 && categoryFocusIndex < sidebarCategoryList.length ? categoryFocusIndex : 0);
      setCategoryFocusIndex(targetIdx);

      const focusAndScroll = () => {
        const el = document.getElementById(`cat-sidebar-item-${targetIdx}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      };

      focusAndScroll();
      const rAF = requestAnimationFrame(focusAndScroll);
      const t1 = setTimeout(focusAndScroll, 50);
      const t2 = setTimeout(focusAndScroll, 150);
      const t3 = setTimeout(focusAndScroll, 320); // after slide animation finishes

      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showCategoriesSidebar, selectedGroup, sidebarCategoryList]);

  // Global Keyboard listener for Menu (M key), Categories (C key), and TiviMate-style D-Pad Cascading Navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';
      if (isInput) return;

      if (showNavMenu) {
        // D-PAD IN COLUMN 0 (MAIN MENU DRAWER)
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMenuFocusIndex(prev => {
            const next = (prev + 1) % menuNavItems.length;
            const el = document.getElementById(`menu-nav-item-${next}`);
            if (el) el.scrollIntoView({ block: 'nearest' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMenuFocusIndex(prev => {
            const next = (prev - 1 + menuNavItems.length) % menuNavItems.length;
            const el = document.getElementById(`menu-nav-item-${next}`);
            if (el) el.scrollIntoView({ block: 'nearest' });
            return next;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = menuNavItems[menuFocusIndex];
          if (target) {
            if (target.action === 'setup') {
              setView('setup');
              setShowNavMenu(false);
            } else if (target.view) {
              handleNavigate(target.view);
            }
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const target = menuNavItems[menuFocusIndex];
          if (target) {
            if (target.action === 'setup') {
              setView('setup');
              setShowNavMenu(false);
            } else if (target.view) {
              setView(target.view);
              setShowNavMenu(false);
              if (target.view !== 'epg' && target.view !== 'settings' && target.view !== 'setup') {
                setShowCategoriesSidebar(true);
              }
            }
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setShowNavMenu(false);
        }
      } else if (showCategoriesSidebar) {
        // D-PAD IN COLUMN 1 (CATEGORIES SIDEBAR)
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCategoryFocusIndex(prev => {
            const next = (prev + 1) % sidebarCategoryList.length;
            const el = document.getElementById(`cat-sidebar-item-${next}`);
            if (el) {
              el.focus();
              el.scrollIntoView({ block: 'nearest' });
            }
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCategoryFocusIndex(prev => {
            const next = (prev - 1 + sidebarCategoryList.length) % sidebarCategoryList.length;
            const el = document.getElementById(`cat-sidebar-item-${next}`);
            if (el) {
              el.focus();
              el.scrollIntoView({ block: 'nearest' });
            }
            return next;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = sidebarCategoryList[categoryFocusIndex];
          if (selected) {
            if (selected.key === '__all__') {
              handleSelectGroup(null);
            } else if (selected.key === '__favorites__') {
              handleSelectGroup('__favorites__');
            } else if (selected.key === '__add_playlist__') {
              setView('setup');
            } else {
              handleSelectGroup(selected.key);
            }
            setShowCategoriesSidebar(false);
            setTimeout(() => {
              const firstMovieCard = document.querySelector('[data-tv-first-movie="true"], [data-tv-movie-card="true"], [data-channel-id]') as HTMLElement;
              firstMovieCard?.focus();
            }, 60);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setShowCategoriesSidebar(false);
          setTimeout(() => {
            const firstMovieCard = document.querySelector('[data-tv-first-movie="true"], [data-tv-movie-card="true"], [data-channel-id]') as HTMLElement;
            firstMovieCard?.focus();
          }, 60);
        } else if (e.key === 'ArrowLeft' || e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setShowCategoriesSidebar(false);
          setShowNavMenu(true);
        }
      } else {
        // DEFAULT CONTENT VIEW NAVIGATION
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setShowNavMenu(true);
          setShowCategoriesSidebar(false);
        } else if (e.key === 'c' || e.key === 'C') {
          if (view !== 'epg' && view !== 'settings' && view !== 'setup') {
            e.preventDefault();
            setShowCategoriesSidebar(prev => !prev);
          }
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          if (view !== 'epg' && view !== 'setup' && view !== 'settings') {
            e.preventDefault();
            setShowCategoriesSidebar(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showNavMenu, showCategoriesSidebar, view, menuFocusIndex, menuNavItems, categoryFocusIndex, sidebarCategoryList]);

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Slide-Over Navigation Drawer (Unified across all screen sizes with auto-hide on selection) */}
      <AnimatePresence>
        {showNavMenu && view !== 'setup' && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNavMenu(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.nav 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0c131d]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col py-6 px-4 z-[101] shadow-2xl shadow-black/90"
            >
              <div className="flex items-center justify-between px-2 mb-6">
                <VisionLogo size="md" variant="full" />
                <button 
                  onClick={() => setShowNavMenu(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Fermer (Échap)"
                >
                  <span className="text-[10px] text-white/40 font-mono hidden sm:inline">Échap</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Playlist indicator pill */}
              {activePlaylist && (
                <div className="mb-3 mx-1 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Playlist active</span>
                    <span className="text-xs text-white/90 font-medium truncate block">{activePlaylist.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    {channels.length} ch
                  </span>
                </div>
              )}

              {/* Install PWA / Fire TV Button in Sidebar */}
              <div className="mb-4 mx-1">
                <PWAInstallButton variant="sidebar" />
              </div>

              {/* Navigation Items (Auto-hide on select, D-Pad up/down navigable) */}
              <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
                {menuNavItems.slice(0, 6).map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = view === item.view;
                  const isFocused = menuFocusIndex === idx;
                  return (
                    <button
                      key={item.id}
                      id={`menu-nav-item-${idx}`}
                      onClick={() => handleNavigate(item.view!)}
                      onMouseEnter={() => setMenuFocusIndex(idx)}
                      data-tv-focusable="true"
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                        isSelected 
                          ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold" 
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                        isFocused && !isSelected && "ring-2 ring-emerald-400 bg-white/10 text-white scale-[1.01]",
                        isFocused && isSelected && "ring-2 ring-white scale-[1.01]"
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className={cn("w-5 h-5", item.color)} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-mono font-bold",
                          isSelected ? "bg-black/20 text-black" : "bg-white/5 text-white/60"
                        )}>
                          {item.count}
                        </span>
                      )}
                      {item.badge && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-bold",
                          isSelected ? "bg-black/20 text-black" : "bg-cyan-500/20 text-cyan-400"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10 mt-auto space-y-2">
                <button
                  id="menu-nav-item-6"
                  onClick={() => handleNavigate('settings')}
                  onMouseEnter={() => setMenuFocusIndex(6)}
                  data-tv-focusable="true"
                  className={cn(
                    "flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                    view === 'settings' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold" : "text-white/70 hover:bg-white/5 hover:text-white",
                    menuFocusIndex === 6 && view !== 'settings' && "ring-2 ring-emerald-400 bg-white/10 text-white scale-[1.01]",
                    menuFocusIndex === 6 && view === 'settings' && "ring-2 ring-white scale-[1.01]"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  <span>{t.navSettings}</span>
                </button>
                <button
                  id="menu-nav-item-7"
                  onClick={() => { setView('setup'); setShowNavMenu(false); }}
                  onMouseEnter={() => setMenuFocusIndex(7)}
                  data-tv-focusable="true"
                  className={cn(
                    "flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer",
                    menuFocusIndex === 7 && "ring-2 ring-emerald-400 bg-emerald-500/20 text-emerald-300 scale-[1.01]"
                  )}
                >
                  <Plus className="w-5 h-5" />
                  <span>{t.navAddPlaylist}</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {view === 'setup' ? (
          <SetupScreen 
            onAdd={handleAddPlaylist} 
            onSample={addSamplePlaylist}
            type={playlistType}
            setType={setPlaylistType}
            canCancel={playlists.length > 0}
            onCancel={() => setView('epg')}
          />
        ) : (
          <>
            {/* Header */}
            {!isEpgFullscreen && !selectedChannel && (
              <header className="h-16 sm:h-20 border-b border-white/5 flex items-center justify-between px-3 sm:px-8 bg-[#0A0A0A]/90 backdrop-blur-md z-40 gap-2">
                <div className="flex items-center gap-2 sm:gap-6 flex-1 max-w-2xl min-w-0">
                  {/* Unified Menu & Brand Toggle Button */}
                  <button
                    onClick={() => setShowNavMenu(true)}
                    data-tv-focusable="true"
                    className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer group flex-shrink-0"
                    title="Ouvrir le menu principal (Touche M)"
                  >
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:text-black transition-colors" />
                    <VisionLogo size="xs" variant="full" showSubtitle={false} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 group-hover:bg-black/20 text-white/60 group-hover:text-black font-mono font-bold hidden xl:inline">M</span>
                  </button>

                  <div className="relative flex-1 group min-w-0">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-white/5 border border-white/10 rounded-full py-2 sm:py-2.5 pl-9 sm:pl-12 pr-9 sm:pr-12 focus:outline-none focus:border-emerald-500/50 text-xs sm:text-sm transition-colors placeholder:text-white/40"
                      value={searchQuery ?? ''}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Categories Toggle Pill */}
                  {(view === 'live' || view === 'vod' || view === 'series' || (view === 'favorites' && favoritesTab === 'vod') || view === 'recent') && (
                    <button 
                      onClick={() => setShowCategoriesSidebar(prev => !prev)}
                      data-tv-focusable="true"
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex-shrink-0",
                        showCategoriesSidebar 
                          ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-bold" 
                          : selectedGroup 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" 
                          : "bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10"
                      )}
                      title="Afficher/Masquer les catégories (Touche C ou Flèche Gauche)"
                    >
                      <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline max-w-[110px] truncate">{selectedGroup === '__favorites__' ? 'Favoris' : (selectedGroup || 'Catégories')}</span>
                      <ChevronRight className={cn("w-3 h-3 hidden sm:inline transition-transform", showCategoriesSidebar && "rotate-180")} />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* PWA / Firestick Install Action Button */}
                  <PWAInstallButton variant="header" />

                  {/* Language Switcher (6 Global IPTV Markets) */}
                  <LanguageSelector 
                    currentLang={currentLang} 
                    onLanguageChange={handleLanguageChange} 
                    variant="dropdown"
                  />

                  {/* TV Mode D-Pad Remote Toggle Button */}
                  <button
                    onClick={toggleTvMode}
                    data-tv-focusable="true"
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                      tvMode
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm"
                        : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10"
                    )}
                    title="Smart TV Remote (D-Pad)"
                  >
                    <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="hidden sm:inline">{t.tvRemoteLegend}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md font-mono uppercase font-black",
                      tvMode ? "bg-emerald-500 text-black" : "bg-white/10 text-white/50"
                    )}>
                      {tvMode ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button 
                    onClick={() => setView('setup')}
                    data-tv-focusable="true"
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.navAddPlaylist}</span>
                  </button>
                  <button 
                    onClick={() => setView('setup')}
                    data-tv-focusable="true"
                    className="md:hidden p-2 bg-emerald-500 text-black rounded-xl transition-colors shadow-md active:scale-90"
                    title={t.navAddPlaylist}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                    JD
                  </div>
                </div>
              </header>
            )}

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
              {view === 'settings' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <SettingsScreen 
                    tvMode={tvMode}
                    onToggleTvMode={toggleTvMode}
                    currentLang={currentLang}
                    onLanguageChange={handleLanguageChange}
                    playerType={playerType} 
                    onPlayerTypeChange={handlePlayerTypeChange} 
                    playerChoice={playerChoice}
                    onPlayerChoiceChange={handlePlayerChoiceChange}
                    playlists={playlists}
                    activePlaylist={activePlaylist}
                    onSelectPlaylist={(p) => loadPlaylist(p)}
                    onUpdatePlaylistEpg={handleUpdatePlaylistEpg}
                    onUpdateLocalM3uFile={handleUpdateLocalM3uFile}
                    onDeletePlaylist={handleDeletePlaylist}
                    onAddPlaylist={() => setView('setup')}
                    userAgentMode={userAgentMode}
                    onUserAgentModeChange={handleUserAgentModeChange}
                    customUserAgent={customUserAgent}
                    onCustomUserAgentChange={handleCustomUserAgentChange}
                    streamProxyMode={streamProxyMode}
                    onStreamProxyModeChange={handleStreamProxyModeChange}
                  />
                </div>
              ) : view === 'recordings' ? (
                <div className="flex-1 flex overflow-hidden">
                  <RecordingsView
                    recordings={recordings}
                    channels={channels}
                    onPlayRecording={handlePlayRecording}
                    onDeleteRecording={handleDeleteRecording}
                    onStopRecording={handleStopRecording}
                    onAddRecording={handleAddRecording}
                    onNavigateToGuide={() => setView('epg')}
                  />
                </div>
              ) : (view === 'epg' || (view === 'favorites' && favoritesTab === 'epg')) ? (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {view === 'favorites' && favoriteVodContent.length > 0 && (
                    <div className="bg-[#060c14] border-b border-white/10 px-3 sm:px-6 py-2 flex items-center justify-between z-20 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-400 fill-current" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Favoris</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setFavoritesTab('epg')}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Guide TV ({favoriteChannels.length})</span>
                        </button>
                        <button
                          onClick={() => setFavoritesTab('vod')}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Films & Séries ({favoriteVodContent.length})</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <EPGGridView 
                      channels={view === 'favorites' ? favoriteChannels : channels} 
                      selectedChannel={selectedChannel}
                      onWatch={(channel) => handleSelectChannel(channel)} 
                      onSelectProgram={(p, c) => setSelectedEPGProgram({ ...p, channel: c })}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={(id) => toggleFavorite(id)}
                      playlist={activePlaylist}
                      playlists={playlists}
                      onSelectPlaylist={(p) => loadPlaylist(p)}
                      onNavigate={(targetView) => handleNavigate(targetView as any)}
                      onNavigateToSettings={() => setView('settings')}
                      onOpenMenu={() => setShowNavMenu(true)}
                      isMenuOpen={showNavMenu}
                      isProgramModalOpen={Boolean(selectedEPGProgram)}
                      selectedCategory={selectedGroup}
                      onSelectCategory={(cat) => handleSelectGroup(cat, view)}
                      streamProxyMode={streamProxyMode}
                      userAgentMode={userAgentMode}
                      customUserAgent={customUserAgent}
                      isPlayerFullscreen={isEpgFullscreen}
                      onPlayerFullscreenChange={setIsEpgFullscreen}
                      isFavoritesView={view === 'favorites'}
                      recordings={recordings}
                      onAddRecording={handleAddRecording}
                      onDeleteRecording={handleDeleteRecording}
                      reminders={reminders}
                      onAddReminder={handleAddReminder}
                      onDeleteReminder={handleDeleteReminder}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Groups Sidebar (Auto-collapses on select / Right arrow to leave 100% space for content) */}
                  {(view === 'live' || view === 'vod' || view === 'series' || (view === 'favorites' && favoritesTab === 'vod') || view === 'recent') && (
                    <div className={cn(
                      "bg-[#090f18] border-r border-white/10 overflow-y-auto transition-all duration-300 ease-in-out z-30 shadow-2xl flex-shrink-0 select-none",
                      showCategoriesSidebar
                        ? "w-64 lg:w-72 opacity-100 translate-x-0"
                        : "w-0 opacity-0 -translate-x-full overflow-hidden border-none pointer-events-none"
                    )}>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                          <button
                            onClick={() => {
                              setShowCategoriesSidebar(false);
                              setShowNavMenu(true);
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            title="Menu principal (Échap ou Flèche Gauche)"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Menu</span>
                          </button>
                          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Catégories</h3>
                          <button 
                            onClick={() => setShowCategoriesSidebar(false)} 
                            className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors cursor-pointer"
                            title="Masquer (Flèche Droite)"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {sidebarCategoryList.map((item, idx) => {
                            const isSelected = item.key === '__all__'
                              ? !selectedGroup
                              : item.key === '__favorites__'
                              ? selectedGroup === '__favorites__'
                              : item.key === '__add_playlist__'
                              ? false
                              : selectedGroup === item.key;
                            const isFocused = categoryFocusIndex === idx;

                            return (
                              <button
                                key={item.key}
                                id={`cat-sidebar-item-${idx}`}
                                data-tv-focusable="true"
                                tabIndex={0}
                                onFocus={() => setCategoryFocusIndex(idx)}
                                onClick={() => {
                                  if (item.key === '__all__') {
                                    handleSelectGroup(null);
                                  } else if (item.key === '__favorites__') {
                                    handleSelectGroup('__favorites__');
                                  } else if (item.key === '__add_playlist__') {
                                    setView('setup');
                                  } else {
                                    handleSelectGroup(item.key);
                                  }
                                  setShowCategoriesSidebar(false);
                                  setTimeout(() => {
                                    const firstMovieCard = document.querySelector('[data-tv-first-movie="true"], [data-tv-movie-card="true"], [data-channel-id]') as HTMLElement;
                                    firstMovieCard?.focus();
                                  }, 60);
                                }}
                                onMouseEnter={() => setCategoryFocusIndex(idx)}
                                className={cn(
                                  "w-full text-left px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all font-medium flex items-center justify-between truncate cursor-pointer outline-none",
                                  isSelected 
                                    ? "bg-emerald-500 text-black font-bold shadow-md" 
                                    : item.key === '__favorites__'
                                    ? "text-emerald-400 hover:text-emerald-300 hover:bg-white/5"
                                    : item.key === '__add_playlist__'
                                    ? "text-emerald-400 hover:bg-emerald-500/10"
                                    : "text-white/70 hover:text-white hover:bg-white/5",
                                  isFocused && !isSelected && "ring-2 ring-emerald-400 bg-white/10 text-white scale-[1.01]",
                                  isFocused && isSelected && "ring-2 ring-white scale-[1.01]"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {item.key === '__favorites__' && (
                                    <Star className={cn("w-3.5 h-3.5 fill-current flex-shrink-0", isSelected ? "text-black" : "text-amber-400")} />
                                  )}
                                  {item.key === '__add_playlist__' && (
                                    <Plus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{item.label}</span>
                                </div>
                                {item.count !== undefined && item.count > 0 && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ml-1.5",
                                    isSelected ? "bg-black/20 text-black" : "bg-white/5 text-white/40"
                                  )}>
                                    {item.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

              {/* Mobile Overlay for Categories Drawer */}
              <AnimatePresence>
                {showCategoriesSidebar && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCategoriesSidebar(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
                  />
                )}
              </AnimatePresence>

              {/* Content Panel */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Fixed Top Hero Description Section for VOD and Series (stays visible when scrolling the grid) */}
                {(view === 'vod' || view === 'series') && !isLoading && filteredContent.length > 0 && (
                  <div className="flex-shrink-0 px-3 sm:px-6 md:px-8 pt-3 sm:pt-5 pb-1">
                    <VodHeroHeader
                      channel={currentVodHeroChannel}
                      categoryName={selectedGroup || (view === 'vod' ? 'Films (VOD)' : 'Séries')}
                      onPlay={(ch) => handleSelectChannel(ch)}
                      isFavorite={currentVodHeroChannel ? favoriteIds.includes(currentVodHeroChannel.id) : false}
                      onToggleFavorite={currentVodHeroChannel ? () => toggleFavorite(currentVodHeroChannel.id) : undefined}
                      onOpenFullscreenHero={(ch) => setFullscreenVodMovie(ch)}
                    />
                  </div>
                )}

                {view === 'favorites' && (
                  <div className="flex-shrink-0 px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-400 fill-current" />
                      <h2 className="text-sm sm:text-base font-bold text-white">Films & Séries favoris</h2>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setFavoritesTab('epg')}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Guide TV ({favoriteChannels.length})</span>
                      </button>
                      <button
                        onClick={() => setFavoritesTab('vod')}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Films & Séries ({favoriteVodContent.length})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Scrollable Grid Content */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 pb-6 sm:pb-8 pt-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                      <p className="text-white/60 animate-pulse">Loading your content...</p>
                    </div>
                  ) : filteredContent.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-4 text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                        {view === 'recent' ? <History className="w-8 h-8" /> : view === 'favorites' ? <Heart className="w-8 h-8" /> : <Tv className="w-8 h-8" />}
                      </div>
                      <div className="max-w-sm">
                        <h3 className="text-base font-bold text-white mb-1">
                          {view === 'recent' 
                            ? 'Aucun élément récent' 
                            : view === 'favorites' 
                            ? 'Aucun favori pour le moment' 
                            : 'Aucun contenu trouvé'}
                        </h3>
                        <p className="text-xs text-white/40 leading-relaxed">
                          {view === 'recent' 
                            ? 'Les chaînes et films que vous regardez s\'afficheront ici.' 
                            : view === 'favorites' 
                            ? 'Cliquez sur le cœur d\'un élément pour l\'ajouter à vos favoris.' 
                            : 'Essayez de modifier votre recherche ou sélectionnez une autre catégorie.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Category Title Header */}
                      {(view === 'vod' || view === 'series') && (
                        <div className="flex items-center justify-between pb-1">
                          <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-wide">
                            {selectedGroup || (view === 'vod' ? 'Tous les films' : 'Toutes les séries')}
                          </h2>
                          <span className="text-xs text-white/40 font-mono font-medium">
                            {filteredContent.length} titre{filteredContent.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {view === 'recent' && (
                        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <History className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div>
                              <h2 className="text-xs sm:text-sm font-bold text-white">Récemment regardés</h2>
                              <p className="text-[10px] sm:text-[11px] text-white/40">{filteredContent.length} élément{filteredContent.length > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <button
                            onClick={clearAllRecent}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[11px] sm:text-xs font-semibold transition-all active:scale-95"
                            title="Effacer tout l'historique récent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Tout effacer</span>
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-6">
                        {filteredContent.slice(0, visibleCount).map((item: IPTVChannel, index: number) => (
                          <ChannelCard 
                            key={item.id} 
                            channel={item} 
                            variant={view === 'live' || view === 'favorites' || view === 'recent' ? 'landscape' : 'poster'}
                            isMovie={view === 'vod' || view === 'series'}
                            isFirst={index === 0}
                            isRecent={view === 'recent'}
                            onClick={() => handleSelectChannel(item)}
                            onOpenHero={view === 'vod' || view === 'series' ? (ch) => setFullscreenVodMovie(ch) : undefined}
                            isFavorite={favoriteIds.includes(item.id)}
                            onToggleFavorite={() => toggleFavorite(item.id)}
                            onRemoveRecent={view === 'recent' ? () => removeFromRecent(item.id) : undefined}
                            onFocusItem={setFocusedVodChannel}
                            isFocused={currentVodHeroChannel?.id === item.id}
                          />
                        ))}
                      </div>

                      {filteredContent.length > visibleCount && (
                        <div className="flex justify-center pt-8 pb-4">
                          <button
                            onClick={() => setVisibleCount(prev => prev + 100)}
                            className="px-6 py-3 bg-white/10 hover:bg-emerald-500 hover:text-black text-white font-bold text-sm rounded-xl transition-all border border-white/10 flex items-center gap-2 shadow-lg active:scale-95"
                          >
                            <span>Afficher plus ({filteredContent.length - visibleCount} éléments restants)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

            {/* Fullscreen VOD Movie Hero Detail View */}
            <AnimatePresence>
              {fullscreenVodMovie && !selectedChannel && (
                <FullscreenMovieHero
                  channel={fullscreenVodMovie}
                  categoryName={selectedGroup || (view === 'vod' ? 'Films (VOD)' : 'Séries')}
                  onPlay={(ch) => {
                    handleSelectChannel(ch);
                  }}
                  onClose={() => setFullscreenVodMovie(null)}
                  isFavorite={favoriteIds.includes(fullscreenVodMovie.id)}
                  onToggleFavorite={() => toggleFavorite(fullscreenVodMovie.id)}
                />
              )}
            </AnimatePresence>

            {/* Video Player Overlay */}
            <AnimatePresence>
              {selectedChannel && view !== 'epg' && (
                <VideoPlayer 
                  channel={selectedChannel} 
                  playlist={activePlaylist}
                  channels={filteredContent.length > 0 ? filteredContent : channels}
                  lastChannel={lastChannel}
                  onSelectChannel={handleSelectChannel}
                  onClose={() => {
                    setSelectedChannel(null);
                    setShowCategoriesSidebar(false);
                    setShowNavMenu(false);
                  }} 
                  playerType={playerType}
                  playerChoice={playerChoice}
                  onPlayerChoiceChange={handlePlayerChoiceChange}
                  onSelectProgram={(p) => setSelectedEPGProgram({ ...p, channel: selectedChannel })}
                  isFavorite={favoriteIds.includes(selectedChannel.id)}
                  onToggleFavorite={() => toggleFavorite(selectedChannel.id)}
                  isMovie={view === 'vod' || view === 'series' || movies.some(m => m.id === selectedChannel.id)}
                  userAgentMode={userAgentMode}
                  customUserAgent={customUserAgent}
                  streamProxyMode={streamProxyMode}
                />
              )}
            </AnimatePresence>

            {/* Program Detail Modal */}
            <AnimatePresence>
              {selectedEPGProgram && (
                <ProgramDetailModal 
                  program={selectedEPGProgram}
                  channel={selectedEPGProgram.channel}
                  onClose={() => setSelectedEPGProgram(null)}
                  onWatch={() => {
                    handleSelectChannel(selectedEPGProgram.channel);
                    setSelectedEPGProgram(null);
                  }}
                  isFavorite={favoriteIds.includes(selectedEPGProgram.channel?.id)}
                  onToggleFavorite={() => toggleFavorite(selectedEPGProgram.channel?.id)}
                  isScheduled={recordings.some(r => r.programTitle === selectedEPGProgram.title && r.channelId === selectedEPGProgram.channel?.id && r.status !== 'completed')}
                  onToggleRecord={() => {
                    const existing = recordings.find(r => r.programTitle === selectedEPGProgram.title && r.channelId === selectedEPGProgram.channel?.id && r.status !== 'completed');
                    if (existing) {
                      handleDeleteRecording(existing.id);
                    } else {
                      const startTs = selectedEPGProgram.startTs || Date.now();
                      const stopTs = selectedEPGProgram.stopTs || (startTs + 60 * 60 * 1000);
                      const isLive = Date.now() >= startTs && Date.now() < stopTs;
                      const duration = Math.max(15, Math.round((stopTs - startTs) / (60 * 1000)));

                      handleAddRecording({
                        programTitle: selectedEPGProgram.title,
                        channelId: selectedEPGProgram.channel?.id || '',
                        channelName: selectedEPGProgram.channel?.name || '',
                        channelLogo: selectedEPGProgram.channel?.logo,
                        streamUrl: selectedEPGProgram.channel?.url,
                        startTime: startTs,
                        endTime: stopTs,
                        status: isLive ? 'recording' : 'scheduled',
                        recordedDurationMinutes: duration,
                        fileSize: `${((duration * 25) / 1024).toFixed(1)} Go`,
                        description: selectedEPGProgram.desc || selectedEPGProgram.description,
                        category: selectedEPGProgram.category || selectedEPGProgram.channel?.group
                      });
                    }
                  }}
                />
              )}
            </AnimatePresence>
            {/* External Player Launch Notification Toast */}
            <AnimatePresence>
              {externalLaunchToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#141414]/95 border border-emerald-500/40 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-500/10 flex items-center gap-3 text-white pointer-events-none"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Flux lancé dans {externalLaunchToast.player}
                      </p>
                    </div>
                    <p className="text-xs text-white/70 font-medium truncate max-w-xs sm:max-w-md">
                      {fixUtf8(externalLaunchToast.name)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Reminder Alert Notification Banner Toast */}
            <AnimatePresence>
              {activeReminderAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-[#0c1524]/95 border-2 border-amber-400/80 backdrop-blur-2xl px-6 py-4 rounded-3xl shadow-2xl shadow-amber-500/20 flex items-center gap-4 text-white max-w-lg w-full"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 animate-bounce">
                    <Bell className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        Rappel d'émission (débute dans 5 min)
                      </p>
                    </div>
                    <h4 className="text-sm font-extrabold text-white truncate mt-0.5">
                      {fixUtf8(activeReminderAlert.programTitle)}
                    </h4>
                    <p className="text-xs text-white/50 truncate">
                      Sur <span className="font-bold text-white/80">{activeReminderAlert.channelName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        const targetChan = channels.find(c => c.id === activeReminderAlert.channelId) || {
                          id: activeReminderAlert.channelId,
                          name: activeReminderAlert.channelName,
                          url: '',
                          logo: activeReminderAlert.channelLogo,
                          group: 'Rappel'
                        };
                        handleSelectChannel(targetChan);
                        setActiveReminderAlert(null);
                      }}
                      className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Regarder
                    </button>
                    <button
                      onClick={() => setActiveReminderAlert(null)}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Smart TV Remote Navigation Bar & OSD */}
            {!isEpgFullscreen && !selectedChannel && (
              <TVRemoteBar
                tvMode={tvMode}
                onToggleTvMode={toggleTvMode}
                lastAction={lastRemoteAction}
                channelInputToast={channelInputToast}
                lang={currentLang}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      data-tv-focusable="true"
      tabIndex={0}
      className={cn(
        "flex items-center gap-4 w-full p-3 rounded-xl transition-all duration-300 group relative cursor-pointer",
        active ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <div className={cn("w-6 h-6 flex items-center justify-center", active ? "text-black" : "group-hover:scale-110 transition-transform")}>
        {icon}
      </div>
      <span className="hidden lg:block font-medium text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 w-1 h-6 bg-black rounded-r-full hidden lg:block"
        />
      )}
    </button>
  );
}

interface ChannelCardProps {
  key?: string;
  channel: IPTVChannel;
  onClick: () => void;
  variant?: 'landscape' | 'poster';
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isMovie?: boolean;
  isFirst?: boolean;
  isRecent?: boolean;
  onRemoveRecent?: () => void;
  onFocusItem?: (channel: IPTVChannel) => void;
  onOpenHero?: (channel: IPTVChannel) => void;
  isFocused?: boolean;
}

function ChannelCard({ 
  channel, 
  onClick, 
  variant = 'landscape', 
  isFavorite, 
  onToggleFavorite,
  isMovie = false,
  isFirst = false,
  isRecent = false,
  onRemoveRecent,
  onFocusItem,
  onOpenHero,
  isFocused = false
}: ChannelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMovieCard = isMovie || variant === 'poster';

  // Extract rating from title if present (e.g. "Damage [6.6]" or "Game Change (6.9)")
  const ratingMatch = channel.name.match(/[\(\[]\s*([0-9]\.[0-9])\s*[\)\]]/);
  const rating = ratingMatch ? ratingMatch[1] : null;

  const handleCardClick = () => {
    onFocusItem?.(channel);
    if (!isMovieCard) {
      onClick();
    }
  };

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ y: -4 }}
      onClick={handleCardClick}
      onDoubleClick={() => {
        if (isMovieCard && onOpenHero) {
          onOpenHero(channel);
        } else {
          onClick();
        }
      }}
      onFocus={() => onFocusItem?.(channel)}
      className={cn(
        "group flex flex-col text-left relative cursor-pointer tv-focus-target rounded-2xl transition-all duration-200 outline-none select-none",
        isFocused ? "ring-2 ring-cyan-400 scale-[1.02] shadow-xl shadow-cyan-950/50" : ""
      )}
      role="button"
      tabIndex={0}
      data-tv-focusable="true"
      data-tv-movie-card={isMovieCard ? "true" : undefined}
      data-tv-first-movie={isFirst ? "true" : undefined}
      data-channel-id={channel.id}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocusItem?.(channel);
          if (isMovieCard && onOpenHero) {
            onOpenHero(channel);
          } else {
            onClick();
          }
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          onToggleFavorite();
        }
      }}
    >
      <div className={cn(
        "bg-[#111823] rounded-2xl overflow-hidden border transition-all relative flex flex-col items-center justify-center",
        isFocused
          ? "border-cyan-400 shadow-lg shadow-cyan-500/20"
          : "border-white/10 group-hover:border-cyan-500/60 group-focus:border-cyan-400",
        variant === 'landscape' ? "aspect-video p-3" : "aspect-[2/3] p-0"
      )}>
        {/* Poster / Channel Logo */}
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            className={cn(
              "filter drop-shadow-md transition-transform duration-300 group-hover:scale-105",
              variant === 'landscape' ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"
            )}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-900 to-[#0c1420] text-white/20">
            {variant === 'landscape' ? <Tv className="w-10 h-10" /> : <Film className="w-12 h-12" />}
          </div>
        )}

        {/* Play Icon Badge on Hover for Live Channels */}
        {!isMovieCard && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Rating Badge on Bottom-Left of Poster (as in TiviMate VOD interface) */}
        {isMovieCard && rating && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/90 text-black font-extrabold text-[10px] sm:text-[11px] shadow-md flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-black text-black" />
              {rating}
            </span>
          </div>
        )}

        {/* Delete from Recent Button */}
        {onRemoveRecent && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRecent();
            }}
            title="Supprimer des récents"
            className="absolute top-2.5 left-2.5 p-1.5 sm:p-2 rounded-full backdrop-blur-md bg-black/70 border border-white/15 text-white/70 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all z-10 opacity-90 md:opacity-0 md:group-hover:opacity-100 shadow-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        
        {/* Favorite Toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={cn(
            "absolute top-2.5 right-2.5 p-1.5 sm:p-2 rounded-full backdrop-blur-md border transition-all z-10",
            isFavorite 
              ? "bg-emerald-500 border-emerald-500 text-black opacity-100 shadow-md" 
              : "bg-black/60 border-white/15 text-white/60 hover:text-white hover:bg-black/80 opacity-80 sm:opacity-0 group-hover:opacity-100 group-focus:opacity-100"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
        </button>
      </div>

      {/* Bottom Title Bar */}
      <div className="px-1 py-1.5">
        <h4 className="font-semibold text-xs sm:text-sm truncate text-white/90 group-hover:text-cyan-400 group-focus:text-cyan-400 transition-colors">
          {fixUtf8(channel.name)}
        </h4>
        {channel.group && (
          <p className="text-[10px] text-white/40 uppercase tracking-wider truncate mt-0.5">
            {fixUtf8(channel.group)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ProgramDetailModal({ 
  program, 
  channel, 
  onClose, 
  onWatch, 
  isFavorite, 
  onToggleFavorite,
  isScheduled,
  onToggleRecord
}: { 
  program: any, 
  channel: IPTVChannel, 
  onClose: () => void, 
  onWatch: () => void, 
  isFavorite?: boolean, 
  onToggleFavorite?: () => void,
  isScheduled?: boolean,
  onToggleRecord?: () => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-[#141414] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative aspect-video bg-[#0A0A0A] flex items-center justify-center">
          {channel.logo ? (
            <img src={channel.logo} alt="" className="w-full h-full object-contain opacity-40 blur-sm" referrerPolicy="no-referrer" />
          ) : (
            <Tv className="w-20 h-20 opacity-10" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-t from-[#141414] via-transparent to-transparent">
            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
              {channel.logo ? (
                <img src={channel.logo} alt="" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <Tv className="text-black w-10 h-10" />
              )}
            </div>
            <h2 className="text-3xl font-bold mb-2">{fixUtf8(program.title)}</h2>
            <div className="flex items-center gap-3 text-emerald-500 font-medium">
              <Clock className="w-4 h-4" />
              {program.start} - {program.stop}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10">
          <div className="flex items-center gap-4 mb-6">
            {program.category && (
              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                {fixUtf8(program.category)}
              </div>
            )}
            <div className="px-3 py-1 bg-white/5 text-white/60 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              {fixUtf8(channel.group)}
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <div className="text-white/60 text-sm font-medium">
              {fixUtf8(channel.name)}
            </div>
          </div>

          <p className="text-white/75 leading-relaxed mb-10 text-base sm:text-lg">
            {fixUtf8(program.desc || program.description || `Retrouvez en direct la diffusion continue de vos émissions et programmes sur ${channel.name}.`)}
          </p>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
            <button 
              onClick={onWatch}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 cursor-pointer min-w-[140px]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Watch Now</span>
            </button>
            {onToggleRecord && (
              <button
                onClick={onToggleRecord}
                className={cn(
                  "px-5 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer",
                  isScheduled
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10"
                    : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10 hover:text-white"
                )}
                title={isScheduled ? "Annuler l'enregistrement programmé" : "Programmer l'enregistrement de cette émission"}
              >
                <Disc className={cn("w-5 h-5", isScheduled ? "text-rose-400 fill-rose-400/40 animate-spin-slow" : "text-rose-400")} />
                <span>{isScheduled ? "Programmé" : "Enregistrer"}</span>
              </button>
            )}
            <button 
              onClick={onToggleFavorite}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border cursor-pointer flex-shrink-0",
                isFavorite 
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
              )}
            >
              <Heart className={cn("w-6 h-6", isFavorite && "fill-current")} />
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all cursor-pointer flex-shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SetupScreen({ 
  onAdd, 
  onSample, 
  type, 
  setType,
  canCancel = false,
  onCancel
}: { 
  onAdd: (data: {
    name: string;
    type: 'm3u' | 'xtream' | 'stalker';
    url: string;
    isLocal?: boolean;
    localM3uFileName?: string;
    localM3uContent?: string;
    epgUrl?: string;
    localEpgFileName?: string;
    localEpgContent?: string;
    username?: string;
    password?: string;
  }) => void, 
  onSample: () => void, 
  type: 'm3u' | 'xtream' | 'stalker', 
  setType: (t: 'm3u' | 'xtream' | 'stalker') => void,
  canCancel?: boolean,
  onCancel?: () => void
}) {
  const [playlistName, setPlaylistName] = useState('');
  
  // M3U source mode
  const [m3uMode, setM3uMode] = useState<'url' | 'file'>('url');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uFile, setM3uFile] = useState<{ name: string; content: string; size: string } | null>(null);
  const [isM3uDragging, setIsM3uDragging] = useState(false);

  // EPG source mode
  const [epgMode, setEpgMode] = useState<'url' | 'file'>('url');
  const [m3uEpgUrl, setM3uEpgUrl] = useState('');
  const [epgFile, setEpgFile] = useState<{ name: string; content: string; size: string } | null>(null);
  const [isEpgDragging, setIsEpgDragging] = useState(false);

  // Xtream / Stalker fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showEpgHelper, setShowEpgHelper] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const m3uFileInputRef = useRef<HTMLInputElement>(null);
  const epgFileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleM3uFileSelect = async (file: File) => {
    setErrorMsg(null);
    setIsProcessingFile(true);
    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        setErrorMsg('Le fichier M3U sélectionné semble vide.');
        setIsProcessingFile(false);
        return;
      }
      setM3uFile({
        name: file.name,
        content: text,
        size: formatBytes(file.size)
      });
      // Suggest playlist name if empty
      if (!playlistName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setPlaylistName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.error('Error reading M3U file:', err);
      setErrorMsg('Erreur lors de la lecture du fichier M3U.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleEpgFileSelect = async (file: File) => {
    setErrorMsg(null);
    setIsProcessingFile(true);
    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        setErrorMsg('Le fichier EPG sélectionné semble vide.');
        setIsProcessingFile(false);
        return;
      }
      setEpgFile({
        name: file.name,
        content: text,
        size: formatBytes(file.size)
      });
    } catch (err) {
      console.error('Error reading EPG file:', err);
      setErrorMsg('Erreur lors de la lecture du fichier EPG.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (type === 'm3u') {
      if (m3uMode === 'file') {
        if (!m3uFile) {
          setErrorMsg('Veuillez sélectionner un fichier M3U local.');
          return;
        }
        onAdd({
          name: playlistName.trim() || m3uFile.name,
          type: 'm3u',
          url: `local://${m3uFile.name}`,
          isLocal: true,
          localM3uFileName: m3uFile.name,
          localM3uContent: m3uFile.content,
          epgUrl: epgMode === 'file' && epgFile ? `local://${epgFile.name}` : (epgMode === 'url' && m3uEpgUrl.trim() ? m3uEpgUrl.trim() : undefined),
          localEpgFileName: epgMode === 'file' && epgFile ? epgFile.name : undefined,
          localEpgContent: epgMode === 'file' && epgFile ? epgFile.content : undefined
        });
      } else {
        if (!m3uUrl.trim()) {
          setErrorMsg('Veuillez spécifier une URL de playlist M3U valide.');
          return;
        }
        onAdd({
          name: playlistName.trim() || 'Playlist M3U',
          type: 'm3u',
          url: m3uUrl.trim(),
          isLocal: false,
          epgUrl: epgMode === 'file' && epgFile ? `local://${epgFile.name}` : (epgMode === 'url' && m3uEpgUrl.trim() ? m3uEpgUrl.trim() : undefined),
          localEpgFileName: epgMode === 'file' && epgFile ? epgFile.name : undefined,
          localEpgContent: epgMode === 'file' && epgFile ? epgFile.content : undefined
        });
      }
    } else {
      if (!m3uUrl.trim()) {
        setErrorMsg("Veuillez renseigner l'URL du serveur.");
        return;
      }
      onAdd({
        name: playlistName.trim() || (type === 'xtream' ? 'Xtream Codes' : 'Stalker'),
        type,
        url: m3uUrl.trim(),
        username: username.trim(),
        password: password.trim()
      });
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 flex flex-col items-center justify-start min-h-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[#141414] rounded-3xl p-6 sm:p-10 border border-white/5 shadow-2xl my-auto"
      >
        {canCancel && onCancel && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onCancel}
              type="button"
              className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <VisionLogo size="lg" variant="stacked" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5">Ajouter une Playlist</h2>
          <p className="text-white/40 text-xs sm:text-sm">Connectez une URL ou importez vos fichiers locaux M3U et EPG</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Nom de la Playlist</label>
            <input 
              name="name"
              value={playlistName ?? ''}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="ex: Mon IPTV Premium"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Type de Connexion</label>
            <div className="relative">
              <select 
                name="type"
                value={type ?? 'm3u'}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer text-sm text-white font-medium"
              >
                <option value="m3u" className="bg-[#141414]">M3U Playlist (URL ou Fichier Local) & Guide EPG</option>
                <option value="xtream" className="bg-[#141414]">Xtream Codes API</option>
                <option value="stalker" className="bg-[#141414]">Stalker Portal</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Section Source M3U */}
          {type === 'm3u' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">
                  Source de la Playlist M3U
                </label>
                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setM3uMode('url')}
                    className={cn(
                      "px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium",
                      m3uMode === 'url' ? "bg-emerald-500 text-black shadow font-bold" : "text-white/50 hover:text-white"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Lien URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setM3uMode('file')}
                    className={cn(
                      "px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium",
                      m3uMode === 'file' ? "bg-emerald-500 text-black shadow font-bold" : "text-white/50 hover:text-white"
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Fichier Local</span>
                  </button>
                </div>
              </div>

              {m3uMode === 'url' ? (
                <div className="space-y-1">
                  <input 
                    name="url"
                    value={m3uUrl ?? ''}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u ou .m3u8"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white font-mono placeholder:font-sans placeholder:text-white/30"
                  />
                  <p className="text-[11px] text-white/30 px-1">Lien direct vers votre flux ou fichier M3U/M3U8</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={m3uFileInputRef}
                    type="file"
                    accept=".m3u,.m3u8,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleM3uFileSelect(file);
                    }}
                  />

                  {!m3uFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsM3uDragging(true); }}
                      onDragLeave={() => setIsM3uDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsM3uDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleM3uFileSelect(file);
                      }}
                      onClick={() => m3uFileInputRef.current?.click()}
                      className={cn(
                        "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center",
                        isM3uDragging 
                          ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]" 
                          : "border-white/15 bg-white/[0.02] hover:border-emerald-500/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Glissez-déposez votre fichier M3U ici</p>
                        <p className="text-[11px] text-white/40 mt-0.5">ou cliquez pour parcourir (.m3u, .m3u8)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-300 truncate">{m3uFile.name}</p>
                          <p className="text-[10px] text-white/40">{m3uFile.size} • Fichier prêt à être chargé</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => m3uFileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium rounded-lg transition-colors"
                        >
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => setM3uFile(null)}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          title="Retirer le fichier"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">
                URL du Serveur (Host)
              </label>
              <input 
                name="url"
                value={m3uUrl ?? ''}
                onChange={(e) => setM3uUrl(e.target.value)}
                required
                placeholder="http://server-address.com:8080"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white font-mono"
              />
            </div>
          )}

          {/* Section EPG XMLTV spécifique pour le mode M3U */}
          {type === 'm3u' && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guide TV / EPG (XMLTV)</span>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold px-1.5 py-0.2 rounded-md uppercase">
                    Optionnel
                  </span>
                </label>
                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setEpgMode('url')}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium",
                      epgMode === 'url' ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
                    )}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Lien URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpgMode('file')}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium",
                      epgMode === 'file' ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
                    )}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Fichier Local</span>
                  </button>
                </div>
              </div>

              {epgMode === 'url' ? (
                <div className="relative">
                  <input 
                    name="epgUrl"
                    value={m3uEpgUrl ?? ''}
                    onChange={(e) => setM3uEpgUrl(e.target.value)}
                    placeholder="https://example.com/epg.xml ou .xml.gz"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white font-mono placeholder:font-sans placeholder:text-white/30"
                  />
                  {m3uEpgUrl && (
                    <button
                      type="button"
                      onClick={() => setM3uEpgUrl('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={epgFileInputRef}
                    type="file"
                    accept=".xml,.xmltv,.gz,text/xml,application/xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEpgFileSelect(file);
                    }}
                  />

                  {!epgFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsEpgDragging(true); }}
                      onDragLeave={() => setIsEpgDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsEpgDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleEpgFileSelect(file);
                      }}
                      onClick={() => epgFileInputRef.current?.click()}
                      className={cn(
                        "w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center",
                        isEpgDragging 
                          ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]" 
                          : "border-white/15 bg-white/[0.02] hover:border-emerald-500/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Glissez-déposez votre fichier XMLTV EPG</p>
                        <p className="text-[11px] text-white/40 mt-0.5">ou cliquez pour sélectionner (.xml, .xmltv)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-300 truncate">{epgFile.name}</p>
                          <p className="text-[10px] text-white/40">{epgFile.size} • Guide TV local associé</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => epgFileInputRef.current?.click()}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium rounded-lg transition-colors"
                        >
                          Changer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEpgFile(null)}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          title="Retirer le fichier EPG"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-white/40 px-1">
                <span>Prend en charge les formats XMLTV standard (.xml ou .xmltv)</span>
                <button
                  type="button"
                  onClick={() => setShowEpgHelper(!showEpgHelper)}
                  className="text-white/50 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  <span>{showEpgHelper ? 'Masquer aide' : 'En savoir plus'}</span>
                </button>
              </div>

              {showEpgHelper && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs text-white/70 space-y-1.5 leading-relaxed">
                  <p>
                    <strong className="text-emerald-400">À quoi sert l'EPG ?</strong> Il permet d'afficher la grille des programmes en cours et à venir pour vos chaînes TV dans l'onglet <em>Guide TV</em> et sous le lecteur vidéo.
                  </p>
                  <p className="text-white/50 text-[11px]">
                    Si votre fichier M3U contient déjà un en-tête <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300">url-tvg</code>, il sera détecté automatiquement. Vous pouvez également importer votre propre fichier XMLTV local ou URL.
                  </p>
                </div>
              )}
            </div>
          )}

          {(type === 'xtream' || type === 'stalker') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Nom d'utilisateur</label>
                <input 
                  name="username"
                  value={username ?? ''}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Identifiant"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Mot de passe</label>
                <input 
                  name="password"
                  type="password"
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-white"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-3">
            <button 
              type="submit"
              disabled={isProcessingFile}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 sm:py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isProcessingFile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement du fichier...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Enregistrer & Charger la Playlist</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onSample}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tester avec la Playlist Démo (HLS)</span>
            </button>
          </div>
        </form>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/80">M3U</div>
            <span className="text-[9px] text-white/40 font-medium">Local & URL</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/80">EPG</div>
            <span className="text-[9px] text-white/40 font-medium">XMLTV Local</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/80">XC</div>
            <span className="text-[9px] text-white/40 font-medium">Xtream API</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SettingsScreen({ 
  tvMode = true,
  onToggleTvMode,
  currentLang = 'fr',
  onLanguageChange,
  playerType, 
  onPlayerTypeChange,
  playerChoice = 'internal',
  onPlayerChoiceChange,
  playlists = [],
  activePlaylist = null,
  onSelectPlaylist,
  onUpdatePlaylistEpg,
  onUpdateLocalM3uFile,
  onDeletePlaylist,
  onAddPlaylist,
  userAgentMode = 'auto',
  onUserAgentModeChange,
  customUserAgent = '',
  onCustomUserAgentChange,
  streamProxyMode = 'auto',
  onStreamProxyModeChange
}: { 
  tvMode?: boolean,
  onToggleTvMode?: () => void,
  currentLang?: Language,
  onLanguageChange?: (lang: Language) => void,
  playerType?: 'internal' | 'external', 
  onPlayerTypeChange?: (type: 'internal' | 'external') => void,
  playerChoice?: PlayerChoice,
  onPlayerChoiceChange?: (choice: PlayerChoice) => void,
  playlists?: IPTVPlaylist[],
  activePlaylist?: IPTVPlaylist | null,
  onSelectPlaylist?: (p: IPTVPlaylist) => void,
  onUpdatePlaylistEpg?: (playlistId: string, epgUrl?: string, localEpgFile?: { name: string; content: string }) => void,
  onUpdateLocalM3uFile?: (playlistId: string, fileName: string, content: string) => void,
  onDeletePlaylist?: (playlistId: string) => void,
  onAddPlaylist?: () => void,
  userAgentMode?: UserAgentMode,
  onUserAgentModeChange?: (mode: UserAgentMode) => void,
  customUserAgent?: string,
  onCustomUserAgentChange?: (ua: string) => void,
  streamProxyMode?: StreamProxyMode,
  onStreamProxyModeChange?: (mode: StreamProxyMode) => void
}) {
  const t = translations[currentLang] || translations.fr;

  const [editingEpgPlaylistId, setEditingEpgPlaylistId] = useState<string | null>(null);
  const [editingEpgMode, setEditingEpgMode] = useState<'url' | 'file'>('url');
  const [editingEpgUrl, setEditingEpgUrl] = useState('');
  const [editingEpgFile, setEditingEpgFile] = useState<{ name: string; content: string } | null>(null);

  const localM3uInputRef = useRef<HTMLInputElement>(null);
  const [updatingM3uPlaylistId, setUpdatingM3uPlaylistId] = useState<string | null>(null);
  const [copiedUa, setCopiedUa] = useState(false);

  const effectiveCurrentUa = getEffectiveUserAgent(userAgentMode, customUserAgent, undefined, activePlaylist);

  const handleCopyUa = () => {
    navigator.clipboard.writeText(effectiveCurrentUa);
    setCopiedUa(true);
    setTimeout(() => setCopiedUa(false), 2000);
  };

  const [isRefreshingEpgId, setIsRefreshingEpgId] = useState<string | null>(null);

  const startEditEpg = (p: IPTVPlaylist) => {
    setEditingEpgPlaylistId(p.id);
    const isLocal = p.epgUrl?.startsWith('local://') || !!p.localEpgFileName;
    setEditingEpgMode(isLocal ? 'file' : 'url');
    setEditingEpgUrl(isLocal ? '' : (p.epgUrl || ''));
    setEditingEpgFile(null);
  };

  const saveEditEpg = (p: IPTVPlaylist) => {
    if (onUpdatePlaylistEpg) {
      if (editingEpgMode === 'file') {
        if (editingEpgFile) {
          onUpdatePlaylistEpg(p.id, undefined, editingEpgFile);
        }
      } else {
        onUpdatePlaylistEpg(p.id, editingEpgUrl.trim() || undefined);
      }
    }
    setEditingEpgPlaylistId(null);
  };

  const removeEditEpg = (p: IPTVPlaylist) => {
    if (onUpdatePlaylistEpg) {
      onUpdatePlaylistEpg(p.id, undefined, undefined);
    }
    setEditingEpgPlaylistId(null);
  };

  const forceRefreshEpg = async (p: IPTVPlaylist) => {
    setIsRefreshingEpgId(p.id);
    try {
      const { clearXMLTVCache } = await import('./services/xmltvService');
      clearXMLTVCache();
      if (onUpdatePlaylistEpg && p.epgUrl) {
        onUpdatePlaylistEpg(p.id, p.epgUrl, undefined);
      }
    } finally {
      setTimeout(() => setIsRefreshingEpgId(null), 800);
    }
  };

  const handleM3uFileUpdate = async (playlistId: string, file: File) => {
    try {
      const text = await file.text();
      if (text && onUpdateLocalM3uFile) {
        onUpdateLocalM3uFile(playlistId, file.name, text);
      }
    } catch (err) {
      console.error('Error updating local M3U file:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Settings className="text-black w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.settingsTitle}</h1>
          <p className="text-white/40 text-xs sm:text-sm">{t.settingsSubtitle}</p>
        </div>
      </div>

      {/* Hidden file input for M3U file update */}
      <input 
        ref={localM3uInputRef}
        type="file" 
        accept=".m3u,.m3u8,text/plain" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && updatingM3uPlaylistId) {
            handleM3uFileUpdate(updatingM3uPlaylistId, file);
            setUpdatingM3uPlaylistId(null);
          }
        }}
      />

      <div className="space-y-6">
        {/* SECTION INSTALLATION FIRESTICK / ANDROID / PWA */}
        <PWAInstallButton variant="settings" />

        {/* SECTION LANGUE & INTERNATIONALISATION (6 MARCHÉS STRATÉGIQUES) */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{t.languageSectionTitle}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase bg-emerald-500 text-black">
                    6 Marchés
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  {t.languageSectionDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <LanguageSelector
              currentLang={currentLang}
              onLanguageChange={onLanguageChange || (() => {})}
              variant="full"
            />
          </div>
        </div>

        {/* Playlists & EPG Management Card */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Tv className="w-5 h-5 text-emerald-500" />
                Playlists & Guides EPG (XMLTV)
              </h3>
              <p className="text-xs text-white/40 mt-1">
                Visualisez vos playlists enregistrées, importez vos fichiers locaux M3U et configurez vos guides TV XMLTV.
              </p>
            </div>
            {onAddPlaylist && (
              <button
                onClick={onAddPlaylist}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Ajouter une Playlist</span>
              </button>
            )}
          </div>

          {playlists.length === 0 ? (
            <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
              <p className="text-xs text-white/40">Aucune playlist configurée.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map((pl) => {
                const isActive = activePlaylist?.id === pl.id;
                const isEditingThisEpg = editingEpgPlaylistId === pl.id;
                const isLocalM3u = pl.isLocal || pl.url?.startsWith('local://');

                return (
                  <div
                    key={pl.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      isActive 
                        ? "bg-white/[0.04] border-emerald-500/40 shadow-sm" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/15"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full flex-shrink-0",
                          isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-white/20"
                        )} />
                        <span className="font-bold text-sm text-white">{pl.name}</span>
                        <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-black uppercase rounded-md">
                          {pl.type.toUpperCase()}
                        </span>
                        {isLocalM3u && (
                          <span className="px-2 py-0.5 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[10px] font-bold rounded-md flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            <span>Fichier local</span>
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isLocalM3u && (
                          <button
                            onClick={() => {
                              setUpdatingM3uPlaylistId(pl.id);
                              localM3uInputRef.current?.click();
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                            title="Recharger un fichier M3U à jour"
                          >
                            <FileUp className="w-3.5 h-3.5 text-sky-400" />
                            <span>Mettre à jour fichier</span>
                          </button>
                        )}
                        {!isActive && onSelectPlaylist && (
                          <button
                            onClick={() => onSelectPlaylist(pl)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/80 rounded-lg text-xs font-semibold transition-all"
                          >
                            Charger
                          </button>
                        )}
                        {onDeletePlaylist && (
                          <button
                            onClick={() => onDeletePlaylist(pl.id)}
                            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Supprimer la playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-white/50 font-mono truncate mb-2">
                      {isLocalM3u ? `Fichier stocké localement (${pl.localM3uFileName || pl.name})` : pl.url}
                    </div>

                    {/* EPG section for playlists */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      {isEditingThisEpg ? (
                        <div className="space-y-3 bg-white/[0.02] p-3 rounded-xl border border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Guide TV / EPG (XMLTV)</span>
                            </label>
                            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setEditingEpgMode('url')}
                                className={cn(
                                  "px-2 py-0.5 rounded transition-all",
                                  editingEpgMode === 'url' ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
                                )}
                              >
                                Lien URL
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingEpgMode('file')}
                                className={cn(
                                  "px-2 py-0.5 rounded transition-all",
                                  editingEpgMode === 'file' ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
                                )}
                              >
                                Fichier Local
                              </button>
                            </div>
                          </div>

                          {editingEpgMode === 'url' ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingEpgUrl ?? ''}
                                onChange={(e) => setEditingEpgUrl(e.target.value)}
                                placeholder="https://example.com/epg.xml ou .xmltv"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                              />
                              <div className="flex items-center justify-between gap-2 pt-1">
                                {(pl.epgUrl || pl.localEpgFileName) ? (
                                  <button
                                    type="button"
                                    onClick={() => removeEditEpg(pl)}
                                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-medium transition-colors"
                                    title="Supprimer le guide XMLTV"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Supprimer le guide</span>
                                  </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingEpgPlaylistId(null)}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs transition-all"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEditEpg(pl)}
                                    className="px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-lg text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10"
                                  >
                                    Enregistrer le lien
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-black/20 rounded-xl p-3 text-center cursor-pointer transition-colors">
                                <input
                                  type="file"
                                  accept=".xml,.xmltv,.gz,text/xml"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const text = await file.text();
                                      setEditingEpgFile({ name: file.name, content: text });
                                    }
                                  }}
                                />
                                {editingEpgFile ? (
                                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                                    <FileCode className="w-4 h-4" />
                                    <span>{editingEpgFile.name} sélectionné</span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-white/60">
                                    <span>Cliquez pour choisir un fichier EPG local (.xml, .xmltv)</span>
                                  </div>
                                )}
                              </label>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                {(pl.epgUrl || pl.localEpgFileName) ? (
                                  <button
                                    type="button"
                                    onClick={() => removeEditEpg(pl)}
                                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-medium transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Supprimer</span>
                                  </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingEpgPlaylistId(null)}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs transition-all"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEditEpg(pl)}
                                    disabled={!editingEpgFile}
                                    className="px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-lg text-xs hover:bg-emerald-400 transition-all disabled:opacity-40"
                                  >
                                    Enregistrer le fichier
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-xs text-white/70 font-medium">Guide EPG :</span>
                            {pl.localEpgFileName ? (
                              <span className="text-xs text-emerald-400 font-mono truncate max-w-xs sm:max-w-md flex items-center gap-1">
                                <FileCode className="w-3 h-3" />
                                <span>{pl.localEpgFileName} (Local)</span>
                              </span>
                            ) : pl.epgUrl ? (
                              <span className="text-xs text-emerald-400 font-mono truncate max-w-xs sm:max-w-md" title={pl.epgUrl}>
                                {pl.epgUrl}
                              </span>
                            ) : pl.type === 'xtream' ? (
                              <span className="text-xs text-white/50 italic">Xtream EPG natif (ou ajoutez un XMLTV externe)</span>
                            ) : (
                              <span className="text-xs text-white/30 italic">Aucun guide EPG configuré</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {pl.epgUrl && (
                              <button
                                type="button"
                                onClick={() => forceRefreshEpg(pl)}
                                disabled={isRefreshingEpgId === pl.id}
                                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition-all"
                                title="Vider le cache et re-télécharger l'EPG"
                              >
                                <RefreshCw className={cn("w-3 h-3 text-emerald-400", isRefreshingEpgId === pl.id && "animate-spin")} />
                                <span>Actualiser</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditEpg(pl)}
                              className="text-[11px] text-emerald-400 hover:underline font-semibold"
                            >
                              {pl.epgUrl || pl.localEpgFileName ? "Modifier l'EPG" : "+ Configurer XMLTV"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User-Agent & Browser Emulation Card */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              Émulation Navigateur Web & User-Agent
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold w-fit">
              <Check className="w-3.5 h-3.5" />
              Option 2 par défaut active
            </span>
          </div>
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            Pour assurer la compatibilité avec tous les fournisseurs IPTV et contourner les blocages de serveurs exigeant un navigateur web ou un lecteur particulier, configurez l'en-tête HTTP <code className="bg-black/50 text-emerald-400 px-1.5 py-0.5 rounded text-xs">User-Agent</code>.
          </p>

          {/* Explanation Callout: Option 1 vs Option 2 */}
          <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <p className="text-xs text-white/70 leading-relaxed">
                <strong className="text-emerald-400 font-semibold">Option 2 (Sélectionnée par défaut) :</strong> Mode Automatique & Hybride. Respecte en priorité les directives spécifiques de votre fichier M3U (<code className="text-white/90">#EXTVLCOPT:http-user-agent</code>, <code className="text-white/90">user-agent=...</code>), et bascule automatiquement sur l'émulation d'un <span className="text-white font-medium">navigateur Chrome Desktop</span> pour tous les autres flux.
              </p>
            </div>
            <div className="flex items-start gap-3 pt-2 border-t border-white/5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white/70 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <p className="text-xs text-white/70 leading-relaxed">
                <strong className="text-white font-semibold">Option 1 (Forcer un profil) :</strong> Sélectionnez manuellement un navigateur (Chrome, Safari macOS/iOS, Firefox) ou un lecteur IPTV réputé (VLC, TiviMate, Smart IPTV, ou sur-mesure) pour forcer son utilisation sur l'ensemble de vos flux.
              </p>
            </div>
          </div>

          {/* User-Agent Preset Selector Grid */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
              Profil User-Agent actif
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {USER_AGENT_PRESETS.map((preset) => {
                const isSelected = userAgentMode === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onUserAgentModeChange?.(preset.id)}
                    className={cn(
                      "p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 min-w-0 overflow-hidden",
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5",
                          isSelected ? "border-emerald-500 bg-emerald-500" : "border-white/20"
                        )}>
                          {isSelected && <div className="w-1 h-1 bg-black rounded-full" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white block leading-snug break-words">
                            {preset.name}
                          </span>
                        </div>
                      </div>
                      {preset.id === 'auto' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold uppercase flex-shrink-0">
                          Défaut
                        </span>
                      ) : preset.badge ? (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/50 text-[9px] font-medium flex-shrink-0">
                          {preset.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed break-words">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom User Agent Input if mode === 'custom' */}
          {userAgentMode === 'custom' && (
            <div className="mb-6 p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Chaîne User-Agent personnalisée
                </label>
                <button
                  onClick={() => onCustomUserAgentChange?.(USER_AGENT_PRESETS.find(p => p.id === 'chrome')?.value || '')}
                  className="text-[11px] text-white/50 hover:text-emerald-400 transition-colors underline"
                >
                  Charger profil Chrome par défaut
                </button>
              </div>
              <textarea
                value={customUserAgent}
                onChange={(e) => onCustomUserAgentChange?.(e.target.value)}
                placeholder="Exemple : Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
                rows={2}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/90 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          )}

          {/* Live Preview of Sent Header */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                En-tête User-Agent envoyé aux serveurs IPTV :
              </span>
              <button
                onClick={handleCopyUa}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                title="Copier le User-Agent"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedUa ? "Copié !" : "Copier"}</span>
              </button>
            </div>
            <div className="bg-[#111] p-2.5 rounded-lg border border-white/5 font-mono text-xs text-emerald-400/90 break-all select-all">
              {effectiveCurrentUa}
            </div>
          </div>

          {/* Stream Proxy Mode Selector */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
              Mode de Relais des Flux Vidéo (Proxy Serveur & Contournement CORS)
            </label>
            <p className="text-xs text-white/40 mb-4">
              Le proxy serveur permet d'injecter fidèlement le User-Agent émulé et de réécrire les manifests HLS/M3U8 tout en contournant les restrictions de sécurité CORS du navigateur.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => onStreamProxyModeChange?.('auto')}
                className={cn(
                  "p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5",
                  streamProxyMode === 'auto'
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Automatique (Recommandé)</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">Auto</span>
                </div>
                <p className="text-[11px] text-white/40 leading-tight">
                  Tente la lecture directe et bascule instantanément sur le proxy émulé en cas de blocage CORS/403.
                </p>
              </div>

              <div
                onClick={() => onStreamProxyModeChange?.('always')}
                className={cn(
                  "p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5",
                  streamProxyMode === 'always'
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Toujours relayer (Proxy 100%)</span>
                </div>
                <p className="text-[11px] text-white/40 leading-tight">
                  Achemine 100% des segments et manifests via le proxy serveur avec injection du User-Agent.
                </p>
              </div>

              <div
                onClick={() => onStreamProxyModeChange?.('direct')}
                className={cn(
                  "p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5",
                  streamProxyMode === 'direct'
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Direct uniquement</span>
                </div>
                <p className="text-[11px] text-white/40 leading-tight">
                  Connexion directe du navigateur vers le flux sans passer par le proxy backend.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Player Selection Card */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-500" />
                Lecteur Vidéo & Lecteurs Externes
              </h3>
              <p className="text-xs sm:text-sm text-white/40 mt-1">
                Choisissez votre lecteur par défaut. Vous pouvez utiliser le lecteur web intégré ou lancer vos flux directement dans VLC, ExoPlayer, MX Player, PotPlayer, etc.
              </p>
            </div>
          </div>

          {/* Practical Info Banner regarding Instant App Launch vs File Download */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/80 space-y-1">
              <p className="font-semibold text-emerald-300">
                Lancement direct instantané (sans téléchargement de fichier) :
              </p>
              <p className="text-white/60 leading-relaxed">
                VISION utilise les protocoles d'application natifs (<code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">vlc://</code>, <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">potplayer://</code>, <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">iina://</code>) et les <strong>Intents Android</strong> pour ouvrir instantanément vos flux sans avoir à télécharger ni enregistrer de fichier <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">.m3u</code>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Integrated Web Player */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('internal');
                onPlayerTypeChange?.('internal');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                (playerChoice === 'internal' || (!playerChoice && playerType === 'internal'))
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                (playerChoice === 'internal' || (!playerChoice && playerType === 'internal')) ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {(playerChoice === 'internal' || (!playerChoice && playerType === 'internal')) && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">Lecteur Web Intégré (HLS.js)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Par Défaut</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Lecteur vidéo natif dans l'application. Lance la vidéo immédiatement et sans interruption dans votre navigateur avec zapping direct CH+/CH-, Guide EPG et résumés cinéma.
                </p>
              </div>
            </div>

            {/* 2. VLC Media Player */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('vlc');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'vlc'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'vlc' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'vlc' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">VLC Media Player</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">Windows, Mac, Mobile</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Ouvre directement VLC via le protocole <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">vlc://</code> sur ordinateur ou via l'Intent natif VLC sur Android.
                </p>
              </div>
            </div>

            {/* 3. ExoPlayer / Android Intent */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('exoplayer');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'exoplayer'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'exoplayer' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'exoplayer' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">ExoPlayer / Sélecteur Android</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">Android & Smart TV</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Ouvre le sélecteur vidéo natif Android ou votre lecteur configuré (ExoPlayer, Nova Video Player, Just Player, Kodi).
                </p>
              </div>
            </div>

            {/* 4. MX Player */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('mxplayer');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'mxplayer'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'mxplayer' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'mxplayer' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">MX Player (Free / Pro)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">Android & iOS</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Idéal pour le décodage matériel avancé HW+ et les flux haute fidélité sur smartphones et boîtiers Android.
                </p>
              </div>
            </div>

            {/* 5. PotPlayer */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('potplayer');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'potplayer'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'potplayer' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'potplayer' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">PotPlayer</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">Windows</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Lancement direct via le protocole <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">potplayer://</code> pour les utilisateurs Windows.
                </p>
              </div>
            </div>

            {/* 6. IINA / MPV */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('iina');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'iina'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'iina' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'iina' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">IINA Media Player</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">macOS</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Le lecteur vidéo moderne conçu pour macOS avec intégration système native via <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">iina://</code>.
                </p>
              </div>
            </div>

            {/* 7. MPV Player */}
            <div 
              onClick={() => {
                onPlayerChoiceChange?.('mpv');
                onPlayerTypeChange?.('external');
              }}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden",
                playerChoice === 'mpv'
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center mt-1 flex-shrink-0",
                playerChoice === 'mpv' ? "border-emerald-500 bg-emerald-500" : "border-white/20"
              )}>
                {playerChoice === 'mpv' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">MPV Player</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Linux / Mac / Windows</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Lecteur ultra-léger et minimaliste avec décodage GPU haute vitesse via <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">mpv://</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION SMART TV & TÉLÉCOMMANDE D-PAD */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Navigation Télécommande Smart TV & D-Pad</h3>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-full font-mono uppercase",
                    tvMode ? "bg-emerald-500 text-black" : "bg-white/10 text-white/50"
                  )}>
                    {tvMode ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/60">
                  Déplacez-vous fluidement de haut en bas et de gauche à droite sur grand écran avec n'importe quelle télécommande TV (Samsung Tizen, LG webOS, Android TV, Fire TV, Clavier).
                </p>
              </div>
            </div>

            <button
              onClick={onToggleTvMode}
              data-tv-focusable="true"
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border self-start sm:self-auto cursor-pointer",
                tvMode
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 hover:bg-white/15 text-white border-white/20"
              )}
            >
              <Tv className="w-4 h-4" />
              <span>{tvMode ? 'Désactiver le Mode TV' : 'Activer le Mode TV'}</span>
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Guide des touches de télécommande */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* D-Pad */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base font-bold flex-shrink-0">
                  ↕️↔️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Flèches D-Pad (Haut / Bas / Gauche / Droite)</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Navigation spatiale 2D automatique vers l'élément visible le plus proche (chaînes, films, catégories, boutons).
                  </p>
                </div>
              </div>

              {/* OK / Enter */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-mono font-black flex-shrink-0">
                  OK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Touche OK / Entrée / Espace</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Lancer la chaîne sélectionnée, ouvrir une catégorie ou valider une action sans utiliser de souris.
                  </p>
                </div>
              </div>

              {/* Return / Back */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-mono font-black flex-shrink-0">
                  BACK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Touche Retour / Escape</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Fermer le lecteur vidéo plein écran, réduire en Picture-in-Picture ou revenir à l'écran précédent.
                  </p>
                </div>
              </div>

              {/* Numeric Pad */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-mono font-black flex-shrink-0">
                  0-9
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pavé Numérique (Zapping Direct)</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Tapez directement le numéro de la chaîne (ex: 1, 12, 105) sur la télécommande pour zapper instantanément.
                  </p>
                </div>
              </div>

              {/* Red & Green Buttons */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-xs font-mono font-black flex-shrink-0">
                  🔴🟢
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Touches Rouge & Verte</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    🔴 <strong>Rouge</strong> : Tiroir des Catégories / Groupes<br />
                    🟢 <strong>Verte</strong> : Accès direct au Guide TV (EPG)
                  </p>
                </div>
              </div>

              {/* Yellow & Blue Buttons */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-mono font-black flex-shrink-0">
                  🟡🔵
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Touches Jaune & Bleue</h4>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    🟡 <strong>Jaune</strong> : Afficher les Favoris / Ajouter<br />
                    🔵 <strong>Bleue</strong> : Ouvrir les Paramètres
                  </p>
                </div>
              </div>
            </div>

            {/* Compatibilité télécommandes */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4 text-xs text-white/70">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span>
                <strong>100% Plug-and-Play :</strong> Compatible nativement avec les télécommandes Samsung Smart TV (Tizen), LG Magic Remote (webOS), télécommandes Bluetooth Android TV / Google TV, Fire TV Stick, Nvidia Shield, Apple TV et claviers sans fil.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ 
  channel, 
  playlist,
  channels = [],
  lastChannel = null,
  onSelectChannel,
  onClose, 
  playerType = 'internal', 
  playerChoice = 'internal',
  onPlayerChoiceChange,
  onSelectProgram, 
  isFavorite, 
  onToggleFavorite,
  isMovie = false,
  userAgentMode = 'auto',
  customUserAgent = '',
  streamProxyMode = 'auto'
}: { 
  channel: IPTVChannel, 
  playlist?: IPTVPlaylist | null,
  channels?: IPTVChannel[],
  lastChannel?: IPTVChannel | null,
  onSelectChannel?: (c: IPTVChannel) => void,
  onClose: () => void, 
  playerType?: 'internal' | 'external', 
  playerChoice?: PlayerChoice,
  onPlayerChoiceChange?: (choice: PlayerChoice) => void,
  onSelectProgram?: (p: any) => void, 
  isFavorite?: boolean, 
  onToggleFavorite?: () => void,
  isMovie?: boolean,
  userAgentMode?: UserAgentMode,
  customUserAgent?: string,
  streamProxyMode?: StreamProxyMode
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [epgListings, setEpgListings] = useState<any[] | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [osdChannel, setOsdChannel] = useState<IPTVChannel | null>(null);
  const [copiedStreamUrl, setCopiedStreamUrl] = useState(false);
  const [hasTriggeredLaunch, setHasTriggeredLaunch] = useState(false);
  const [temporaryInternalPlay, setTemporaryInternalPlay] = useState(false);
  const [activeExternalPlayer, setActiveExternalPlayer] = useState<ExternalPlayerId>(() => {
    if (playerChoice && playerChoice !== 'internal' && playerChoice !== 'prompt') {
      return playerChoice as ExternalPlayerId;
    }
    return 'vlc';
  });
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback states for Rewind / Play-Pause / Forward
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackToast, setPlaybackToast] = useState<{ type: 'play' | 'pause' | 'rewind' | 'forward'; text: string } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showPlaybackToast = useCallback((type: 'play' | 'pause' | 'rewind' | 'forward', text: string) => {
    setPlaybackToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setPlaybackToast(null);
    }, 1200);
  }, []);

  // 5-second auto-hide timer for VOD controls & description
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimer, channel.url]);

  // Effective User-Agent for this channel and playlist
  const effectiveUa = useMemo(() => {
    return getEffectiveUserAgent(userAgentMode, customUserAgent, channel, playlist);
  }, [userAgentMode, customUserAgent, channel, playlist]);

  // Dynamic proxy control for active playback
  const [isUsingProxy, setIsUsingProxy] = useState(streamProxyMode === 'always');

  useEffect(() => {
    setIsUsingProxy(streamProxyMode === 'always');
  }, [streamProxyMode, channel.url]);

  const getProxiedUrl = (rawUrl: string) => {
    let proxied = `/api/stream?url=${encodeURIComponent(rawUrl)}&ua=${encodeURIComponent(effectiveUa)}`;
    if (channel.httpReferrer) {
      proxied += `&referer=${encodeURIComponent(channel.httpReferrer)}`;
    }
    return proxied;
  };

  // Movie synopsis & details state
  const [movieInfo, setMovieInfo] = useState<TmdbMovieInfo | null>(null);
  const [isLoadingMovieInfo, setIsLoadingMovieInfo] = useState(false);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  // Detect whether current playing item is a movie / VOD
  const isMovieContent = useMemo(() => {
    if (isMovie) return true;
    const group = (channel.group || '').toLowerCase();
    if (
      group.includes('vod') ||
      group.includes('film') ||
      group.includes('movie') ||
      group.includes('cinema') ||
      group.includes('cinéma') ||
      group.includes('série') ||
      group.includes('serie') ||
      group.includes('box office') ||
      group.includes('animation')
    ) {
      return true;
    }
    const url = (channel.url || '').toLowerCase();
    if (
      url.includes('/movie/') ||
      url.includes('/series/') ||
      url.endsWith('.mp4') ||
      url.endsWith('.mkv') ||
      url.endsWith('.avi')
    ) {
      return true;
    }
    return false;
  }, [isMovie, channel]);

  // Fetch TMDB synopsis whenever a movie is loaded
  useEffect(() => {
    let isMounted = true;
    if (isMovieContent && channel.name) {
      setIsLoadingMovieInfo(true);
      fetchTmdbMovieInfo(channel.name)
        .then((data) => {
          if (isMounted) {
            setMovieInfo(data);
            setIsLoadingMovieInfo(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsLoadingMovieInfo(false);
          }
        });
    } else {
      setMovieInfo(null);
      setIsLoadingMovieInfo(false);
    }
    return () => {
      isMounted = false;
    };
  }, [channel.name, isMovieContent]);

  // Current channel index in active playlist
  const currentIndex = useMemo(() => {
    if (!channels || channels.length === 0) return -1;
    return channels.findIndex(c => c.id === channel.id || (c.url && c.url === channel.url));
  }, [channels, channel]);

  const prevChannel = useMemo(() => {
    if (!channels || channels.length <= 1) return null;
    if (currentIndex === -1) return channels[channels.length - 1];
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : channels.length - 1;
    return channels[prevIdx];
  }, [channels, currentIndex]);

  const nextChannel = useMemo(() => {
    if (!channels || channels.length <= 1) return null;
    if (currentIndex === -1) return channels[0];
    const nextIdx = currentIndex < channels.length - 1 ? currentIndex + 1 : 0;
    return channels[nextIdx];
  }, [channels, currentIndex]);

  const triggerOsd = (ch: IPTVChannel) => {
    setOsdChannel(ch);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setOsdChannel(null);
    }, 3000);
  };

  const handlePrevChannel = () => {
    if (prevChannel && onSelectChannel) {
      triggerOsd(prevChannel);
      onSelectChannel(prevChannel);
    }
  };

  const handleNextChannel = () => {
    if (nextChannel && onSelectChannel) {
      triggerOsd(nextChannel);
      onSelectChannel(nextChannel);
    }
  };

  const handleLastChannel = () => {
    if (lastChannel && onSelectChannel) {
      triggerOsd(lastChannel);
      onSelectChannel(lastChannel);
    }
  };

  // Rewind, Play/Pause, Forward handlers
  const handleTogglePlayPause = useCallback(() => {
    resetControlsTimer();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => {
        setIsPlaying(true);
        showPlaybackToast('play', 'Lecture');
      }).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      showPlaybackToast('pause', 'Pause');
    }
  }, [resetControlsTimer, showPlaybackToast]);

  const handleRewind = useCallback((seconds = 10) => {
    resetControlsTimer();
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, (v.currentTime || 0) - seconds);
    v.currentTime = newTime;
    setCurrentTime(newTime);
    showPlaybackToast('rewind', `-${seconds}s (${formatTime(newTime)})`);
  }, [resetControlsTimer, showPlaybackToast]);

  const handleForward = useCallback((seconds = 10) => {
    resetControlsTimer();
    const v = videoRef.current;
    if (!v) return;
    const maxTime = v.duration && !isNaN(v.duration) && v.duration > 0 ? v.duration : Infinity;
    const newTime = Math.min(maxTime, (v.currentTime || 0) + seconds);
    v.currentTime = newTime;
    setCurrentTime(newTime);
    showPlaybackToast('forward', `+${seconds}s (${formatTime(newTime)})`);
  }, [resetControlsTimer, showPlaybackToast]);

  const handleSeek = (newTime: number) => {
    resetControlsTimer();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Keyboard & TV Remote navigation: Rewind (Left/J), Forward (Right/L), Play/Pause (Space/K/P), Channels (Up/Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      const code = e.keyCode || e.which;
      const key = e.key;

      if (key === ' ' || key === 'k' || key === 'K' || key === 'p' || key === 'P' || key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause' || code === 179 || code === 19) {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (key === 'ArrowLeft' || key === 'j' || key === 'J' || key === 'MediaTrackPrevious' || key === 'SeekBackward' || code === 412 || code === 227 || code === 177) {
        e.preventDefault();
        handleRewind(10);
      } else if (key === 'ArrowRight' || key === 'l' || key === 'L' || key === 'MediaTrackNext' || key === 'SeekForward' || code === 417 || code === 228 || code === 176) {
        e.preventDefault();
        handleForward(10);
      } else if (key === 'ArrowUp' || key === 'PageUp' || key === 'w' || key === 'W' || key === 'ChannelUp' || code === 427) {
        e.preventDefault();
        handlePrevChannel();
      } else if (key === 'ArrowDown' || key === 'PageDown' || key === 's' || key === 'S' || key === 'ChannelDown' || code === 428) {
        e.preventDefault();
        handleNextChannel();
      } else if (key === 'Backspace' || key === 'r' || key === 'R' || key === '0') {
        e.preventDefault();
        handleLastChannel();
      } else if (
        key === 'Escape' ||
        key === 'Back' ||
        key === 'GoBack' ||
        key === 'BrowserBack' ||
        code === 10009 ||
        code === 461
      ) {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChannel, nextChannel, lastChannel, onSelectChannel, onClose, handleTogglePlayPause, handleRewind, handleForward, resetControlsTimer]);

  // Update clock every 30 seconds for live progress
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real EPG for XMLTV playlists or Xtream API playlists
  useEffect(() => {
    let isSubscribed = true;
    if (playlist && channel.id) {
      if (playlist.epgUrl) {
        import('./services/xmltvService').then(({ XMLTVService }) => {
          const service = new XMLTVService(playlist.epgUrl!);
          service.loadEPG().then(({ programmesByChannel }) => {
            if (isSubscribed) {
              const progs = XMLTVService.findProgramsForChannel(channel, programmesByChannel);
              if (progs && progs.length > 0) {
                setEpgListings(progs.map(p => ({
                  title: p.title,
                  desc: p.desc,
                  startTimestamp: p.startTimestamp,
                  endTimestamp: p.endTimestamp,
                  category: p.category
                })));
              }
            }
          }).catch((err) => console.warn('Could not fetch XMLTV player EPG:', err));
        });
      } else if (playlist.type === 'xtream') {
        import('./services/xtreamService').then(({ XtreamService }) => {
          const service = new XtreamService(playlist);
          service.getShortEpg(channel.id)
            .then((listings) => {
              if (isSubscribed && listings && listings.length > 0) {
                setEpgListings(listings);
              }
            })
            .catch((err) => console.warn('Could not fetch player short EPG:', err));
        });
      }
    }
    return () => {
      isSubscribed = false;
    };
  }, [playlist, channel.id, channel.epgId, channel.name]);

  // Compute live current & next program
  const { currentProgram, nextProgram } = useMemo(() => {
    const now = nowTimestamp;

    if (epgListings && epgListings.length > 0) {
      const current = epgListings.find(item => item.startTimestamp <= now && item.endTimestamp > now);
      const currentIndex = current ? epgListings.indexOf(current) : -1;
      const next = currentIndex !== -1 && currentIndex + 1 < epgListings.length 
        ? epgListings[currentIndex + 1] 
        : epgListings.find(item => item.startTimestamp >= now);

      if (current) {
        const duration = Math.max(1, current.endTimestamp - current.startTimestamp);
        const elapsed = Math.max(0, now - current.startTimestamp);
        const progressPercent = Math.min(100, Math.max(5, Math.round((elapsed / duration) * 100)));

        const currProg = {
          title: fixUtf8(current.title) || `${channel.name} - Direct`,
          description: fixUtf8(current.desc) || "Retrouvez en direct la diffusion continue de vos émissions, reportages et divertissements.",
          start: new Date(current.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          stop: new Date(current.endTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          progressPercent,
          isReal: true,
          category: channel.group || "En direct"
        };

        const nextProg = next ? {
          title: fixUtf8(next.title) || "Programme à venir",
          description: fixUtf8(next.desc) || "La suite de la programmation de votre chaîne.",
          start: new Date(next.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          stop: new Date(next.endTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          isReal: true,
          category: channel.group || "À suivre"
        } : {
          title: "Programme à venir",
          description: "La suite de vos émissions et divertissements en direct.",
          start: currProg.stop,
          stop: `${(new Date().getHours() + 2) % 24}:00`,
          isReal: false,
          category: channel.group || "À suivre"
        };

        return { currentProgram: currProg, nextProgram: nextProg };
      }
    }

    // Dynamic realistic mock program based on time and category
    const nowDate = new Date(now);
    const currHour = nowDate.getHours();
    const currMinute = nowDate.getMinutes();

    const titlesByGroup: Record<string, string[]> = {
      sport: ["Grand Direct Sport - Match & Débats", "Le Journal des Sports & Résumés", "Multiplex Live & Analyses"],
      cinema: ["Soirée Grand Cinéma", "Film & Action en Continu", "Le Film du Soir"],
      news: ["Le Journal Télévisé - Édition Spéciale", "Le Grand Débat & Actualités", "Flash Info & Décryptage Mondial"],
      music: ["Hit Mix & Clips Live", "Le Grand Concert Live", "Top Music Non-Stop"]
    };

    const groupLower = (channel.group || '').toLowerCase();
    let themeTitles = ["Programme en direct - Les Temps Forts", "Magazine & Découverte", "Grande Soirée Événement"];
    if (groupLower.includes('sport')) themeTitles = titlesByGroup.sport;
    else if (groupLower.includes('cin') || groupLower.includes('mov') || groupLower.includes('film')) themeTitles = titlesByGroup.cinema;
    else if (groupLower.includes('news') || groupLower.includes('info')) themeTitles = titlesByGroup.news;
    else if (groupLower.includes('mus')) themeTitles = titlesByGroup.music;

    const currentTitle = `${channel.name} • ${themeTitles[currHour % themeTitles.length]}`;
    const nextTitle = themeTitles[(currHour + 1) % themeTitles.length];

    const currentStartHour = currMinute < 30 ? currHour : currHour;
    const currentStartMin = currMinute < 30 ? "00" : "30";
    const currentEndHour = currMinute < 30 ? (currHour + 1) % 24 : (currHour + 1) % 24;
    const currentEndMin = currMinute < 30 ? "30" : "00";

    const elapsedMin = currMinute < 30 ? currMinute : currMinute - 30;
    const progressPercent = Math.min(95, Math.max(10, Math.round((elapsedMin / 45) * 100)));

    const currProg = {
      title: currentTitle,
      description: `Suivez en direct la diffusion sur ${channel.name}. Profitez d'une couverture complète avec les actualités, interviews exclusives et toute l'ambiance du direct.`,
      start: `${currentStartHour.toString().padStart(2, '0')}:${currentStartMin}`,
      stop: `${currentEndHour.toString().padStart(2, '0')}:${currentEndMin}`,
      progressPercent,
      isReal: false,
      category: channel.group || "Direct"
    };

    const nextProg = {
      title: `${channel.name} • ${nextTitle}`,
      description: "Ne manquez pas la suite de la programmation avec un nouveau rendez-vous inédit et divertissant.",
      start: currProg.stop,
      stop: `${(currentEndHour + 1) % 24}:${currentEndMin}`,
      isReal: false,
      category: channel.group || "À suivre"
    };

    return { currentProgram: currProg, nextProgram: nextProg };
  }, [epgListings, nowTimestamp, channel]);

  const triggerExternalLaunch = (playerId: ExternalPlayerId) => {
    setActiveExternalPlayer(playerId);
    setHasTriggeredLaunch(true);
    launchExternalPlayer(playerId, channel.url, {
      title: channel.name,
      userAgent: effectiveUa,
      httpReferrer: channel.httpReferrer
    });
    setTimeout(() => {
      setHasTriggeredLaunch(false);
    }, 4000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(channel.url);
    setCopiedStreamUrl(true);
    setTimeout(() => setCopiedStreamUrl(false), 2500);
  };

  const handleDownloadM3u = () => {
    downloadM3uFile(channel.url, {
      title: channel.name,
      userAgent: effectiveUa,
      httpReferrer: channel.httpReferrer
    });
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    let isCancelled = false;
    let fallbackTriggered = false;

    // Determine target URL: either proxied or direct
    const streamTarget = (isUsingProxy || streamProxyMode === 'always')
      ? getProxiedUrl(channel.url)
      : channel.url;

    const safePlay = () => {
      if (isCancelled || !video) return;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: any) => {
          // Ignore standard aborts when component unmounts or media changes
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            return;
          }
          console.warn("Video playback interrupted or prevented:", err?.message || err);
        });
      }
    };
    
    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsInstance.loadSource(streamTarget);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        safePlay();
      });
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If network or CORS error occurs and we are in 'auto' mode and not using proxy yet, auto-switch to proxy!
              if (!fallbackTriggered && streamProxyMode === 'auto' && !isUsingProxy) {
                fallbackTriggered = true;
                setIsUsingProxy(true);
                hlsInstance?.loadSource(getProxiedUrl(channel.url));
                hlsInstance?.startLoad();
              } else {
                hlsInstance?.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance?.recoverMediaError();
              break;
            default:
              hlsInstance?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamTarget;
      const handleLoadedMetadata = () => {
        safePlay();
      };
      const handleError = () => {
        if (!fallbackTriggered && streamProxyMode === 'auto' && !isUsingProxy) {
          fallbackTriggered = true;
          setIsUsingProxy(true);
          video.src = getProxiedUrl(channel.url);
          video.load();
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
  }, [channel.url, playerType, isUsingProxy, streamProxyMode, effectiveUa]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: 0,
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseMove={resetControlsTimer}
      onPointerMove={resetControlsTimer}
      onClick={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className={cn(
        "fixed inset-0 z-[100] bg-black flex flex-col shadow-2xl transition-all duration-300 select-none",
        !showControls ? "cursor-none" : "cursor-default"
      )}
    >
      {/* Player Header */}
      <div className={cn(
        "absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between z-30 transition-all duration-500 h-16 sm:h-24 px-3 sm:px-8",
        showControls 
          ? "opacity-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <div className="flex items-center gap-1.5 sm:gap-4 flex-1 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 sm:px-3.5 sm:py-2 bg-white/10 hover:bg-emerald-500 hover:text-black text-white rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all shadow-lg text-xs font-bold active:scale-95 group border border-white/10 flex-shrink-0 cursor-pointer"
            title="Retourner à la liste"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:inline">Retour</span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="font-bold text-white tracking-tight truncate text-sm sm:text-lg md:text-xl">
                  {fixUtf8(movieInfo?.title || channel.name)}
                </h2>
                {isMovieContent ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] sm:text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                      <Film className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      VOD
                    </span>
                    {movieInfo?.year && (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-white/10 text-white/80 text-[9px] sm:text-[10px] font-bold rounded-md">
                        {movieInfo.year}
                      </span>
                    )}
                    {movieInfo?.vote_average ? (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-black rounded-md flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
                        {movieInfo.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                ) : currentIndex !== -1 ? (
                  <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] font-black rounded-md uppercase tracking-wider flex-shrink-0">
                    CH {currentIndex + 1}
                  </span>
                ) : null}
              </div>
              <p className="text-white/60 text-[10px] sm:text-xs md:text-sm truncate">
                {movieInfo?.genres && movieInfo.genres.length > 0 
                  ? `${movieInfo.genres.join(' • ')} — ${fixUtf8(channel.group)}` 
                  : fixUtf8(channel.group)}
              </p>
            </div>

            {/* Quick Channel Switcher Buttons in Header (CH-, CH+, LAST CH) */}
            <div className="hidden lg:flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 ml-2 flex-shrink-0">
              {channels.length > 1 && (
                <>
                  <button
                    onClick={handlePrevChannel}
                    className="px-2.5 py-1.5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg transition-all flex items-center gap-1 text-xs font-bold active:scale-95 group cursor-pointer"
                    title={`Chaîne précédente (Haut / W) : ${prevChannel?.name || ''}`}
                  >
                    <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    <span>CH -</span>
                  </button>

                  <span className="px-1.5 text-[11px] font-bold text-white/40 select-none">
                    {currentIndex !== -1 ? `${currentIndex + 1}/${channels.length}` : ''}
                  </span>

                  <button
                    onClick={handleNextChannel}
                    className="px-2.5 py-1.5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg transition-all flex items-center gap-1 text-xs font-bold active:scale-95 group cursor-pointer"
                    title={`Chaîne suivante (Bas / S) : ${nextChannel?.name || ''}`}
                  >
                    <span>CH +</span>
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  </button>
                </>
              )}

              {lastChannel && (
                <button
                  onClick={handleLastChannel}
                  className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-lg transition-all flex items-center gap-1 text-xs font-bold active:scale-95 group ml-1 border border-emerald-500/30 cursor-pointer"
                  title={`Dernière chaîne regardée (Recall / Touche R) : ${lastChannel.name}`}
                >
                  <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
                  <span>LAST CH</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button 
            onClick={() => setShowExternalModal(true)}
            title="Open in External Player"
            className="p-1.5 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-full transition-colors text-emerald-500 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={onToggleFavorite}
            className={cn(
              "p-1.5 sm:p-2.5 md:p-3 rounded-full transition-colors cursor-pointer",
              isFavorite ? "text-emerald-500 hover:bg-emerald-500/10" : "hover:bg-white/10"
            )}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", isFavorite && "fill-current")} />
          </button>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-1.5 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Informations du programme"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="hover:bg-red-500/20 hover:text-red-400 transition-colors text-white/60 p-1.5 sm:p-2.5 md:p-3 rounded-full cursor-pointer"
            title="Fermer le lecteur"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative flex items-center justify-center group overflow-hidden bg-black">
        <video 
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime || 0);
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && e.currentTarget.duration > 0) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && e.currentTarget.duration > 0) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onClick={(e) => {
            resetControlsTimer();
            handleTogglePlayPause();
          }}
        />

        {/* Playback Action Feedback Animation Badge (Center Screen) */}
        <AnimatePresence>
          {playbackToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center justify-center p-6 rounded-3xl bg-black/85 backdrop-blur-2xl border border-emerald-500/50 shadow-2xl shadow-emerald-950/50"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 shadow-inner border border-emerald-500/30">
                {playbackToast.type === 'play' && <Play className="w-8 h-8 fill-current ml-1" />}
                {playbackToast.type === 'pause' && <Pause className="w-8 h-8 fill-current" />}
                {playbackToast.type === 'rewind' && <Rewind className="w-8 h-8 fill-current" />}
                {playbackToast.type === 'forward' && <FastForward className="w-8 h-8 fill-current" />}
              </div>
              <span className="text-white text-base font-black tracking-wide">
                {playbackToast.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Side Channel Navigation (Desktop Hover) */}
        {channels.length > 1 && (
          <>
            {/* Previous Channel (Left) */}
            <button
              onClick={handlePrevChannel}
              className={cn(
                "absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-emerald-500 hover:text-black text-white/90 rounded-2xl backdrop-blur-md border border-white/10 transition-all duration-300 shadow-2xl flex items-center gap-2 z-30 group/btn active:scale-95 cursor-pointer",
                showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              title={`Chaîne précédente (Touche Haut / W) : ${prevChannel?.name || ''}`}
            >
              <ChevronLeft className="w-6 h-6 group-hover/btn:-translate-x-0.5 transition-transform" />
              <div className="hidden lg:flex flex-col text-left pr-1 max-w-[140px]">
                <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-60">CH -</span>
                <span className="text-xs font-bold truncate">{prevChannel?.name}</span>
              </div>
            </button>

            {/* Next Channel (Right) */}
            <button
              onClick={handleNextChannel}
              className={cn(
                "absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-emerald-500 hover:text-black text-white/90 rounded-2xl backdrop-blur-md border border-white/10 transition-all duration-300 shadow-2xl flex items-center gap-2 z-30 group/btn active:scale-95 cursor-pointer",
                showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              title={`Chaîne suivante (Touche Bas / S) : ${nextChannel?.name || ''}`}
            >
              <div className="hidden lg:flex flex-col text-right pl-1 max-w-[140px]">
                <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-60">CH +</span>
                <span className="text-xs font-bold truncate">{nextChannel?.name}</span>
              </div>
              <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}

        {/* Floating Remote Zapping Widget (Top-Right / Corner on Hover) */}
        {(channels.length > 1 || lastChannel) && (
          <div className={cn(
            "absolute top-24 right-8 z-30 transition-opacity duration-300 hidden md:flex flex-col items-center bg-black/85 backdrop-blur-xl border border-white/15 p-1 rounded-2xl shadow-2xl",
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}>
            {channels.length > 1 && (
              <>
                <button
                  onClick={handlePrevChannel}
                  className="p-2 hover:bg-emerald-500 hover:text-black text-white rounded-xl transition-all active:scale-90 group/up cursor-pointer"
                  title="Chaîne Précédente (Haut / W)"
                >
                  <ChevronUp className="w-5 h-5 group-hover/up:-translate-y-0.5 transition-transform" />
                </button>
                <div className="py-0.5 px-2 text-[9px] font-black text-emerald-400 tracking-wider select-none">
                  CH
                </div>
                <button
                  onClick={handleNextChannel}
                  className="p-2 hover:bg-emerald-500 hover:text-black text-white rounded-xl transition-all active:scale-90 group/down cursor-pointer"
                  title="Chaîne Suivante (Bas / S)"
                >
                  <ChevronDown className="w-5 h-5 group-hover/down:translate-y-0.5 transition-transform" />
                </button>
              </>
            )}

            {lastChannel && (
              <button
                onClick={handleLastChannel}
                className="p-2 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-xl transition-all active:scale-90 border-t border-white/10 mt-1 cursor-pointer"
                title={`Dernière chaîne (Recall / R) : ${lastChannel.name}`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Channel Zapping Animated OSD Banner */}
        <AnimatePresence>
          {osdChannel && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="absolute top-20 left-8 z-40 bg-[#121212]/95 backdrop-blur-2xl border border-emerald-500/40 p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] max-w-md pointer-events-none"
            >
              <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {osdChannel.logo ? (
                  <img src={osdChannel.logo} alt={osdChannel.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Tv className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-black">
                    CH {channels.findIndex(c => c.id === osdChannel.id) + 1 || ''}
                  </span>
                  <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold truncate">
                    {osdChannel.group || 'Direct'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-base truncate">
                  {osdChannel.name}
                </h4>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Overlay */}
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute right-0 top-0 bottom-0 w-96 bg-black/80 backdrop-blur-xl border-l border-white/10 p-8 z-40 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Program Info</h3>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="mb-8">
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest block mb-2">Now Playing</span>
                  <h4 className="text-lg font-bold mb-2">{fixUtf8(currentProgram.title)}</h4>
                  <p className="text-white/60 text-sm leading-relaxed">{fixUtf8(currentProgram.description)}</p>
                  <div className="mt-4 flex items-center gap-2 text-white/40 text-xs">
                    <Clock className="w-3 h-3" />
                    {currentProgram.start} - {currentProgram.stop}
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Up Next</span>
                  <h4 className="text-lg font-bold mb-2">{fixUtf8(nextProgram.title)}</h4>
                  <p className="text-white/60 text-sm leading-relaxed">{fixUtf8(nextProgram.description)}</p>
                  <div className="mt-4 flex items-center gap-2 text-white/40 text-xs mb-6">
                    <Clock className="w-3 h-3" />
                    {nextProgram.start} - {nextProgram.stop}
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowInfo(false);
                    }}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-6"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Fermer les infos
                  </button>

                  {/* Technical Stream & Emulation Details */}
                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Émulation & Flux
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        isUsingProxy ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/60"
                      )}>
                        {isUsingProxy ? "Proxy Actif" : "Flux Direct"}
                      </span>
                    </div>

                    <div className="bg-black/60 rounded-xl p-3 border border-white/5 space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/40 block">User-Agent actif</span>
                        <p className="text-[11px] font-mono text-emerald-400 break-all select-all leading-tight mt-0.5">
                          {effectiveUa}
                        </p>
                      </div>

                      {channel.httpReferrer && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-white/40 block">Referer HTTP</span>
                          <p className="text-[11px] font-mono text-white/70 break-all select-all leading-tight mt-0.5">
                            {channel.httpReferrer}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setIsUsingProxy(!isUsingProxy)}
                      className="w-full py-2.5 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/10 rounded-xl text-xs font-semibold text-white/80 transition-all"
                    >
                      {isUsingProxy ? "Basculer en lecture directe" : "Forcer le relais via Proxy Serveur"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* External Player Modal */}
        <AnimatePresence>
          {showExternalModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
              onClick={() => setShowExternalModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-lg bg-[#141414] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                  <ExternalLink className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Ouvrir dans un Lecteur Externe</h3>
                <p className="text-white/50 text-xs sm:text-sm mb-6 leading-relaxed">
                  Lancez instantanément ce flux vidéo dans l'application de votre choix sans téléchargement de fichier.
                </p>
                
                {/* 1-Click Launch Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-left">
                  {SUPPORTED_EXTERNAL_PLAYERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        triggerExternalLaunch(p.id);
                        setShowExternalModal(false);
                      }}
                      className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl border border-white/10 transition-all flex items-center justify-between group active:scale-95 cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-xs group-hover:text-black text-white truncate">{p.name}</span>
                        <span className="text-[10px] group-hover:text-black/70 text-white/40 truncate">{p.badge || p.platforms.join(', ')}</span>
                      </div>
                      <Play className="w-4 h-4 text-emerald-400 group-hover:text-black fill-current flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <button 
                    onClick={handleCopyUrl}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>{copiedStreamUrl ? "URL copiée dans le presse-papiers !" : "Copier l'URL directe du flux"}</span>
                  </button>

                  <button 
                    onClick={handleDownloadM3u}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white/50" />
                    <span>Télécharger le fichier .M3U</span>
                  </button>

                  <button 
                    onClick={() => setShowExternalModal(false)}
                    className="w-full py-2.5 text-white/40 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player Footer / EPG Bar or Movie Synopsis Bar */}
      <div className={cn(
        "absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent backdrop-blur-md border-t border-white/10 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 transition-all duration-500 z-20 shadow-2xl overflow-y-auto max-h-[40vh] md:max-h-none custom-scrollbar",
        showControls
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-6 pointer-events-none"
      )}>
        {/* Quick Channel / Movie Zapper Cluster in Footer */}
        {(channels.length > 1 || lastChannel) && (
          <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 flex-shrink-0 bg-white/[0.03] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5">
            {channels.length > 1 && (
              <>
                <button
                  onClick={handlePrevChannel}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold active:scale-95 shadow cursor-pointer"
                  title={isMovieContent ? `Film précédent (Haut / W) : ${prevChannel?.name || ''}` : `Chaîne précédente (Haut / W) : ${prevChannel?.name || ''}`}
                >
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>CH -</span>
                </button>
                <div className="px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-bold text-white/40 flex flex-col items-center">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-emerald-500 font-extrabold">
                    {isMovieContent ? 'VOD' : 'ZAP'}
                  </span>
                  <span>{currentIndex !== -1 ? `${currentIndex + 1}/${channels.length}` : ''}</span>
                </div>
                <button
                  onClick={handleNextChannel}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold active:scale-95 shadow cursor-pointer"
                  title={isMovieContent ? `Film suivant (Bas / S) : ${nextChannel?.name || ''}` : `Chaîne suivante (Bas / S) : ${nextChannel?.name || ''}`}
                >
                  <span>CH +</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            )}

            {lastChannel && (
              <button
                onClick={handleLastChannel}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold active:scale-95 border border-emerald-500/30 shadow ml-0.5 sm:ml-1 cursor-pointer"
                title={`Dernier élément regardé (Recall / Touche R) : ${lastChannel.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                <span>LAST</span>
              </button>
            )}
          </div>
        )}

        {/* Playback Transport Controls Cluster (Rewind 10s, Play/Pause, Forward 10s) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 bg-white/[0.04] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={() => handleRewind(10)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold active:scale-90 shadow cursor-pointer group"
            title="Reculer de 10 secondes (Touche Gauche / J)"
          >
            <Rewind className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-mono text-[10px] sm:text-xs">-10s</span>
          </button>

          <button
            onClick={handleTogglePlayPause}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
            title={isPlaying ? "Mettre en pause (Espace / K / P)" : "Reprendre la lecture (Espace / K / P)"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
                <span className="hidden sm:inline">Lecture</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleForward(10)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/90 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold active:scale-90 shadow cursor-pointer group"
            title="Avancer de 10 secondes (Touche Droite / L)"
          >
            <span className="font-mono text-[10px] sm:text-xs">+10s</span>
            <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {isMovieContent ? (
          /* Movie Synopsis & Details Bottom Bar */
          <div className="flex-1 flex flex-col gap-2 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/5 transition-all min-w-0">
            {/* Interactive Timeline Scrubber */}
            <div className="w-full flex items-center gap-2.5 sm:gap-3 py-0.5">
              <span className="text-[11px] font-mono text-emerald-400 font-bold min-w-[44px]">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2.5 transition-all"
                  title={`Positionner la lecture (${formatTime(currentTime)} / ${duration > 0 ? formatTime(duration) : '--:--'})`}
                />
              </div>
              <span className="text-[11px] font-mono text-white/50 min-w-[44px] text-right">
                {duration > 0 ? formatTime(duration) : '--:--'}
              </span>
            </div>

            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            {/* Poster / Thumbnail */}
            {(movieInfo?.poster_url || channel.logo) && (
              <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex-shrink-0 relative shadow-lg">
                <img 
                  src={movieInfo?.poster_url || channel.logo} 
                  alt={movieInfo?.title || channel.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Main Synopsis Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-md">
                  <Film className="w-3 h-3" />
                  Film VOD
                </span>

                {movieInfo?.year && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white/80 text-[10px] font-bold rounded-md">
                    <Calendar className="w-3 h-3 text-white/60" />
                    {movieInfo.year}
                  </span>
                )}

                {movieInfo?.vote_average ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black rounded-md">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {movieInfo.vote_average.toFixed(1)}/10
                  </span>
                ) : null}

                {movieInfo?.genres && movieInfo.genres.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 flex-wrap">
                    {movieInfo.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/70 text-[10px] font-medium rounded-md">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-[11px] text-white/40 font-medium truncate max-w-[160px]">
                  {fixUtf8(channel.group)}
                </span>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-white truncate mb-1">
                {fixUtf8(movieInfo?.title || channel.name)}
              </h3>

              {isLoadingMovieInfo ? (
                <div className="flex items-center gap-2 text-xs text-white/40 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Chargement du synopsis TMDB...</span>
                </div>
              ) : (
                <div className="text-xs text-white/75 leading-relaxed">
                  <p className={cn("transition-all", showFullSynopsis ? "line-clamp-none max-h-32 overflow-y-auto custom-scrollbar pr-1" : "line-clamp-2")}>
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] mr-1.5">Synopsis :</span>
                    {movieInfo?.overview || "Aucun résumé n'a été trouvé pour ce titre."}
                  </p>
                </div>
              )}
            </div>

            {/* Synopsis Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
              {movieInfo?.overview && movieInfo.overview.length > 120 && (
                <button
                  onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-semibold transition-all border border-white/5 text-center whitespace-nowrap"
                >
                  {showFullSynopsis ? 'Moins' : 'Lire le synopsis'}
                </button>
              )}

              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all active:scale-95 shadow",
                    isFavorite 
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30" 
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  )}
                  title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                </button>
              )}
            </div>
          </div>
        </div>
        ) : (
          /* Live TV EPG Bottom Bar */
          <>
            {/* Current Live Program with Description */}
            <button 
              onClick={() => onSelectProgram?.(currentProgram)}
              className="flex-1 text-left group bg-white/[0.02] hover:bg-white/[0.05] p-3 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer"
              title="Cliquer pour afficher les détails du programme"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    En direct
                  </span>
                  <span className="text-[11px] text-white/50 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500/80" />
                    {currentProgram.start} - {currentProgram.stop}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-500/90 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {currentProgram.progressPercent}% écoulé
                </span>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                {currentProgram.title}
              </h3>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden my-1.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgram.progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-emerald-500 rounded-full" 
                />
              </div>

              {/* EPG Description */}
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all group-hover:text-white/90">
                {currentProgram.description}
              </p>
            </button>

            {/* Divider */}
            <div className="hidden md:block w-px h-16 bg-white/10 flex-shrink-0" />

            {/* Next Program with Description */}
            <button 
              onClick={() => onSelectProgram?.(nextProgram)}
              className="flex-1 md:max-w-md text-left group bg-white/[0.01] hover:bg-white/[0.04] p-3 rounded-2xl border border-white/5 hover:border-white/15 transition-all opacity-75 hover:opacity-100 cursor-pointer"
              title="Cliquer pour afficher les détails du prochain programme"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-md">
                  À suivre
                </span>
                <span className="text-[11px] text-white/40 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  {nextProgram.start} - {nextProgram.stop}
                </span>
              </div>

              <h3 className="font-semibold text-xs sm:text-sm text-white/90 group-hover:text-emerald-400 transition-colors line-clamp-1">
                {nextProgram.title}
              </h3>

              <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mt-1 group-hover:text-white/70 transition-colors">
                {nextProgram.description}
              </p>
            </button>

            {/* Quick Info Modal Button */}
            <div className="hidden lg:flex items-center flex-shrink-0 pl-1">
              <button
                onClick={() => onSelectProgram?.(currentProgram)}
                className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-black text-white/80 rounded-xl transition-all border border-white/5 flex items-center gap-2 text-xs font-bold shadow-lg"
                title="Afficher la fiche complète"
              >
                <Info className="w-4 h-4" />
                <span>Détails EPG</span>
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
