import { IPTVChannel } from '../types/iptv';
import { fixUtf8 } from '../utils/utf8';
import { getLocalFile } from '../utils/localFileStore';

export interface XMLTVProgram {
  title: string;
  desc: string;
  category?: string;
  startTimestamp: number;
  endTimestamp: number;
  channelId: string;
}

// Parses XMLTV date format (e.g., "20260826040000 +0000" or "20260826040000" or ISO format)
export function parseXMLTVDate(dateStr: string): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  
  // Format: YYYYMMDDHHMMSS +/-ZZZZ
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, min, sec, tzSign, tzHours, tzMins] = match;
    let isoString = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    if (tzSign && tzHours && tzMins) {
      isoString += `${tzSign}${tzHours}:${tzMins}`;
    } else {
      isoString += 'Z';
    }
    const timestamp = new Date(isoString).getTime();
    if (!isNaN(timestamp)) return timestamp;
  }

  // Fallback direct Date parse
  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

// Cache storage for parsed XMLTV documents
const xmltvCache = new Map<string, {
  channels: Map<string, string[]>;
  programmesByChannel: Map<string, XMLTVProgram[]>;
  timestamp: number;
}>();

export function clearXMLTVCache(source?: string) {
  if (source) {
    xmltvCache.delete(source);
  } else {
    xmltvCache.clear();
  }
}

export class XMLTVService {
  private epgSource: string;
  private isRawXml: boolean;

  constructor(epgSource: string, isRawXml: boolean = false) {
    this.epgSource = epgSource;
    this.isRawXml = isRawXml;
  }

  async loadEPG(): Promise<{
    programmesByChannel: Map<string, XMLTVProgram[]>;
    channelNamesMap: Map<string, string>;
  }> {
    if (!this.epgSource) {
      return { programmesByChannel: new Map(), channelNamesMap: new Map() };
    }

    if (this.isRawXml) {
      return this.parseXML(this.epgSource);
    }

    const cached = xmltvCache.get(this.epgSource);
    // Cache valid for 30 minutes
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return {
        programmesByChannel: cached.programmesByChannel,
        channelNamesMap: new Map()
      };
    }

    // Check if it's a local storage reference: local://epg_{playlistId}
    if (this.epgSource.startsWith('local://')) {
      const localKey = this.epgSource.replace('local://', '');
      const localContent = await getLocalFile(localKey);
      if (localContent) {
        const result = this.parseXML(localContent);
        xmltvCache.set(this.epgSource, {
          channels: new Map(),
          programmesByChannel: result.programmesByChannel,
          timestamp: Date.now()
        });
        return result;
      }
    }

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(this.epgSource)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch XMLTV: ${res.statusText}`);
      }
      const xmlText = await res.text();
      const result = this.parseXML(xmlText);
      xmltvCache.set(this.epgSource, {
        channels: new Map(),
        programmesByChannel: result.programmesByChannel,
        timestamp: Date.now()
      });
      return result;
    } catch (err) {
      console.error('Error fetching XMLTV EPG:', err);
      return {
        programmesByChannel: new Map(),
        channelNamesMap: new Map()
      };
    }
  }

  parseXML(xmlText: string): {
    programmesByChannel: Map<string, XMLTVProgram[]>;
    channelNamesMap: Map<string, string>;
  } {
    const programmesByChannel = new Map<string, XMLTVProgram[]>();
    const channelNamesMap = new Map<string, string>();

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for XML parse errors
      const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        console.warn('XMLTV parser warning/error:', parseError.textContent);
      }

      // Parse channel elements
      const channelNodes = xmlDoc.getElementsByTagName('channel');
      for (let i = 0; i < channelNodes.length; i++) {
        const node = channelNodes[i];
        const id = node.getAttribute('id');
        if (!id) continue;

        const displayNameNode = node.getElementsByTagName('display-name')[0];
        const displayName = displayNameNode ? displayNameNode.textContent?.trim() || id : id;
        channelNamesMap.set(id.toLowerCase(), displayName);
        channelNamesMap.set(displayName.toLowerCase(), id);
      }

      // Parse programme elements
      const programmeNodes = xmlDoc.getElementsByTagName('programme');
      for (let i = 0; i < programmeNodes.length; i++) {
        const node = programmeNodes[i];
        const channelAttr = node.getAttribute('channel');
        const startAttr = node.getAttribute('start');
        const stopAttr = node.getAttribute('stop');

        if (!channelAttr || !startAttr) continue;

        const titleNode = node.getElementsByTagName('title')[0];
        const descNode = node.getElementsByTagName('desc')[0];
        const categoryNode = node.getElementsByTagName('category')[0];

        const title = titleNode ? fixUtf8(titleNode.textContent || '') : 'Programme sans titre';
        const desc = descNode ? fixUtf8(descNode.textContent || '') : '';
        const category = categoryNode ? fixUtf8(categoryNode.textContent || '') : undefined;

        const startTimestamp = parseXMLTVDate(startAttr);
        const endTimestamp = stopAttr ? parseXMLTVDate(stopAttr) : startTimestamp + 3600 * 1000;

        if (startTimestamp === 0) continue;

        const program: XMLTVProgram = {
          title,
          desc,
          category,
          startTimestamp,
          endTimestamp,
          channelId: channelAttr
        };

        const channelKey = channelAttr.toLowerCase().trim();
        if (!programmesByChannel.has(channelKey)) {
          programmesByChannel.set(channelKey, []);
        }
        programmesByChannel.get(channelKey)!.push(program);
      }

      // Sort programmes for each channel by start time
      programmesByChannel.forEach((progs) => {
        progs.sort((a, b) => a.startTimestamp - b.startTimestamp);
      });

      return { programmesByChannel, channelNamesMap };
    } catch (error) {
      console.error('Error parsing XMLTV:', error);
      return { programmesByChannel, channelNamesMap };
    }
  }

  // Find programs matching a given IPTV channel
  static findProgramsForChannel(
    channel: IPTVChannel,
    programmesByChannel: Map<string, XMLTVProgram[]>
  ): XMLTVProgram[] {
    if (!programmesByChannel || programmesByChannel.size === 0) return [];

    // 1. Try match by epgId (tvg-id)
    if (channel.epgId) {
      const byTvgId = programmesByChannel.get(channel.epgId.toLowerCase().trim());
      if (byTvgId && byTvgId.length > 0) return byTvgId;
    }

    // 2. Try match by channel id
    if (channel.id) {
      const byId = programmesByChannel.get(channel.id.toLowerCase().trim());
      if (byId && byId.length > 0) return byId;
    }

    // 3. Try match by channel name
    if (channel.name) {
      const cleanName = channel.name
        .toLowerCase()
        .replace(/^(fr|ca|be|us|uk|es|it|de)[:|\s\-]+/i, '')
        .replace(/\b(hd|fhd|uhd|4k|hevc|1080p|720p)\b/gi, '')
        .trim();

      // Exact clean name
      const byName = programmesByChannel.get(cleanName);
      if (byName && byName.length > 0) return byName;

      // Partial name search across map keys
      for (const [key, progs] of programmesByChannel.entries()) {
        if (key.includes(cleanName) || cleanName.includes(key)) {
          return progs;
        }
      }
    }

    return [];
  }
}
