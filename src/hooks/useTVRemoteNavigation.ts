import { useEffect, useState, useCallback, useRef } from 'react';
import { parseTVKeyEvent, findNextSpatialTarget, getFocusableElements, TVDirection } from '../utils/tvNavigation';
import { translations, Language } from '../utils/i18n';

interface UseTVRemoteNavigationProps {
  view: string;
  setView: (v: any) => void;
  selectedChannel: any;
  setSelectedChannel: (c: any) => void;
  selectedEPGProgram: any;
  setSelectedEPGProgram: (p: any) => void;
  fullscreenVodMovie?: any;
  setFullscreenVodMovie?: (m: any) => void;
  channels: any[];
  onSelectChannel: (c: any) => void;
  showCategoriesSidebar?: boolean;
  setShowCategoriesSidebar?: (show: boolean | ((prev: boolean) => boolean)) => void;
  showNavMenu?: boolean;
  setShowNavMenu?: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowMobileCategories?: (show: boolean | ((prev: boolean) => boolean)) => void;
  lang?: Language;
  favoritesTab?: 'epg' | 'vod';
}

export function useTVRemoteNavigation({
  view,
  setView,
  selectedChannel,
  setSelectedChannel,
  selectedEPGProgram,
  setSelectedEPGProgram,
  fullscreenVodMovie,
  setFullscreenVodMovie,
  channels,
  onSelectChannel,
  showCategoriesSidebar = false,
  setShowCategoriesSidebar,
  showNavMenu = false,
  setShowNavMenu,
  setShowMobileCategories,
  lang = 'fr',
  favoritesTab = 'epg'
}: UseTVRemoteNavigationProps) {
  const setCategoriesVisible = setShowCategoriesSidebar || setShowMobileCategories;
  const t = translations[lang] || translations.fr;

  const [tvMode, setTvMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('vision_tv_mode');
    return saved !== null ? saved === 'true' : true; // Enabled by default for seamless TV experience
  });

  const [lastRemoteAction, setLastRemoteAction] = useState<string | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelNumberBufferRef = useRef<string>('');
  const channelNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [channelInputToast, setChannelInputToast] = useState<string | null>(null);

  const showActionToast = useCallback((text: string) => {
    setLastRemoteAction(text);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setLastRemoteAction(null);
    }, 2500);
  }, []);

  const toggleTvMode = useCallback(() => {
    setTvMode(prev => {
      const next = !prev;
      localStorage.setItem('vision_tv_mode', String(next));
      showActionToast(next ? t.tvModeActive : t.tvModeInactive);
      return next;
    });
  }, [showActionToast, t.tvModeActive, t.tvModeInactive]);

  // Set body class for TV mode styling
  useEffect(() => {
    if (tvMode) {
      document.body.classList.add('tv-mode');
    } else {
      document.body.classList.remove('tv-mode');
    }
  }, [tvMode]);

  // Direct Channel Number Dialing (e.g. pressing '1' then '2' jumps to Channel 12)
  const handleNumericDial = useCallback((num: number) => {
    if (channelNumberTimeoutRef.current) clearTimeout(channelNumberTimeoutRef.current);
    channelNumberBufferRef.current += String(num);
    const currentNumStr = channelNumberBufferRef.current;
    setChannelInputToast(`${t.tvDirectNumber} #${currentNumStr}`);

    channelNumberTimeoutRef.current = setTimeout(() => {
      const targetIndex = parseInt(channelNumberBufferRef.current, 10) - 1;
      channelNumberBufferRef.current = '';
      setChannelInputToast(null);

      if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < channels.length) {
        const targetChannel = channels[targetIndex];
        if (targetChannel) {
          onSelectChannel(targetChannel);
          showActionToast(`${t.tvZapping} : ${targetChannel.name}`);
        }
      } else {
        showActionToast(`${t.tvChannelNotFound} (${targetIndex + 1})`);
      }
    }, 1200);
  }, [channels, onSelectChannel, showActionToast, t.tvDirectNumber, t.tvZapping, t.tvChannelNotFound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tvKey = parseTVKeyEvent(e);

      // Numeric Dialing on TV Remote
      if (tvKey.numberKey !== null && !selectedEPGProgram) {
        // Ignore if user is typing in a text input or search box
        const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          handleNumericDial(tvKey.numberKey);
          return;
        }
      }

      // Back / Escape key handling
      if (tvKey.isBack) {
        // If in EPG view (or Favorites in EPG guide mode), TiviMate EPG component handles all its own Back/Escape operations (fullscreen exit, pane navigation, sliding menu)
        if (view === 'epg' || (view === 'favorites' && favoritesTab === 'epg')) {
          if (selectedEPGProgram) {
            e.preventDefault();
            setSelectedEPGProgram(null);
            showActionToast(t.tvBack);
          }
          return;
        }

        if (fullscreenVodMovie && setFullscreenVodMovie) {
          e.preventDefault();
          setFullscreenVodMovie(null);
          showActionToast(t.tvBack);
          return;
        }
        if (selectedEPGProgram) {
          e.preventDefault();
          setSelectedEPGProgram(null);
          showActionToast(t.tvBack);
          return;
        }
        if (selectedChannel) {
          e.preventDefault();
          setSelectedChannel(null);
          showActionToast(t.tvBack);
          return;
        }
        if (showNavMenu && setShowNavMenu) {
          e.preventDefault();
          setShowNavMenu(false);
          showActionToast(t.tvBack);
          return;
        }
        if (showCategoriesSidebar && setCategoriesVisible) {
          e.preventDefault();
          setCategoriesVisible(false);
          if (setShowNavMenu) setShowNavMenu(true);
          showActionToast(t.tvBack);
          return;
        }
        if ((view === 'vod' || view === 'series' || view === 'live' || (view === 'favorites' && favoritesTab === 'vod') || view === 'recent') && setCategoriesVisible) {
          e.preventDefault();
          setCategoriesVisible(true);
          showActionToast(t.tvToastCategories);
          return;
        }
        if (view === 'settings' || view === 'setup' || view === 'recordings') {
          e.preventDefault();
          if (setShowNavMenu) setShowNavMenu(true);
          showActionToast(t.tvBack);
          return;
        }
        return;
      }

      // Colored TV buttons (Red, Green, Yellow, Blue)
      if (tvKey.isRed) {
        e.preventDefault();
        if (view !== 'epg') {
          setView('epg');
          showActionToast(t.navLive);
        } else if (setCategoriesVisible) {
          setCategoriesVisible(prev => !prev);
          showActionToast(t.tvToastCategories);
        }
        return;
      }
      if (tvKey.isGreen) {
        e.preventDefault();
        setView('live');
        showActionToast(t.tvToastEpg);
        return;
      }
      if (tvKey.isYellow) {
        e.preventDefault();
        setView('favorites');
        showActionToast(t.tvToastFavorites);
        return;
      }
      if (tvKey.isBlue) {
        e.preventDefault();
        setView(view === 'settings' ? 'epg' : 'settings');
        showActionToast(view === 'settings' ? t.navLive : t.tvToastSettings);
        return;
      }

      // If video player overlay is open, VideoPlayer handles its own internal controls (CH+, CH-, Volume, etc.)
      if (selectedChannel) {
        return;
      }

      // If fullscreen VOD movie detail is open, FullscreenMovieHero handles its own D-pad navigation
      if (fullscreenVodMovie) {
        return;
      }

      // If in EPG view, TiviMate EPG handles its own dedicated 3-pane navigation
      if (view === 'epg') {
        return;
      }

      // If categories sidebar is open or nav menu is open, let their dedicated handlers in App.tsx process arrow keys
      if (showNavMenu || showCategoriesSidebar) {
        return;
      }

      // Spatial Arrow Navigation
      if (tvKey.isUp || tvKey.isDown || tvKey.isLeft || tvKey.isRight) {
        let direction: TVDirection = 'down';
        if (tvKey.isUp) direction = 'up';
        if (tvKey.isDown) direction = 'down';
        if (tvKey.isLeft) direction = 'left';
        if (tvKey.isRight) direction = 'right';

        // Auto-enable TV mode if an arrow is pressed
        if (!tvMode) {
          setTvMode(true);
          localStorage.setItem('vision_tv_mode', 'true');
        }

        const focusables = getFocusableElements();
        if (focusables.length === 0) return;

        let currentActive = document.activeElement as HTMLElement | null;
        const isCardActive = currentActive && (currentActive.hasAttribute('data-channel-id') || currentActive.classList.contains('tv-focus-target'));

        // If no element is active, or focus is on body/window, or not in focusables, or if in VOD/Series view and focus is not on a card:
        if (!currentActive || currentActive === document.body || !focusables.includes(currentActive) || ((view === 'vod' || view === 'series') && !isCardActive)) {
          // Default directly to the 1st movie card in the grid!
          const firstMovieCard = focusables.find(el => el.getAttribute('data-tv-first-movie') === 'true' || el.getAttribute('data-tv-movie-card') === 'true' || el.hasAttribute('data-channel-id'));
          const target = firstMovieCard || focusables[0];
          if (target) {
            e.preventDefault();
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }
          return;
        }

        const nextTarget = findNextSpatialTarget(currentActive, direction, focusables);
        if (nextTarget) {
          e.preventDefault();
          nextTarget.focus();
          nextTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } else if (direction === 'left' && (view === 'vod' || view === 'series' || view === 'live' || view === 'favorites' || view === 'recent')) {
          // When pressing LEFT at column 1 of the grid (or when no target is to the left), open the Categories Column!
          e.preventDefault();
          if (setCategoriesVisible) {
            setCategoriesVisible(true);
          }
        } else if (direction === 'up' && (view === 'vod' || view === 'series')) {
          // When pressing UP at the top row of movies, do NOT navigate into the small hero header
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    tvMode,
    view,
    setView,
    selectedChannel,
    setSelectedChannel,
    selectedEPGProgram,
    setSelectedEPGProgram,
    fullscreenVodMovie,
    setFullscreenVodMovie,
    handleNumericDial,
    showActionToast,
    showCategoriesSidebar,
    setShowCategoriesSidebar,
    showNavMenu,
    setShowNavMenu,
    setCategoriesVisible,
    t
  ]);

  return {
    tvMode,
    toggleTvMode,
    lastRemoteAction,
    channelInputToast
  };
}
