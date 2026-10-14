import React from 'react';
import { clsx } from 'clsx';

interface VisionLogoProps {
  variant?: 'full' | 'icon-only' | 'stacked';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export const VisionLogo: React.FC<VisionLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = true
}) => {
  const sizeMap = {
    xs: { icon: 'w-6 h-6', text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    sm: { icon: 'w-8 h-8', text: 'text-base', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { icon: 'w-10 h-10', text: 'text-xl', badge: 'text-[10px] px-2 py-0.5' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', badge: 'text-xs px-2.5 py-1' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl', badge: 'text-sm px-3 py-1.5' },
  };

  const currentSize = sizeMap[size];

  // The distinctive brand icon SVG
  const IconElement = (
    <div className={clsx(
      "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#06151E] via-[#0A2222] to-[#040C12] border border-emerald-500/40 shadow-lg shadow-emerald-500/20 flex-shrink-0 group-hover:border-emerald-400 group-hover:shadow-emerald-500/30 transition-all",
      currentSize.icon
    )}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-[6px] pointer-events-none" />

      <svg 
        viewBox="0 0 100 100" 
        className="w-[78%] h-[78%] relative z-10 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="logoAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* TV Contour Screen */}
        <rect x="12" y="18" width="76" height="54" rx="10" stroke="#1E293B" strokeWidth="2.5" fill="#060C14" />
        <rect x="14" y="20" width="72" height="50" rx="8" fill="rgba(255,255,255,0.03)" />

        {/* Broadcast Antenna Signal Waves */}
        <path d="M 42 12 C 47 9 53 9 58 12" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        <path d="M 37 7 C 45 3 55 3 63 7" stroke="#34D399" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

        {/* Stylized Modern V wings */}
        <path d="M 28 32 L 42 32 L 50 60 L 43 60 Z" fill="url(#logoAccent)" />
        <path d="M 72 32 L 58 32 L 50 60 L 57 60 Z" fill="url(#logoPrimary)" />

        {/* Glowing Center Play Arrow */}
        <polygon points="46,39 46,55 60,47" fill="#FFFFFF" />
        <polygon points="47,41 47,53 57,47" fill="url(#logoPrimary)" />

        {/* TV Stand Base */}
        <path d="M 44 72 L 56 72 L 59 79 L 41 79 Z" fill="#1E293B" />
        <rect x="33" y="79" width="34" height="3" rx="1.5" fill="url(#logoPrimary)" />
      </svg>
    </div>
  );

  if (variant === 'icon-only') {
    return (
      <div className={clsx("inline-flex items-center", className)}>
        {IconElement}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={clsx("flex flex-col items-center text-center gap-3", className)}>
        {IconElement}
        <div>
          <div className="flex items-center justify-center gap-2">
            <span className={clsx("font-black tracking-tight text-white", currentSize.text)}>
              VISION
            </span>
            <span className={clsx(
              "font-extrabold font-mono tracking-wider bg-emerald-500 text-black rounded-lg uppercase shadow-sm",
              currentSize.badge
            )}>
              IPTV
            </span>
          </div>
          {showSubtitle && (
            <p className="text-[11px] text-emerald-400/80 font-bold tracking-widest uppercase mt-0.5">
              Player &amp; Enregistreur
            </p>
          )}
        </div>
      </div>
    );
  }

  // Full Horizontal
  return (
    <div className={clsx("flex items-center gap-3 min-w-0 select-none group", className)}>
      {IconElement}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx("font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors", currentSize.text)}>
            VISION
          </span>
          <span className={clsx(
            "font-extrabold font-mono tracking-wider bg-emerald-500 text-black rounded-lg uppercase shadow-sm",
            currentSize.badge
          )}>
            IPTV
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] text-white/40 font-medium tracking-wide truncate">
            Live TV • EPG • VOD
          </span>
        )}
      </div>
    </div>
  );
};
