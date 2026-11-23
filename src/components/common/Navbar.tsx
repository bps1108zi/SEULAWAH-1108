import React from 'react';
import { User } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { LogOut, Menu } from 'lucide-react';

interface Props {
  currentUser: User;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  onLogout,
  onToggleSidebar,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-sm border-b border-blue-800/60 pt-safe">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 min-w-0">
        {/* Left: Mobile drawer trigger & SEULAWAH Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Buka menu navigasi"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="Logo SEULAWAH"
              className="w-9 h-9 rounded-xl border border-white/20 object-cover shadow-xs shrink-0"
            />
            <div className="min-w-0 max-w-[170px] sm:max-w-md">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wide leading-none text-white truncate">
                  SEULAWAH
                </span>
                <span className="hidden sm:inline text-[11px] font-semibold text-orange-300 whitespace-nowrap">
                  BPS 1108
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-blue-200/90 font-medium leading-tight truncate mt-0.5">
                Sistem Ekonomi Unggulan &amp; Layanan Analisis Wilayah Aceh Besar
              </p>
            </div>
          </div>
        </div>

        {/* Right: App Install & User Session */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PWAInstallButton variant="navbar" />

          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-blue-300/40 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-white shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden sm:block text-left max-w-[165px] min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-blue-200/85 truncate leading-tight mt-0.5">
                {currentUser.role === 'admin' ? 'Admin' : 'Pengguna'} · {currentUser.institution}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar dari akun"
              title="Keluar (Logout)"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-red-500/20 hover:bg-red-500/35 text-red-200 hover:text-white transition active:scale-95 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
