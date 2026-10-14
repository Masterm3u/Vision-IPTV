export interface IPTVChannel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
  epgId?: string;
  userAgent?: string;
  httpReferrer?: string;
}

export interface IPTVPlaylist {
  id: string;
  name: string;
  type: 'm3u' | 'xtream' | 'stalker';
  url: string;
  epgUrl?: string;
  isLocal?: boolean;
  localM3uFileName?: string;
  localEpgFileName?: string;
  isEpgCustomized?: boolean;
  username?: string;
  password?: string;
  lastUpdated: number;
  userAgent?: string;
  httpReferrer?: string;
}

export type UserAgentMode = 'auto' | 'chrome' | 'safari' | 'firefox' | 'vlc' | 'tivimate' | 'smarters' | 'custom';
export type StreamProxyMode = 'auto' | 'always' | 'direct';
export type PlayerChoice = 'internal' | 'vlc' | 'exoplayer' | 'mxplayer' | 'potplayer' | 'iina' | 'mpv' | 'nplayer' | 'prompt';

export interface EPGProgram {
  start: number;
  stop: number;
  title: string;
  description?: string;
  channelId: string;
}

export interface RecordingItem {
  id: string;
  programTitle: string;
  channelId: string;
  channelName: string;
  channelLogo?: string;
  streamUrl?: string;
  startTime: number; // timestamp in ms
  endTime: number; // timestamp in ms
  status: 'scheduled' | 'recording' | 'completed' | 'failed';
  recordedDurationMinutes?: number;
  fileSize?: string;
  description?: string;
  category?: string;
  createdAt: number;
}

export interface ProgramReminder {
  id: string;
  programTitle: string;
  channelId: string;
  channelName: string;
  channelLogo?: string;
  startTs: number;
  stopTs?: number;
  remindMinutesBefore: number; // default 5 minutes
  remindAtTs: number;
  notified?: boolean;
  createdAt: number;
}

export type ViewMode = 'live' | 'vod' | 'series' | 'epg' | 'favorites' | 'recordings' | 'recent' | 'settings' | 'setup';
