import { IPTVChannel } from '../types/iptv';
import { fixUtf8 } from './utf8';

export function extractEpgUrlFromM3U(content: string): string | undefined {
  if (!content) return undefined;
  const headerSlice = content.slice(0, 4000);
  const match = headerSlice.match(/(?:url-tvg|x-tvg-url|tvg-url)="([^"]+)"/i);
  return match ? match[1].trim() : undefined;
}

export function extractGlobalUserAgentFromM3U(content: string): string | undefined {
  if (!content) return undefined;
  const headerSlice = content.slice(0, 4000);
  const match = headerSlice.match(/(?:http-user-agent|user-agent)="([^"]+)"/i) 
    || headerSlice.match(/#EXTVLCOPT:(?:http-user-agent|user-agent)=([^\r\n]+)/i);
  return match ? match[1].trim() : undefined;
}

export function parseM3U(content: string): IPTVChannel[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const channels: IPTVChannel[] = [];
  let currentChannel: Partial<IPTVChannel> = {};
  let pendingUserAgent: string | undefined = undefined;
  let pendingReferrer: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Directives like #EXTVLCOPT:http-user-agent=... or #EXTVLCOPT:http-referrer=...
    if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#EXTHTTP:')) {
      const uaMatch = line.match(/(?:http-user-agent|user-agent)=([^\r\n]+)/i)
        || line.match(/"User-Agent"\s*:\s*"([^"]+)"/i);
      if (uaMatch) {
        pendingUserAgent = uaMatch[1].trim();
      }

      const refMatch = line.match(/(?:http-referrer|referrer|referer)=([^\r\n]+)/i)
        || line.match(/"Referer"\s*:\s*"([^"]+)"/i);
      if (refMatch) {
        pendingReferrer = refMatch[1].trim();
      }
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const commaIdx = line.indexOf(',');
      const rawName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Unknown Channel';
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const epgMatch = line.match(/tvg-id="([^"]*)"/i);
      const uaMatch = line.match(/(?:http-user-agent|user-agent)="([^"]*)"/i);
      const refMatch = line.match(/(?:http-referrer|referrer|referer)="([^"]*)"/i);

      currentChannel = {
        name: fixUtf8(rawName),
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch && groupMatch[1].trim() ? fixUtf8(groupMatch[1].trim()) : 'Uncategorized',
        epgId: epgMatch ? epgMatch[1] : undefined,
        userAgent: uaMatch ? uaMatch[1].trim() : pendingUserAgent,
        httpReferrer: refMatch ? refMatch[1].trim() : pendingReferrer,
      };

      pendingUserAgent = undefined;
      pendingReferrer = undefined;
    } else if (!line.startsWith('#')) {
      // Any non-comment line following EXTINF is considered the stream URL
      if (currentChannel.name) {
        let streamUrl = line;
        let channelUa = currentChannel.userAgent;
        let channelRef = currentChannel.httpReferrer;

        // Check if URL has pipe-separated parameters: http://server/stream.m3u8|User-Agent=...&Referer=...
        if (streamUrl.includes('|')) {
          const [cleanUrl, optionsStr] = streamUrl.split('|');
          streamUrl = cleanUrl.trim();
          if (optionsStr) {
            const uaOptionMatch = optionsStr.match(/(?:user-agent|http-user-agent)=([^&]+)/i);
            if (uaOptionMatch && !channelUa) {
              channelUa = decodeURIComponent(uaOptionMatch[1].trim());
            }
            const refOptionMatch = optionsStr.match(/(?:referer|referrer|http-referrer)=([^&]+)/i);
            if (refOptionMatch && !channelRef) {
              channelRef = decodeURIComponent(refOptionMatch[1].trim());
            }
          }
        }

        channels.push({
          ...currentChannel as IPTVChannel,
          id: Math.random().toString(36).substring(2, 11),
          url: streamUrl,
          userAgent: channelUa,
          httpReferrer: channelRef,
        });
        currentChannel = {};
      }
    }
  }

  return channels;
}

