export type ExternalPlayerId = 'vlc' | 'exoplayer' | 'mxplayer' | 'potplayer' | 'iina' | 'mpv' | 'nplayer';

export interface ExternalPlayerInfo {
  id: ExternalPlayerId;
  name: string;
  badge: string;
  platforms: string[];
  description: string;
  directLaunchSupported: boolean;
  schemeExample: string;
}

export const SUPPORTED_EXTERNAL_PLAYERS: ExternalPlayerInfo[] = [
  {
    id: 'vlc',
    name: 'VLC Media Player',
    badge: 'Multiplateforme',
    platforms: ['Windows', 'macOS', 'Android', 'iOS', 'Linux'],
    description: 'Le lecteur multimédia universel le plus populaire. Lancement direct via protocole vlc:// et intent Android.',
    directLaunchSupported: true,
    schemeExample: 'vlc://[url]'
  },
  {
    id: 'exoplayer',
    name: 'ExoPlayer / Sélecteur Android',
    badge: 'Android & Smart TV',
    platforms: ['Android', 'Android TV', 'Fire TV'],
    description: 'Ouvre le sélecteur d\'applications vidéo natif Android ou votre lecteur par défaut (ExoPlayer, Nova Player, Just Player, Kodi).',
    directLaunchSupported: true,
    schemeExample: 'intent:[url]#Intent;action=VIEW;type=video/*;end'
  },
  {
    id: 'mxplayer',
    name: 'MX Player (Free & Pro)',
    badge: 'Android & iOS',
    platforms: ['Android', 'iOS'],
    description: 'Lecteur réputé sur mobile pour son décodage matériel HW+ et sa gestion fluide des flux IPTV.',
    directLaunchSupported: true,
    schemeExample: 'intent:[url]#Intent;package=com.mxtech.videoplayer.ad;end'
  },
  {
    id: 'potplayer',
    name: 'PotPlayer',
    badge: 'Windows',
    platforms: ['Windows'],
    description: 'Lecteur ultra-performant et personnalisable pour Windows avec support direct des flux réseau.',
    directLaunchSupported: true,
    schemeExample: 'potplayer://[url]'
  },
  {
    id: 'iina',
    name: 'IINA Media Player',
    badge: 'macOS',
    platforms: ['macOS'],
    description: 'Le lecteur vidéo moderne conçu spécifiquement pour macOS avec intégration système native.',
    directLaunchSupported: true,
    schemeExample: 'iina://weblink?url=[url]'
  },
  {
    id: 'mpv',
    name: 'MPV Player',
    badge: 'Linux / macOS / Windows',
    platforms: ['Linux', 'macOS', 'Windows'],
    description: 'Lecteur léger, ultra-rapide et sans fioritures basé sur MPlayer/mplayer2.',
    directLaunchSupported: true,
    schemeExample: 'mpv://[url]'
  },
  {
    id: 'nplayer',
    name: 'nPlayer',
    badge: 'iOS & Android',
    platforms: ['iOS', 'Android'],
    description: 'Lecteur mobile premium avec prise en charge avancée des codecs audio DTS et flux réseau.',
    directLaunchSupported: true,
    schemeExample: 'nplayer-[url]'
  }
];

/**
 * Generates the deep link or custom intent URI for a given external player
 */
export function getExternalPlayerUri(
  playerId: ExternalPlayerId,
  streamUrl: string,
  options?: { title?: string; userAgent?: string; httpReferrer?: string }
): string {
  const cleanUrl = streamUrl.trim();
  const title = options?.title || 'VISION IPTV Stream';
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  switch (playerId) {
    case 'vlc': {
      if (isAndroid) {
        // Android Intent for VLC with custom title & headers if available
        return `intent:${cleanUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;S.title=${encodeURIComponent(title)};end`;
      }
      if (isIOS) {
        return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(cleanUrl)}`;
      }
      // Desktop / standard URI scheme
      return `vlc://${cleanUrl}`;
    }

    case 'exoplayer': {
      // Universal Android Video Player intent (triggers ExoPlayer / user default player / system picker)
      return `intent:${cleanUrl}#Intent;action=android.intent.action.VIEW;type=video/*;S.title=${encodeURIComponent(title)};end`;
    }

    case 'mxplayer': {
      if (isAndroid) {
        return `intent:${cleanUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(title)};end`;
      }
      return `mxplayer://${cleanUrl}`;
    }

    case 'potplayer': {
      return `potplayer://${cleanUrl}`;
    }

    case 'iina': {
      return `iina://weblink?url=${encodeURIComponent(cleanUrl)}`;
    }

    case 'mpv': {
      return `mpv://${cleanUrl}`;
    }

    case 'nplayer': {
      return `nplayer-${cleanUrl}`;
    }

    default:
      return cleanUrl;
  }
}

/**
 * Attempts to launch an external player immediately via deep link / intent
 */
export function launchExternalPlayer(
  playerId: ExternalPlayerId,
  streamUrl: string,
  options?: { title?: string; userAgent?: string; httpReferrer?: string }
): boolean {
  try {
    const uri = getExternalPlayerUri(playerId, streamUrl, options);
    
    // Create an invisible anchor to trigger without navigating away or losing app state
    const link = document.createElement('a');
    link.href = uri;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);

    return true;
  } catch (err) {
    console.error('Failed to trigger external player deep link:', err);
    return false;
  }
}

/**
 * Generates and downloads a .m3u playlist file for manual opening in any desktop media player
 */
export function downloadM3uFile(
  channelNameOrUrl: string,
  streamUrlOrOptions?: string | { title?: string; userAgent?: string; httpReferrer?: string },
  optUserAgent?: string,
  optHttpReferrer?: string
): void {
  let name = 'flux_video';
  let url = '';
  let ua = '';
  let referer = '';

  if (typeof streamUrlOrOptions === 'object' && streamUrlOrOptions !== null) {
    url = channelNameOrUrl;
    name = streamUrlOrOptions.title || 'flux_video';
    ua = streamUrlOrOptions.userAgent || '';
    referer = streamUrlOrOptions.httpReferrer || '';
  } else if (typeof streamUrlOrOptions === 'string') {
    name = channelNameOrUrl;
    url = streamUrlOrOptions;
    ua = optUserAgent || '';
    referer = optHttpReferrer || '';
  } else {
    url = channelNameOrUrl;
  }

  let m3uContent = `#EXTM3U\n`;
  if (ua && ua.trim()) {
    m3uContent += `#EXTVLCOPT:http-user-agent=${ua.trim()}\n`;
  }
  if (referer && referer.trim()) {
    m3uContent += `#EXTVLCOPT:http-referrer=${referer.trim()}\n`;
  }
  m3uContent += `#EXTINF:-1,${name}\n${url}\n`;

  const blob = new Blob([m3uContent], { type: 'application/x-mpegurl;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', `${name.replace(/[^a-z0-9]/gi, '_')}.m3u`);
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
