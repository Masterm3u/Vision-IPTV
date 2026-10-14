export type Language = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ar';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  regionDescription: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'fr',
    label: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    regionDescription: 'France, Belgique, Suisse, Canada, Maghreb, Afrique'
  },
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    regionDescription: 'USA, UK, Canada, Australia, International'
  },
  {
    code: 'es',
    label: 'Espagnol',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    regionDescription: 'España, México, Argentina, Colombia, LatAm'
  },
  {
    code: 'de',
    label: 'Allemand',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    regionDescription: 'Deutschland, Österreich, Schweiz (DACH)'
  },
  {
    code: 'pt',
    label: 'Portugais',
    nativeName: 'Português',
    flag: '🇧🇷',
    dir: 'ltr',
    regionDescription: 'Brasil, Portugal, Angola, Moçambique'
  },
  {
    code: 'ar',
    label: 'Arabe',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    regionDescription: 'الشرق الأوسط، الخليج، شمال أفريقيا، المغرب العربي'
  }
];

export const translations = {
  fr: {
    // Navigation
    navLive: 'TV en direct',
    navMovies: 'Films (VOD)',
    navSeries: 'Séries',
    navEpg: 'Guide TV (EPG)',
    navFavorites: 'Favoris',
    navRecordings: 'Enregistrements',
    navRecent: 'Récents',
    navSettings: 'Paramètres',
    navAddPlaylist: 'Ajouter',

    // Search & Filters
    searchPlaceholder: 'Rechercher des chaînes, films, séries...',
    allCategories: 'Toutes les catégories',
    itemsCount: 'éléments',
    channelsCount: 'chaînes',
    noContent: 'Aucun contenu trouvé',
    noContentDesc: 'Essayez de modifier votre recherche ou sélectionnez une autre catégorie.',
    clearFilters: 'Effacer les filtres',

    // TV Remote & OSD
    tvModeTitle: 'Télécommande Smart TV & D-Pad',
    tvModeOn: 'Mode TV ON',
    tvModeOff: 'Mode TV OFF',
    tvModeActive: 'Mode Smart TV (Télécommande) Activé',
    tvModeInactive: 'Mode Souris / Tactile Activé',
    tvRemoteLegend: 'Smart TV D-Pad',
    tvNavigate: 'Naviguer',
    tvSelect: 'Lire / Sélectionner',
    tvBack: 'Quitter / Précédent',
    tvDirectNumber: 'N° Chaîne',
    tvZapping: 'Zapping',
    tvChannelNotFound: 'Chaîne introuvable',
    tvToastCategories: '🔴 Catégories',
    tvToastEpg: '🟢 Guide TV (EPG)',
    tvToastFavorites: '🟡 Favoris',
    tvToastSettings: '🔵 Paramètres',

    // Settings
    settingsTitle: 'Paramètres du Lecteur',
    settingsSubtitle: 'Personnalisez votre expérience de visionnage, lecteurs externes, langue et flux.',
    
    // Language Section
    languageSectionTitle: 'Langue & Internationalisation',
    languageSectionDesc: 'Sélectionnez votre langue d’interface parmi les 6 marchés stratégiques mondiaux.',
    activeLanguage: 'Langue active',

    // Player Options
    playerSectionTitle: 'Moteur de Lecture Vidéo',
    playerInternal: 'Lecteur Web Intégré (HLS.js / Vidéo HTML5)',
    playerExternal: 'Lecteurs Externes Directs (VLC, ExoPlayer, MX, etc.)',
    playerChoiceTitle: 'Lecteur par défaut',

    // User-Agent & Proxy
    userAgentTitle: 'Profil User-Agent actif',
    userAgentDesc: 'Émule des signatures d’applications ou navigateurs pour débloquer les flux sécurisés.',
    streamProxyTitle: 'Mode Proxy de Streaming',
    streamProxyDesc: 'Résout les restrictions CORS, protocoles mixtes HTTP/HTTPS et blocages réseau.',

    // Playlist Setup
    setupTitle: 'Gestion des Playlists',
    setupSubtitle: 'Ajoutez et gérez vos listes M3U, Xtream Codes ou Stalker Portal.',
    addPlaylistBtn: 'Ajouter une playlist',
    playlistName: 'Nom de la playlist',
    playlistUrl: 'URL M3U / M3U8',
    xtreamHost: 'Serveur (ex: http://iptv-domain.com:8080)',
    xtreamUser: 'Nom d’utilisateur',
    xtreamPass: 'Mot de passe',
    savePlaylist: 'Enregistrer et charger',
    cancel: 'Annuler',

    // Video Player
    liveBadge: 'EN DIRECT',
    nextProgram: 'À suivre',
    noEpgInfo: 'Aucun programme disponible',
    pipMode: 'Picture-in-Picture',
    fullscreen: 'Plein écran',
    close: 'Fermer',
    volume: 'Volume',
    audioTracks: 'Pistes audio',
    subtitles: 'Sous-titres',
    resolution: 'Qualité',
    auto: 'Automatique'
  },

  en: {
    // Navigation
    navLive: 'Live TV',
    navMovies: 'Movies (VOD)',
    navSeries: 'Series',
    navEpg: 'TV Guide (EPG)',
    navFavorites: 'Favorites',
    navRecordings: 'Recordings',
    navRecent: 'Recent',
    navSettings: 'Settings',
    navAddPlaylist: 'Add Playlist',

    // Search & Filters
    searchPlaceholder: 'Search channels, movies, series...',
    allCategories: 'All Categories',
    itemsCount: 'items',
    channelsCount: 'channels',
    noContent: 'No content found',
    noContentDesc: 'Try adjusting your search query or pick a different category.',
    clearFilters: 'Clear filters',

    // TV Remote & OSD
    tvModeTitle: 'Smart TV Remote & D-Pad',
    tvModeOn: 'TV Mode ON',
    tvModeOff: 'TV Mode OFF',
    tvModeActive: 'Smart TV Mode (Remote) Enabled',
    tvModeInactive: 'Mouse / Touch Mode Enabled',
    tvRemoteLegend: 'Smart TV D-Pad',
    tvNavigate: 'Navigate',
    tvSelect: 'Play / Select',
    tvBack: 'Back / Exit',
    tvDirectNumber: 'Channel #',
    tvZapping: 'Zapping',
    tvChannelNotFound: 'Channel not found',
    tvToastCategories: '🔴 Categories',
    tvToastEpg: '🟢 TV Guide (EPG)',
    tvToastFavorites: '🟡 Favorites',
    tvToastSettings: '🔵 Settings',

    // Settings
    settingsTitle: 'Player Settings',
    settingsSubtitle: 'Customize your viewing experience, external players, language and stream routing.',
    
    // Language Section
    languageSectionTitle: 'Language & Localization',
    languageSectionDesc: 'Select your interface language across the 6 major global IPTV markets.',
    activeLanguage: 'Active Language',

    // Player Options
    playerSectionTitle: 'Video Playback Engine',
    playerInternal: 'Built-in Web Player (HLS.js / HTML5 Video)',
    playerExternal: 'Direct External Players (VLC, ExoPlayer, MX, etc.)',
    playerChoiceTitle: 'Default Video Player',

    // User-Agent & Proxy
    userAgentTitle: 'Active User-Agent Profile',
    userAgentDesc: 'Emulates dedicated app or browser headers to bypass ISP and server blocks.',
    streamProxyTitle: 'Stream Proxy Mode',
    streamProxyDesc: 'Resolves CORS restrictions, mixed HTTP/HTTPS content, and network blocks.',

    // Playlist Setup
    setupTitle: 'Playlist Management',
    setupSubtitle: 'Add and manage your M3U playlists, Xtream Codes or Stalker Portals.',
    addPlaylistBtn: 'Add Playlist',
    playlistName: 'Playlist Name',
    playlistUrl: 'M3U / M3U8 URL',
    xtreamHost: 'Server URL (e.g. http://iptv-domain.com:8080)',
    xtreamUser: 'Username',
    xtreamPass: 'Password',
    savePlaylist: 'Save & Load',
    cancel: 'Cancel',

    // Video Player
    liveBadge: 'LIVE',
    nextProgram: 'Up Next',
    noEpgInfo: 'No program guide available',
    pipMode: 'Picture-in-Picture',
    fullscreen: 'Fullscreen',
    close: 'Close',
    volume: 'Volume',
    audioTracks: 'Audio Tracks',
    subtitles: 'Subtitles',
    resolution: 'Quality',
    auto: 'Auto'
  },

  es: {
    // Navigation
    navLive: 'TV en Vivo',
    navMovies: 'Películas (VOD)',
    navSeries: 'Series',
    navEpg: 'Guía TV (EPG)',
    navFavorites: 'Favoritos',
    navRecordings: 'Grabaciones',
    navRecent: 'Recientes',
    navSettings: 'Ajustes',
    navAddPlaylist: 'Añadir Lista',

    // Search & Filters
    searchPlaceholder: 'Buscar canales, películas, series...',
    allCategories: 'Todas las categorías',
    itemsCount: 'elementos',
    channelsCount: 'canales',
    noContent: 'No se encontró contenido',
    noContentDesc: 'Intenta modificar tu búsqueda o selecciona otra categoría.',
    clearFilters: 'Borrar filtros',

    // TV Remote & OSD
    tvModeTitle: 'Mando Smart TV & D-Pad',
    tvModeOn: 'Modo TV ON',
    tvModeOff: 'Modo TV OFF',
    tvModeActive: 'Modo Smart TV (Mando) Activado',
    tvModeInactive: 'Modo Ratón / Táctil Activado',
    tvRemoteLegend: 'Smart TV D-Pad',
    tvNavigate: 'Navegar',
    tvSelect: 'Reproducir / Seleccionar',
    tvBack: 'Atrás / Salir',
    tvDirectNumber: 'N° Canal',
    tvZapping: 'Zapping',
    tvChannelNotFound: 'Canal no encontrado',
    tvToastCategories: '🔴 Categorías',
    tvToastEpg: '🟢 Guía TV (EPG)',
    tvToastFavorites: '🟡 Favoritos',
    tvToastSettings: '🔵 Ajustes',

    // Settings
    settingsTitle: 'Ajustes del Reproductor',
    settingsSubtitle: 'Personaliza tu experiencia, reproductores externos, idioma y rutas de streaming.',
    
    // Language Section
    languageSectionTitle: 'Idioma y Localización',
    languageSectionDesc: 'Selecciona tu idioma entre los 6 mercados estratégicos mundiales.',
    activeLanguage: 'Idioma activo',

    // Player Options
    playerSectionTitle: 'Motor de Reproducción de Vídeo',
    playerInternal: 'Reproductor Web Integrado (HLS.js / HTML5)',
    playerExternal: 'Reproductores Externos (VLC, ExoPlayer, MX, etc.)',
    playerChoiceTitle: 'Reproductor predeterminado',

    // User-Agent & Proxy
    userAgentTitle: 'Perfil User-Agent Activo',
    userAgentDesc: 'Emula firmas de apps o navegadores para desbloquear canales con restricción.',
    streamProxyTitle: 'Modo Proxy de Streaming',
    streamProxyDesc: 'Soluciona problemas de CORS, HTTP/HTTPS mixto y bloqueos de red.',

    // Playlist Setup
    setupTitle: 'Gestión de Listas',
    setupSubtitle: 'Añade y gestiona listas M3U, Xtream Codes o Stalker Portal.',
    addPlaylistBtn: 'Añadir lista',
    playlistName: 'Nombre de la lista',
    playlistUrl: 'URL M3U / M3U8',
    xtreamHost: 'Servidor (ej. http://iptv-domain.com:8080)',
    xtreamUser: 'Usuario',
    xtreamPass: 'Contraseña',
    savePlaylist: 'Guardar y Cargar',
    cancel: 'Cancelar',

    // Video Player
    liveBadge: 'EN DIRECTO',
    nextProgram: 'A continuación',
    noEpgInfo: 'Sin información de guía',
    pipMode: 'Picture-in-Picture',
    fullscreen: 'Pantalla completa',
    close: 'Cerrar',
    volume: 'Volumen',
    audioTracks: 'Pistas de audio',
    subtitles: 'Subtítulos',
    resolution: 'Calidad',
    auto: 'Automático'
  },

  de: {
    // Navigation
    navLive: 'Live TV',
    navMovies: 'Filme (VOD)',
    navSeries: 'Serien',
    navEpg: 'TV-Programm (EPG)',
    navFavorites: 'Favoriten',
    navRecordings: 'Aufnahmen',
    navRecent: 'Zuletzt',
    navSettings: 'Einstellungen',
    navAddPlaylist: 'Playlist hinzufügen',

    // Search & Filters
    searchPlaceholder: 'Sender, Filme, Serien suchen...',
    allCategories: 'Alle Kategorien',
    itemsCount: 'Einträge',
    channelsCount: 'Sender',
    noContent: 'Kein Inhalt gefunden',
    noContentDesc: 'Passen Sie Ihre Suche an oder wählen Sie eine andere Kategorie.',
    clearFilters: 'Filter zurücksetzen',

    // TV Remote & OSD
    tvModeTitle: 'Smart TV Fernbedienung & D-Pad',
    tvModeOn: 'TV-Modus AN',
    tvModeOff: 'TV-Modus AUS',
    tvModeActive: 'Smart TV Modus (Fernbedienung) Aktiviert',
    tvModeInactive: 'Maus- / Touch-Modus Aktiviert',
    tvRemoteLegend: 'Smart TV D-Pad',
    tvNavigate: 'Navigieren',
    tvSelect: 'Abspielen / Wählen',
    tvBack: 'Zurück / Beenden',
    tvDirectNumber: 'Kanal-Nr.',
    tvZapping: 'Senderwechsel',
    tvChannelNotFound: 'Sender nicht gefunden',
    tvToastCategories: '🔴 Kategorien',
    tvToastEpg: '🟢 TV-Programm (EPG)',
    tvToastFavorites: '🟡 Favoriten',
    tvToastSettings: '🔵 Einstellungen',

    // Settings
    settingsTitle: 'Player-Einstellungen',
    settingsSubtitle: 'Passen Sie Ihr Seherlebnis, externe Player, Sprache und Streaming-Routing an.',
    
    // Language Section
    languageSectionTitle: 'Sprache & Lokalisierung',
    languageSectionDesc: 'Wählen Sie Ihre Sprache aus den 6 wichtigsten globalen IPTV-Märkten.',
    activeLanguage: 'Aktive Sprache',

    // Player Options
    playerSectionTitle: 'Video-Wiedergabe-Engine',
    playerInternal: 'Integrierter Web-Player (HLS.js / HTML5)',
    playerExternal: 'Direkte externe Player (VLC, ExoPlayer, MX usw.)',
    playerChoiceTitle: 'Standard-Player',

    // User-Agent & Proxy
    userAgentTitle: 'Aktives User-Agent-Profil',
    userAgentDesc: 'Emuliert App- oder Browser-Header, um Stream-Sperren zu umgehen.',
    streamProxyTitle: 'Streaming-Proxy-Modus',
    streamProxyDesc: 'Löst CORS-Einschränkungen, gemischte HTTP/HTTPS-Protokolle und Netzwerksperren.',

    // Playlist Setup
    setupTitle: 'Playlist-Verwaltung',
    setupSubtitle: 'Verwalten Sie Ihre M3U-Playlists, Xtream Codes oder Stalker Portale.',
    addPlaylistBtn: 'Playlist hinzufügen',
    playlistName: 'Playlist-Name',
    playlistUrl: 'M3U / M3U8 URL',
    xtreamHost: 'Server-URL (z.B. http://iptv-domain.com:8080)',
    xtreamUser: 'Benutzername',
    xtreamPass: 'Passwort',
    savePlaylist: 'Speichern & Laden',
    cancel: 'Abbrechen',

    // Video Player
    liveBadge: 'LIVE',
    nextProgram: 'Als Nächstes',
    noEpgInfo: 'Keine Programminformationen',
    pipMode: 'Bild-in-Bild',
    fullscreen: 'Vollbild',
    close: 'Schließen',
    volume: 'Lautstärke',
    audioTracks: 'Tonspuren',
    subtitles: 'Untertitel',
    resolution: 'Qualität',
    auto: 'Automatisch'
  },

  pt: {
    // Navigation
    navLive: 'TV ao Vivo',
    navMovies: 'Filmes (VOD)',
    navSeries: 'Séries',
    navEpg: 'Guia de TV (EPG)',
    navFavorites: 'Favoritos',
    navRecordings: 'Gravações',
    navRecent: 'Recentes',
    navSettings: 'Configurações',
    navAddPlaylist: 'Adicionar Lista',

    // Search & Filters
    searchPlaceholder: 'Buscar canais, filmes, séries...',
    allCategories: 'Todas as categorias',
    itemsCount: 'itens',
    channelsCount: 'canais',
    noContent: 'Nenhum conteúdo encontrado',
    noContentDesc: 'Tente ajustar sua pesquisa ou selecione outra categoria.',
    clearFilters: 'Limpar filtros',

    // TV Remote & OSD
    tvModeTitle: 'Controle Smart TV & D-Pad',
    tvModeOn: 'Modo TV LIGADO',
    tvModeOff: 'Modo TV DESLIGADO',
    tvModeActive: 'Modo Smart TV (Controle) Ativado',
    tvModeInactive: 'Modo Mouse / Toque Ativado',
    tvRemoteLegend: 'Smart TV D-Pad',
    tvNavigate: 'Navegar',
    tvSelect: 'Reproduzir / Selecionar',
    tvBack: 'Voltar / Sair',
    tvDirectNumber: 'N° do Canal',
    tvZapping: 'Mudando canal',
    tvChannelNotFound: 'Canal não encontrado',
    tvToastCategories: '🔴 Categorias',
    tvToastEpg: '🟢 Guia de TV (EPG)',
    tvToastFavorites: '🟡 Favoritos',
    tvToastSettings: '🔵 Configurações',

    // Settings
    settingsTitle: 'Configurações do Player',
    settingsSubtitle: 'Personalize sua experiência de vídeo, players externos, idioma e roteamento de stream.',
    
    // Language Section
    languageSectionTitle: 'Idioma e Localização',
    languageSectionDesc: 'Selecione seu idioma entre os 6 mercados estratégicos mundiais.',
    activeLanguage: 'Idioma ativo',

    // Player Options
    playerSectionTitle: 'Motor de Reprodução de Vídeo',
    playerInternal: 'Player Web Integrado (HLS.js / HTML5)',
    playerExternal: 'Players Externos Diretos (VLC, ExoPlayer, MX, etc.)',
    playerChoiceTitle: 'Player de Vídeo Padrão',

    // User-Agent & Proxy
    userAgentTitle: 'Perfil User-Agent Ativo',
    userAgentDesc: 'Emula assinaturas de aplicativos ou navegadores para desbloquear canais.',
    streamProxyTitle: 'Modo Proxy de Streaming',
    streamProxyDesc: 'Resolve restrições de CORS, conteúdo misto HTTP/HTTPS e bloqueios de rede.',

    // Playlist Setup
    setupTitle: 'Gerenciamento de Listas',
    setupSubtitle: 'Adicione e gerencie suas listas M3U, Xtream Codes ou Stalker Portal.',
    addPlaylistBtn: 'Adicionar Lista',
    playlistName: 'Nome da Lista',
    playlistUrl: 'URL M3U / M3U8',
    xtreamHost: 'Servidor (ex: http://iptv-domain.com:8080)',
    xtreamUser: 'Usuário',
    xtreamPass: 'Senha',
    savePlaylist: 'Salvar e Carregar',
    cancel: 'Cancelar',

    // Video Player
    liveBadge: 'AO VIVO',
    nextProgram: 'A seguir',
    noEpgInfo: 'Sem informações no guia',
    pipMode: 'Picture-in-Picture',
    fullscreen: 'Tela cheia',
    close: 'Fechar',
    volume: 'Volume',
    audioTracks: 'Faixas de áudio',
    subtitles: 'Legendas',
    resolution: 'Qualidade',
    auto: 'Automático'
  },

  ar: {
    // Navigation
    navLive: 'البث المباشر (TV)',
    navMovies: 'الأفلام (VOD)',
    navSeries: 'المسلسلات',
    navEpg: 'دليل البرامج (EPG)',
    navFavorites: 'المفضلة',
    navRecordings: 'التسجيلات',
    navRecent: 'شوهدت مؤخراً',
    navSettings: 'الإعدادات',
    navAddPlaylist: 'إضافة قائمة',

    // Search & Filters
    searchPlaceholder: 'ابحث عن القنوات، الأفلام، المسلسلات...',
    allCategories: 'جميع التصنيفات',
    itemsCount: 'عنصر',
    channelsCount: 'قناة',
    noContent: 'لم يتم العثور على أي محتوى',
    noContentDesc: 'حاول تعديل كلمات البحث أو اختيار تصنيف مختلف.',
    clearFilters: 'إعادة ضبط الفلاتر',

    // TV Remote & OSD
    tvModeTitle: 'ريموت التلفزيون الذكي & D-Pad',
    tvModeOn: 'وضع التلفزيون مفعّل',
    tvModeOff: 'وضع التلفزيون معطّل',
    tvModeActive: 'تم تفعيل وضع التلفزيون الذكي (الريموت)',
    tvModeInactive: 'تم تفعيل وضع الماوس / اللمس',
    tvRemoteLegend: 'التحكم بالريموت',
    tvNavigate: 'التنقل',
    tvSelect: 'تشغيل / اختيار',
    tvBack: 'رجوع / خروج',
    tvDirectNumber: 'رقم القناة',
    tvZapping: 'التبديل للقناة',
    tvChannelNotFound: 'القناة غير موجودة',
    tvToastCategories: '🔴 التصنيفات',
    tvToastEpg: '🟢 دليل البرامج (EPG)',
    tvToastFavorites: '🟡 المفضلة',
    tvToastSettings: '🔵 الإعدادات',

    // Settings
    settingsTitle: 'إعدادات المشغل',
    settingsSubtitle: 'تخصيص تجربة المشاهدة، المشغلات الخارجية، لغة الواجهة وتوجيه البث.',
    
    // Language Section
    languageSectionTitle: 'اللغة والتعريب (RTL)',
    languageSectionDesc: 'اختر لغة الواجهة من بين الأسواق العالمية الـ 6 الأكثر طلباً لخدمات IPTV.',
    activeLanguage: 'اللغة الحالية',

    // Player Options
    playerSectionTitle: 'محرك تشغيل الفيديو',
    playerInternal: 'مشغل الويب المدمج (HLS.js / HTML5 Video)',
    playerExternal: 'المشغلات الخارجية المباشرة (VLC, ExoPlayer, MX Player)',
    playerChoiceTitle: 'المشغل الافتراضي',

    // User-Agent & Proxy
    userAgentTitle: 'ملف User-Agent النشط',
    userAgentDesc: 'يحاكي تواقيع التطبيقات أو المتصفحات لتجاوز حظر الروابط من مزودي الخدمة.',
    streamProxyTitle: 'وضع بروكسي البث',
    streamProxyDesc: 'يحل قيود CORS والبروتوكولات المختلطة وحظر مزودي الإنترنت.',

    // Playlist Setup
    setupTitle: 'إدارة قوائم التشغيل',
    setupSubtitle: 'إضافة وإدارة قوائم M3U وحسابات Xtream Codes وبوابات Stalker Portal.',
    addPlaylistBtn: 'إضافة قائمة تشغيل',
    playlistName: 'اسم القائمة',
    playlistUrl: 'رابط M3U / M3U8',
    xtreamHost: 'رابط الخادم (مثال: http://iptv-domain.com:8080)',
    xtreamUser: 'اسم المستخدم',
    xtreamPass: 'كلمة المرور',
    savePlaylist: 'حفظ وتحميل القائمة',
    cancel: 'إلغاء',

    // Video Player
    liveBadge: 'مباشر',
    nextProgram: 'التالي',
    noEpgInfo: 'لا توجد بيانات دليل برامج حالياً',
    pipMode: 'صورة داخل صورة',
    fullscreen: 'ملء الشاشة',
    close: 'إغلاق',
    volume: 'مستوى الصوت',
    audioTracks: 'المسارات الصوتية',
    subtitles: 'الترجمة',
    resolution: 'الجودة',
    auto: 'تلقائي'
  }
};

export function getInitialLanguage(): Language {
  const saved = localStorage.getItem('vision_language') as Language;
  if (saved && ['fr', 'en', 'es', 'de', 'pt', 'ar'].includes(saved)) {
    return saved;
  }

  // Detect browser language
  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (['fr', 'en', 'es', 'de', 'pt', 'ar'].includes(browserLang)) {
    return browserLang as Language;
  }

  return 'fr'; // Default
}
