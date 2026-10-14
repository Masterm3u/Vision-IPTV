import React, { useState } from 'react';
import { Download, Tv, Smartphone, HelpCircle, Check, ExternalLink, X, Monitor, ShieldCheck, Flame } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { VisionLogo } from './VisionLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'settings' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pwabuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(currentAppUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentAppUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Trigger Button based on variant */}
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          data-tv-focusable="true"
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            isInstalled 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-emerald-500 hover:bg-emerald-400 text-black border-transparent shadow-md shadow-emerald-500/20 active:scale-95'
          } ${className}`}
          title="Installer l'application sur Firestick, PC ou Mobile"
        >
          {isInstalled ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Installée</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Installer l'App</span>
              <span className="sm:hidden">Installer</span>
            </>
          )}
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handleInstallClick}
          data-tv-focusable="true"
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 group ${className}`}
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-emerald-400 group-hover:text-black transition-colors" />
            <span>Installer l'application (Firestick / TV)</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 group-hover:bg-black/20 group-hover:text-black">
            PWA / APK
          </span>
        </button>
      )}

      {variant === 'settings' && (
        <div className={`p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 flex-shrink-0">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm sm:text-base">Installer sur Firestick &amp; Téléviseur</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                  Optimisé TV
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1 max-w-xl">
                Ajoutez l'icône de Vision IPTV directement sur l'écran d'accueil de votre Fire TV Stick ou téléviseur Android pour un lancement instantané sans navigateur.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            data-tv-focusable="true"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Voir les étapes d'installation</span>
          </button>
        </div>
      )}

      {/* Installation Guide Modal for Fire TV & Android */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#12161F] border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto custom-scrollbar relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <VisionLogo size="sm" variant="icon-only" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    Installation sur Firestick &amp; Téléviseur
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      Fire TV
                    </span>
                  </h3>
                  <p className="text-xs text-white/50">
                    3 méthodes simples pour profiter de Vision IPTV avec votre télécommande
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct 1-Click Install if supported */}
            {isInstallable && (
              <div className="my-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-emerald-400 text-sm">Installation automatique disponible</h4>
                  <p className="text-xs text-white/70 mt-0.5">Votre appareil supporte l'installation directe en un clic.</p>
                </div>
                <button
                  onClick={async () => {
                    const res = await install();
                    if (res) setShowModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer"
                >
                  Installer maintenant
                </button>
              </div>
            )}

            {/* Clarification Alert on AI Studio vs Direct URL */}
            <div className="my-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Pourquoi l'adresse « aistudio.google.com » ne fonctionne pas dans PWABuilder ?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                L'adresse que vous avez copiée (<code>https://aistudio.google.com/apps/...</code>) est la console privée de Google protégée par votre compte Google.
                Les robots comme PWABuilder ne peuvent pas s'y connecter et tombent sur la page de connexion Google, c'est pourquoi ils ne voient pas les fichiers.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
                <span className="text-[11px] font-bold text-white">Votre adresse directe d'application :</span>
                <div className="flex items-center gap-2">
                  <code className="text-emerald-400 font-mono text-[11px] bg-black/60 px-2 py-1 rounded border border-white/10 select-all">
                    {currentAppUrl}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded text-[11px] transition-all cursor-pointer whitespace-nowrap"
                  >
                    {copiedUrl ? '✓ Copié !' : 'Copier l\'adresse'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-Step Methods */}
            <div className="space-y-4 my-4">
              {/* Method 1: Amazon Silk Browser on Firestick (Fastest & 100% working) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-white/[0.03] to-transparent border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-extrabold text-[11px]">1</span>
                    Installation Directe sur Firestick (Recommandée - 2 min)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                    Sans logiciel tiers
                  </span>
                </div>
                <div className="text-xs text-white/80 space-y-2 leading-relaxed">
                  <p>
                    1. Sur votre Firestick, allumez la télécommande et ouvrez <strong>Amazon Silk Browser</strong> (icône bleue "Internet").
                  </p>
                  <p>
                    2. Tapez directement l'adresse de votre application dans la barre Silk :
                  </p>
                  <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-white/10">
                    <code className="text-emerald-400 font-mono text-xs font-bold flex-1 select-all break-all">
                      {currentAppUrl}
                    </code>
                    <button
                      onClick={handleCopyUrl}
                      className="px-2.5 py-1 bg-white/10 hover:bg-emerald-500 hover:text-black rounded-lg text-[11px] font-bold transition-all text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                      <span>{copiedUrl ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <p>
                    3. Connectez-vous si Google vous le demande une première fois.
                  </p>
                  <p>
                    4. Appuyez sur la touche <strong>Menu (3 barres horizontales)</strong> de votre télécommande Fire TV.
                  </p>
                  <p>
                    5. Cliquez sur <strong>« Ajouter à la liste d'applications »</strong> ou <strong>« Ajouter aux favoris / écran d'accueil »</strong>.
                  </p>
                  <p className="text-emerald-400 font-medium">
                    ✨ Vision IPTV apparaîtra désormais avec son icône sur votre écran d'accueil Fire TV et s'ouvrira en plein écran !
                  </p>
                </div>
              </div>

              {/* Method 2: Convert to Standalone APK */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-[11px]">2</span>
                    Générer un fichier APK Android / Fire TV
                  </span>
                  <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded font-mono">
                    Fichier .APK
                  </span>
                </div>
                <div className="text-xs text-white/70 space-y-2 leading-relaxed">
                  <p>
                    Tous les fichiers requis par PWABuilder (<strong>manifest.json</strong>, <strong>sw.js</strong>, icônes 192x192, 512x512 et maskable) sont créés et intégrés dans le code source.
                  </p>
                  <p>
                    Pour que des outils tiers automatisés comme PWABuilder ou Web2Apk puissent scanner votre application sans être arrêtés par le pare-feu Google AI Studio :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-white/60 pl-1">
                    <li>Vous pouvez déployer gratuitement le code sur <strong>Vercel</strong>, <strong>Netlify</strong> ou <strong>Cloudflare</strong> (1 clic avec GitHub).</li>
                    <li>Ou utiliser un convertisseur PWA vers APK local (comme <em>Bubblewrap CLI</em> de Google ou <em>WebAPK Tool</em>).</li>
                  </ul>
                </div>
              </div>

              {/* Method 3: iOS / Safari */}
              {isIOS && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
                    <Smartphone className="w-4 h-4" />
                    Installation sur iPhone / iPad (iOS Safari)
                  </span>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Touchez le bouton <strong>Partager</strong> en bas de Safari, puis faites défiler et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
