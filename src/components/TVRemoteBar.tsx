import React from 'react';
import { Tv, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../utils/i18n';

interface TVRemoteBarProps {
  tvMode: boolean;
  onToggleTvMode: () => void;
  lastAction: string | null;
  channelInputToast: string | null;
  lang?: Language;
}

export function TVRemoteBar({
  tvMode,
  onToggleTvMode,
  lastAction,
  channelInputToast,
  lang = 'fr'
}: TVRemoteBarProps) {
  const t = translations[lang] || translations.fr;

  return (
    <>
      {/* Dynamic Action Toast */}
      <AnimatePresence>
        {(lastAction || channelInputToast) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[90] bg-[#141414]/95 border border-emerald-500/50 backdrop-blur-xl px-5 py-2.5 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-3 text-white pointer-events-none"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
              <Tv className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-emerald-300">
              {channelInputToast || lastAction}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Smart TV D-Pad Remote Legend / Bar */}
      {tvMode && (
        <aside 
          aria-label="Contrôles télécommande Smart TV"
          className="fixed bottom-0 inset-x-0 bg-[#0A0A0A]/95 border-t border-white/10 backdrop-blur-md px-3 sm:px-6 py-1.5 z-40 flex items-center justify-between gap-3 text-[11px] text-white/70 overflow-x-auto custom-scrollbar select-none"
        >
          <div className="flex items-center gap-4 flex-wrap whitespace-nowrap">
            {/* TV Indicator */}
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.tvRemoteLegend}</span>
            </div>

            {/* Navigation shortcuts */}
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">▲▼◀▶</span>
              <span className="text-white/50">{t.tvNavigate}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">OK</span>
              <span className="text-white/50">{t.tvSelect}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">BACK</span>
              <span className="text-white/50">{t.tvBack}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">0-9</span>
              <span className="text-white/50">{t.tvDirectNumber}</span>
            </div>

            {/* Color buttons legend */}
            <div className="hidden lg:flex items-center gap-3 border-l border-white/10 pl-3">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                <span className="text-white/60">{t.navLive}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-white/60">{t.navEpg}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" />
                <span className="text-white/60">{t.navFavorites}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-white/60">{t.navSettings}</span>
              </div>
            </div>
          </div>

          {/* Quick toggle mode button */}
          <button
            onClick={onToggleTvMode}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            title="Activer ou désactiver l'affichage des touches TV"
          >
            <Sparkles className="w-3 h-3" />
            <span>{tvMode ? t.tvModeOn : t.tvModeOff}</span>
          </button>
        </aside>
      )}
    </>
  );
}
