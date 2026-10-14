// Smart TV Remote & Spatial Navigation Engine
// Supports Samsung Tizen, LG webOS, Android TV, Fire TV, and Desktop Keyboard/Remote controllers

export type TVDirection = 'up' | 'down' | 'left' | 'right';

export interface TVKeyMapping {
  isUp: boolean;
  isDown: boolean;
  isLeft: boolean;
  isRight: boolean;
  isEnter: boolean;
  isBack: boolean;
  isChannelUp: boolean;
  isChannelDown: boolean;
  isRed: boolean;
  isGreen: boolean;
  isYellow: boolean;
  isBlue: boolean;
  isPlayPause: boolean;
  numberKey: number | null;
}

export function parseTVKeyEvent(e: KeyboardEvent): TVKeyMapping {
  const code = e.keyCode || e.which;
  const key = e.key;

  const isUp = key === 'ArrowUp' || key === 'Up' || code === 38;
  const isDown = key === 'ArrowDown' || key === 'Down' || code === 40;
  const isLeft = key === 'ArrowLeft' || key === 'Left' || code === 37;
  const isRight = key === 'ArrowRight' || key === 'Right' || code === 39;

  const isEnter = key === 'Enter' || key === 'Select' || key === 'Ok' || code === 13 || code === 29443;
  const isBack = 
    key === 'Escape' || 
    key === 'Back' || 
    key === 'BrowserBack' || 
    key === 'HistoryBack' || 
    key === 'GoBack' ||
    code === 27 || 
    code === 8 || 
    code === 10009 || // Samsung Tizen Return
    code === 461;    // LG webOS Back

  const isChannelUp = key === 'ChannelUp' || key === 'PageUp' || code === 33 || code === 427;
  const isChannelDown = key === 'ChannelDown' || key === 'PageDown' || code === 34 || code === 428;

  // TV Colored Buttons
  const isRed = key === 'ColorF0Red' || key === 'Red' || code === 403;
  const isGreen = key === 'ColorF1Green' || key === 'Green' || code === 404;
  const isYellow = key === 'ColorF2Yellow' || key === 'Yellow' || code === 405;
  const isBlue = key === 'ColorF3Blue' || key === 'Blue' || code === 406;

  // Media
  const isPlayPause = 
    key === 'MediaPlayPause' || 
    key === 'PlayPause' || 
    key === 'MediaPlay' || 
    key === 'MediaPause' || 
    code === 415 || 
    code === 19 || 
    code === 10252;

  // Numeric 0-9
  let numberKey: number | null = null;
  if (/^[0-9]$/.test(key)) {
    numberKey = parseInt(key, 10);
  } else if (code >= 48 && code <= 57) {
    numberKey = code - 48;
  } else if (code >= 96 && code <= 105) {
    numberKey = code - 96;
  }

  return {
    isUp,
    isDown,
    isLeft,
    isRight,
    isEnter,
    isBack,
    isChannelUp,
    isChannelDown,
    isRed,
    isGreen,
    isYellow,
    isBlue,
    isPlayPause,
    numberKey
  };
}

/**
 * Finds all currently visible and focusable DOM elements
 */
export function getFocusableElements(container: HTMLElement | Document = document): HTMLElement[] {
  const selector = [
    '[data-tv-focusable="true"]',
    'button:not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"]):not([data-tv-focusable="false"])',
    'a[href]:not([tabindex="-1"]):not([data-tv-focusable="false"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]):not([data-tv-focusable="false"])',
    '[tabindex="0"]:not([disabled]):not([data-tv-focusable="false"])',
    '[role="button"]:not([disabled]):not([tabindex="-1"]):not([data-tv-focusable="false"])'
  ].join(', ');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

  return elements.filter((el) => {
    if (!el || el.offsetParent === null) return false;
    if (el.getAttribute('data-tv-focusable') === 'false') return false;
    if (el.getAttribute('tabindex') === '-1') return false;
    if (el.closest('[data-tv-no-focus="true"]') || el.closest('[data-no-dpad="true"]')) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

/**
 * 2D Spatial Proximity Algorithm for TV D-Pad navigation
 */
export function findNextSpatialTarget(
  currentElement: HTMLElement,
  direction: TVDirection,
  candidates?: HTMLElement[]
): HTMLElement | null {
  const currentRect = currentElement.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2
  };

  const pool = candidates || getFocusableElements();
  let bestCandidate: HTMLElement | null = null;
  let minScore = Infinity;

  for (const candidate of pool) {
    if (candidate === currentElement || candidate.contains(currentElement) || currentElement.contains(candidate)) {
      continue;
    }

    const rect = candidate.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    let isCandidateInDirection = false;
    let primaryDelta = 0;
    let secondaryDelta = 0;
    let overlap = 0;

    switch (direction) {
      case 'up':
        isCandidateInDirection = rect.bottom <= currentRect.top + 10 && center.y < currentCenter.y;
        primaryDelta = currentRect.top - rect.bottom;
        secondaryDelta = Math.abs(center.x - currentCenter.x);
        overlap = Math.max(0, Math.min(currentRect.right, rect.right) - Math.max(currentRect.left, rect.left));
        break;

      case 'down':
        isCandidateInDirection = rect.top >= currentRect.bottom - 10 && center.y > currentCenter.y;
        primaryDelta = rect.top - currentRect.bottom;
        secondaryDelta = Math.abs(center.x - currentCenter.x);
        overlap = Math.max(0, Math.min(currentRect.right, rect.right) - Math.max(currentRect.left, rect.left));
        break;

      case 'left':
        isCandidateInDirection = rect.right <= currentRect.left + 10 && center.x < currentCenter.x;
        primaryDelta = currentRect.left - rect.right;
        secondaryDelta = Math.abs(center.y - currentCenter.y);
        overlap = Math.max(0, Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top));
        break;

      case 'right':
        isCandidateInDirection = rect.left >= currentRect.right - 10 && center.x > currentCenter.x;
        primaryDelta = rect.left - currentRect.right;
        secondaryDelta = Math.abs(center.y - currentCenter.y);
        overlap = Math.max(0, Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top));
        break;
    }

    if (!isCandidateInDirection) continue;

    // Weight secondary axis more heavily so it stays in the same row/column
    const overlapBonus = overlap > 0 ? (overlap / 2) : 0;
    const score = primaryDelta + (secondaryDelta * 2.2) - overlapBonus;

    if (score < minScore) {
      minScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}
