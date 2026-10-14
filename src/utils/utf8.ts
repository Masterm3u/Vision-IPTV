/**
 * High-performance UTF-8 mojibake repair utility
 */

const MOJIBAKE_MAP: Record<string, string> = {
  'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
  'Ã ': 'à', 'Ã¢': 'â', 'Ã¤': 'ä',
  'Ã®': 'î', 'Ã¯': 'ï',
  'Ã´': 'ô', 'Ã¶': 'ö',
  'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
  'Ã§': 'ç',
  'Ã‰': 'É', 'Ãˆ': 'È', 'ÃŠ': 'Ê',
  'Ã€': 'À', 'Ã‚': 'Â', 'Ã”': 'Ô', 'ÃŽ': 'Î', 'Ã‡': 'Ç',
  'Ã™': 'Ù', 'Ã›': 'Û', 'Ã±': 'ñ', 'Ã‘': 'Ñ',
  'â€™': '’', 'â€˜': '‘', 'â€œ': '“', 'â€\x9d': '”', 'â€\x9c': '“',
  'â€“': '–', 'â€”': '—', 'â€¦': '…',
  'Â«': '«', 'Â»': '»', 'Â°': '°', 'Â©': '©', 'Â®': '®',
  'Â': ''
};

// Single regex to match any mojibake in 1 pass
const MOJIBAKE_REGEX = /(Ã[©èêë àâäîïôöùûüç‰ˆŠ€‚”Ž‡™›±‘]|â€[™€˜“”–—…]|â€[\x9c\x9d]|Â[«»°©®]|Â)/g;

/**
 * Safely and quickly fixes strings suffering from mojibake (UTF-8 decoded as Latin1)
 */
export function fixUtf8(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || '';
  if (!text.includes('Ã') && !text.includes('Â') && !text.includes('â€')) {
    return text;
  }
  return text.replace(MOJIBAKE_REGEX, (match) => MOJIBAKE_MAP[match] !== undefined ? MOJIBAKE_MAP[match] : match);
}

/**
 * Safely decodes base64 strings containing UTF-8 characters (like Xtream codes EPG titles & descriptions)
 */
export function decodeBase64Utf8(str: string | null | undefined): string {
  if (!str) return '';
  const trimmed = str.trim();
  
  if (!trimmed || trimmed.includes(' ') || trimmed.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return fixUtf8(trimmed);
  }

  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return fixUtf8(decoded);
  } catch {
    return fixUtf8(trimmed);
  }
}
