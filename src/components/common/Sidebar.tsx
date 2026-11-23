import React from 'react';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  TrendingUp,
  Database,
  Users,
  Smartphone,
  Layers,
  Calendar,
  Menu,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab =
  | 'dashboard'
  | 'economy'
  | 'input-data'
  | 'manage-indicators'
  | 'release-schedule'
  | 'accounts';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  userRole,
  isOpenMobile,
  onCloseMobile,
  onOpenMobile,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      subtitle: 'Karakteristik Pengguna',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: 'economy' as NavTab,
      label: 'Perekonomian Kita',
      subtitle: 'PDRB, LQ, DLQ, Klassen & Shift-Share',
      icon: TrendingUp,
      adminOnly: false,
    },
    {
      id: 'input-data' as NavTab,
      label: 'Input Data',
      subtitle: 'Sumber Data, Nomenklatur & Rumus',
      icon: Database,
      adminOnly: true,
    },
    {
      id: 'manage-indicators' as NavTab,
      label: 'Daftar Indikator',
      subtitle: 'Lihat Nilai & Ekspor Excel (.xlsx)',
      icon: Layers,
      adminOnly: false,
    },
    {
      id: 'release-schedule' as NavTab,
      label: 'Jadwal Rilis Indikator',
      subtitle: 'Kalender BRS Terdekat BPS',
      icon: Calendar,
      adminOnly: false,
    },
    {
      id: 'accounts' as NavTab,
      label: 'Akun',
      subtitle: 'Manajemen Pengguna & Hak Akses',
      icon: Users,
      adminOnly: true,
    },
  ];

  // Role-based filtering: Input Data and Akun strictly hidden for non-admin users
  const visibleItems = menuItems.filter((item) => !item.adminOnly || userRole === 'admin');

  // Mobile bottom navigation tabs: up to 4 items + Menu trigger for admins so 360px phones stay clean
  const bottomQuickTabs: Array<{
    id: NavTab;
    shortLabel: string;
    icon: typeof LayoutDashboard;
  }> =
    userRole === 'admin'
      ? [
          { id: 'dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
          { id: 'economy', shortLabel: 'Ekonomi', icon: TrendingUp },
          { id: 'input-data', shortLabel: 'Input Data', icon: Database },
          { id: 'manage-indicators', shortLabel: 'Indikator', icon: Layers },
        ]
      : [
          { id: 'dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
          { id: 'economy', shortLabel: 'Ekonomi', icon: TrendingUp },
          { id: 'manage-indicators', shortLabel: 'Indikator', icon: Layers },
          { id: 'release-schedule', shortLabel: 'Jadwal', icon: Calendar },
        ];

  const isDrawerTabActive =
    userRole === 'admin' && (activeTab === 'release-schedule' || activeTab === 'accounts');

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Desktop Sticky Sidebar & Mobile Slide-Over Drawer */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 left-0 h-full md:h-[calc(100vh-4rem)] w-72 shrink-0 bg-white border-r border-slate-200 z-50 md:z-20 flex flex-col justify-between transition-transform duration-200 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Mobile drawer header */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/pwa-192x192.png"
                alt="Logo SEULAWAH"
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-slate-900 truncate leading-tight">
                  SEULAWAH
                </p>
                <p className="text-[11px] text-slate-500 truncate leading-tight">
                  BPS Kabupaten Aceh Besar
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Access Summary */}
          <div
            className={`p-3 rounded-xl border text-xs ${
              userRole === 'admin'
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-blue-50/90 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-[11px] text-slate-700 truncate">
                Hak Akses Aktif
              </span>
              <span className="font-extrabold text-[11px] tracking-wide uppercase shrink-0">
                {userRole === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {userRole === 'admin'
                ? 'Akses penuh pengelolaan data, impor Excel, dan manajemen akun.'
                : 'Akses Dashboard, Perekonomian Kita, Daftar Indikator, dan Jadwal Rilis.'}
            </p>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 px-3 mb-1.5">
              Navigasi Utama
            </p>
            {visibleItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full min-h-[48px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl transition text-left group ${
                    isActive
                      ? 'bg-blue-800 text-white shadow-xs font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition ${
                        isActive ? 'text-orange-300' : 'text-slate-500 group-hover:text-blue-700'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{item.label}</p>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-blue-100/90' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  {item.adminOnly && (
                    <span
                      className={`text-[10px] font-bold shrink-0 ${
                        isActive ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    >
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: PWA Mobile Install Box */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-3.5 rounded-2xl text-white shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs font-bold">Pasang di Smartphone</span>
            </div>
            <p className="text-[11px] text-blue-100/90 mb-2.5 leading-relaxed">
              Unduh SEULAWAH agar mudah dibuka langsung dari layar HP &amp; mendukung mode offline.
            </p>
            <PWAInstallButton variant="prominent" />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>SEULAWAH · BPS Aceh Besar</span>
          </div>
        </div>
      </aside>

      {/* Ergonomic Mobile Thumb-Zone Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg z-30 pb-safe"
      >
        <div
          className={`grid h-16 px-1 ${
            userRole === 'admin' ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {bottomQuickTabs.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 ${
                  isActive ? 'text-blue-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isActive && (
                  <span className="absolute top-1 w-6 h-1 rounded-full bg-blue-800" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-800' : 'text-slate-500'}`} />
                <span className="text-[10px] tracking-tight leading-none truncate max-w-full px-1 mt-0.5">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {userRole === 'admin' && (
            <button
              type="button"
              onClick={onOpenMobile}
              className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 ${
                isDrawerTabActive ? 'text-blue-800 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isDrawerTabActive && (
                <span className="absolute top-1 w-6 h-1 rounded-full bg-blue-800" />
              )}
              <Menu className="w-5 h-5" />
              <span className="text-[10px] tracking-tight leading-none mt-0.5">Menu</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
