import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 no-print">
      <div className="glass-panel p-4 rounded-2xl border border-violet-500/50 shadow-2xl bg-slate-900/95 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt="WeightTracker App Icon"
            className="w-10 h-10 rounded-xl shadow-lg shadow-violet-500/25 ring-1 ring-white/20 object-cover shrink-0"
          />
          <div>
            <h4 className="text-xs font-extrabold text-white">Install WeightTracker</h4>
            <p className="text-[11px] text-slate-300">Add to your home screen for one-tap weigh-ins, online or off.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="p-1 text-slate-400 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
