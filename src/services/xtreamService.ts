import { IPTVChannel, IPTVPlaylist } from '../types/iptv';
import { decodeBase64Utf8, fixUtf8 } from '../utils/utf8';

export class XtreamService {
  private baseUrl: string;
  private username?: string;
  private password?: string;

  constructor(playlist: IPTVPlaylist) {
    this.baseUrl = playlist.url;
    this.username = playlist.username;
    this.password = playlist.password;
  }

  private getApiUrl(action: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}/player_api.php`);
    url.searchParams.append('username', this.username || '');
    url.searchParams.append('password', this.password || '');
    url.searchParams.append('action', action);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return `/api/proxy?url=${encodeURIComponent(url.toString())}`;
  }

  async authenticate() {
    try {
      const url = this.getApiUrl(''); // Base auth check
      const response = await fetch(url);
      if (!response.ok) return null;
      const text = await response.text();
      if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
        return null;
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async getLiveChannels(): Promise<IPTVChannel[]> {
    try {
      const [streamsRes, catsRes] = await Promise.all([
        fetch(this.getApiUrl('get_live_streams')),
        fetch(this.getApiUrl('get_live_categories'))
      ]);
      
      const streamsText = await streamsRes.text();
      const catsText = await catsRes.text();

      let streams: any[] = [];
      let categories: any[] = [];

      if (streamsText && (streamsText.trim().startsWith('[') || streamsText.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(streamsText);
          streams = Array.isArray(parsed) ? parsed : [];
        } catch {}
      }

      if (catsText && (catsText.trim().startsWith('[') || catsText.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(catsText);
          categories = Array.isArray(parsed) ? parsed : [];
        } catch {}
      }

      const catMap = new Map(categories.map((c: any) => [c.category_id, fixUtf8(c.category_name)]));
      
      return streams.map((item: any) => ({
        id: item.stream_id?.toString() || Math.random().toString(),
        name: fixUtf8(item.name || 'Chaîne'),
        group: catMap.get(item.category_id) || fixUtf8(item.category_name?.trim()) || 'Uncategorized',
        logo: item.stream_icon,
        url: `${this.baseUrl}/live/${this.username}/${this.password}/${item.stream_id}.m3u8`,
        epgId: item.epg_channel_id
      }));
    } catch (err) {
      console.warn('Failed to get live channels from Xtream:', err);
      return [];
    }
  }

  async getMovies(): Promise<IPTVChannel[]> {
    try {
      const [streamsRes, catsRes] = await Promise.all([
        fetch(this.getApiUrl('get_vod_streams')),
        fetch(this.getApiUrl('get_vod_categories'))
      ]);
      
      const streamsText = await streamsRes.text();
      const catsText = await catsRes.text();

      let streams: any[] = [];
      let categories: any[] = [];

      if (streamsText && (streamsText.trim().startsWith('[') || streamsText.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(streamsText);
          streams = Array.isArray(parsed) ? parsed : [];
        } catch {}
      }

      if (catsText && (catsText.trim().startsWith('[') || catsText.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(catsText);
          categories = Array.isArray(parsed) ? parsed : [];
        } catch {}
      }
      
      const catMap = new Map(categories.map((c: any) => [c.category_id, fixUtf8(c.category_name)]));
      
      return streams.map((item: any) => ({
        id: item.stream_id?.toString() || Math.random().toString(),
        name: fixUtf8(item.name || 'Film'),
        group: catMap.get(item.category_id) || fixUtf8(item.category_name?.trim()) || 'Uncategorized',
        logo: item.stream_icon,
        url: `${this.baseUrl}/movie/${this.username}/${this.password}/${item.stream_id}.${item.container_extension || 'mp4'}`,
      }));
    } catch (err) {
      console.warn('Failed to get movies from Xtream:', err);
      return [];
    }
  }

  async getShortEpg(streamId: string): Promise<any[]> {
    try {
      const url = this.getApiUrl('get_short_epg', { stream_id: streamId });
      const response = await fetch(url);
      if (!response.ok) return [];

      const text = await response.text();
      if (!text) return [];

      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // Handled rate limiting / non-JSON responses from server gracefully
        return [];
      }

      const data = JSON.parse(trimmed);

      if (data && data.epg_listings && Array.isArray(data.epg_listings)) {
        return data.epg_listings.map((item: any) => {
          const title = item.title ? decodeBase64Utf8(item.title) : 'No Title';
          const desc = item.description ? decodeBase64Utf8(item.description) : 'No Details';
          
          let startTimestamp = 0;
          let endTimestamp = 0;

          if (item.start_timestamp) {
            startTimestamp = parseInt(item.start_timestamp) * 1000;
          } else if (item.start) {
            startTimestamp = new Date(item.start.replace(' ', 'T')).getTime();
          }

          if (item.end_timestamp) {
            endTimestamp = parseInt(item.end_timestamp) * 1000;
          } else if (item.end) {
            endTimestamp = new Date(item.end.replace(' ', 'T')).getTime();
          }

          return {
            title,
            desc,
            startTimestamp,
            endTimestamp,
            start: startTimestamp,
            stop: endTimestamp
          };
        });
      }
    } catch {
      // Graceful fallback on malformed response
    }
    return [];
  }
}

