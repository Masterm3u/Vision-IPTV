import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { cn } from '../App';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
}

export function LanguageSelector({
  currentLang,
  onLanguageChange,
  variant = 'dropdown',
  className
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'full') {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === currentLang;
          return (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              data-tv-focusable="true"
              className={cn(
                "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer",
                isSelected
                  ? "bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label={lang.label}>
                    {lang.flag}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {lang.nativeName}
                      </span>
                      {lang.dir === 'rtl' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                          RTL
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/50">{lang.label}</span>
                  </div>
                </div>

                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-emerald-500 border-emerald-500 text-black"
                    : "border-white/20 bg-black/40 text-transparent"
                )}>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-white/40 truncate">
                {lang.regionDescription}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-tv-focusable="true"
        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        title="Changer de langue / Change language"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-sm">{activeOption.flag}</span>
        <span className="hidden sm:inline font-bold uppercase text-[11px]">{activeOption.code}</span>
        <ChevronDown className={cn("w-3 h-3 text-white/50 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#141414] border border-white/15 shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5">
            Langue / Language
          </div>
          <div className="py-1 space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsOpen(false);
                  }}
                  data-tv-focusable="true"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer",
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-400 font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
