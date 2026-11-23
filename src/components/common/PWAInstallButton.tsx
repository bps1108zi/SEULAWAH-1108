import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  Share,
} from 'lucide-react';

interface Props {
  variant?: 'navbar' | 'prominent' | 'mobile-banner';
  onDismissBanner?: () => void;
}

export const PWAInstallButton: React.FC<Props> = ({
  variant = 'navbar',
  onDismissBanner,
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'prominent') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Terpasang di Perangkat</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (variant === 'mobile-banner') {
    return (
      <>
        <div className="md:hidden bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between gap-2.5 border border-blue-800/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="Ikon SEULAWAH"
              className="w-10 h-10 rounded-xl border border-white/20 object-cover shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <p className="text-xs font-extrabold leading-tight truncate">
                Pasang SEULAWAH di HP
              </p>
              <p className="text-[11px] text-blue-200 truncate">
                Buka cepat layaknya aplikasi Android/iOS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[40px] px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstallable ? 'Pasang' : 'Install'}</span>
            </button>
            {onDismissBanner && (
              <button
                type="button"
                onClick={onDismissBanner}
                aria-label="Tutup banner pasang aplikasi"
                className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showGuide && (
          <InstallGuideModal
            onClose={() => setShowGuide(false)}
            isIOS={isIOS}
            isInIframe={isInIframe}
            isInstallable={isInstallable}
            onDirectInstall={install}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`min-h-[40px] flex items-center gap-1.5 rounded-xl font-bold text-xs transition active:scale-95 whitespace-nowrap shrink-0 ${
          variant === 'prominent'
            ? 'w-full justify-center bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2.5 shadow-sm'
            : 'bg-white/12 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5'
        }`}
        title="Pasang SEULAWAH sebagai aplikasi di HP Android / iOS"
      >
        <Smartphone className="w-4 h-4 text-orange-300 shrink-0" />
        <span className="hidden sm:inline">
          {isInstallable ? 'Pasang di HP / PC' : 'Aplikasi HP'}
        </span>
        <span className="sm:hidden">{isInstallable ? 'Pasang' : 'App HP'}</span>
      </button>

      {showGuide && (
        <InstallGuideModal
          onClose={() => setShowGuide(false)}
          isIOS={isIOS}
          isInIframe={isInIframe}
          isInstallable={isInstallable}
          onDirectInstall={install}
        />
      )}
    </>
  );
};

interface ModalProps {
  onClose: () => void;
  isIOS: boolean;
  isInIframe: boolean;
  isInstallable: boolean;
  onDirectInstall: () => Promise<boolean>;
}

const InstallGuideModal: React.FC<ModalProps> = ({
  onClose,
  isIOS,
  isInIframe,
  isInstallable,
  onDirectInstall,
}) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in restricted sandbox
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile sheet drag handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="Logo SEULAWAH"
              className="w-12 h-12 rounded-2xl border border-slate-200 shadow-xs object-cover shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Pasang Aplikasi SEULAWAH
              </h3>
              <p className="text-xs text-slate-500 truncate">
                BPS Kabupaten Aceh Besar · Versi Mobile App
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan pasang aplikasi"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-slate-600">
          {isInstallable && (
            <button
              type="button"
              onClick={async () => {
                const ok = await onDirectInstall();
                if (ok) onClose();
              }}
              className="w-full min-h-[48px] rounded-xl bg-blue-800 hover:bg-blue-900 active:scale-[0.99] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Pasang SEULAWAH Sekarang (1 Ketuk)</span>
            </button>
          )}

          {isInIframe && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-2.5">
              <p className="font-bold text-xs leading-snug">
                Membuka dari pratinjau? Buka di browser HP penuh (Chrome / Safari) agar tombol instalasi native muncul:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Browser Penuh</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {isIOS ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Share className="w-4 h-4 text-blue-700" />
                <span>Cara Pasang di iPhone / iPad (Safari):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
                <li>
                  Buka halaman SEULAWAH menggunakan browser <strong>Safari</strong>.
                </li>
                <li>
                  Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                </li>
                <li>
                  Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong> (Add to Home Screen).
                </li>
                <li>
                  Ketuk <strong>Tambah</strong> — ikon <strong>SEULAWAH</strong> langsung terpasang di HP Anda.
                </li>
              </ol>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <MoreVertical className="w-4 h-4 text-blue-700" />
                <span>Cara Pasang di HP Android (Google Chrome / Edge):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
                <li>
                  Pastikan aplikasi dibuka pada tab browser utama (bukan jendela pratinjau).
                </li>
                <li>
                  Ketuk menu <strong>Titik Tiga (⋮)</strong> di sudut kanan atas browser Chrome.
                </li>
                <li>
                  Pilih <strong>&ldquo;Tambahkan ke layar utama&rdquo;</strong> atau <strong>&ldquo;Pasang aplikasi&rdquo;</strong>.
                </li>
                <li>
                  Ketuk <strong>Pasang</strong> — aplikasi <strong>SEULAWAH</strong> siap dibuka layar penuh tanpa address bar &amp; tetap bisa diakses offline!
                </li>
              </ol>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-bold shadow-xs transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
