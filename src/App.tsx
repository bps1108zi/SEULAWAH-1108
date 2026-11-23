import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { User, RegionalPDRBData, DistrictData } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getStoredUsers,
  getStoredEconomyData,
  getStoredDistricts,
  cacheUsersLocally,
  cacheCustomIndicatorsLocally,
  cacheReleaseSchedulesLocally,
  cacheEconomyDataLocally,
  cacheQuarterlyPDRBLocally,
  cacheFormulasLocally,
  cacheDistrictsLocally,
  cacheIndicatorTimestampsLocally,
} from './services/storage';
import { subscribeToBpsFirestore } from './services/firestoreSync';
import { AuthModal } from './components/auth/AuthModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { DashboardUsers } from './components/dashboard/DashboardUsers';
import { EconomyModule } from './components/economy/EconomyModule';
import { DataInputModule } from './components/admin/DataInputModule';
import { AccountManagement } from './components/admin/AccountManagement';
import { ManageIndicators } from './components/indicators/ManageIndicators';
import { ReleaseScheduleModule } from './components/schedule/ReleaseScheduleModule';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';

export default function App() {
  const [currentUser, setLocalCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileInstallBanner, setShowMobileInstallBanner] = useState(true);

  // Core application data states
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [economyData, setEconomyData] = useState<RegionalPDRBData>(() => getStoredEconomyData());
  const [districts, setDistricts] = useState<DistrictData[]>(() => getStoredDistricts());

  // Subscribe to Firebase Firestore real-time updates only when authenticated (Multi-device sync)
  useEffect(() => {
    if (!currentUser) return;

    const isAdminSession = currentUser.role === 'admin';
    const unsubscribe = subscribeToBpsFirestore({
      onUsers: (syncedUsers) => {
        const clientVisibleUsers = isAdminSession
          ? syncedUsers
          : syncedUsers.map((u) => ({ ...u, password: '' }));
        cacheUsersLocally(clientVisibleUsers);
        setUsers(clientVisibleUsers);
      },
      onCustomIndicators: (syncedIndicators) => {
        cacheCustomIndicatorsLocally(syncedIndicators);
      },
      onReleaseSchedules: (syncedSchedules) => {
        cacheReleaseSchedulesLocally(syncedSchedules);
      },
      onEconomyData: (syncedEconomy) => {
        cacheEconomyDataLocally(syncedEconomy);
        setEconomyData(syncedEconomy);
      },
      onQuarterlyPDRB: (syncedQuarterly) => {
        cacheQuarterlyPDRBLocally(syncedQuarterly);
      },
      onFormulas: (syncedFormulas) => {
        cacheFormulasLocally(syncedFormulas);
      },
      onDistricts: (syncedDistricts) => {
        cacheDistrictsLocally(syncedDistricts);
        setDistricts(syncedDistricts);
      },
      onIndicatorTimestamps: (syncedTimestamps) => {
        cacheIndicatorTimestampsLocally(syncedTimestamps);
      },
    });

    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.role]);

  // Keep active user session synchronized if admin modifies their role or status from another device
  useEffect(() => {
    if (!currentUser) return;
    const matched = users.find(
      (u) =>
        u.id === currentUser.id ||
        u.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (matched) {
      if (matched.status === 'Tidak Aktif') {
        signOut(auth).catch(() => {});
        setCurrentUser(null);
        setLocalCurrentUser(null);
        setActiveTab('dashboard');
      } else if (
        matched.role !== currentUser.role ||
        matched.name !== currentUser.name ||
        matched.institution !== currentUser.institution
      ) {
        const sanitizedSessionUser =
          matched.role === 'admin' ? matched : { ...matched, password: '' };
        setCurrentUser(sanitizedSessionUser);
        setLocalCurrentUser(sanitizedSessionUser);
      }
    }
  }, [users, currentUser]);

  // Listen to internal storage events across components
  useEffect(() => {
    const handleAuthChanged = (e: CustomEvent) => {
      setLocalCurrentUser(e.detail);
    };
    const handleUsersUpdated = (e: CustomEvent) => {
      setUsers(e.detail);
    };
    const handleEconomyUpdated = (e: CustomEvent) => {
      setEconomyData(e.detail);
    };
    const handleDistrictsUpdated = (e: CustomEvent) => {
      setDistricts(e.detail);
    };

    window.addEventListener('bps_auth_changed', handleAuthChanged as EventListener);
    window.addEventListener('bps_users_updated', handleUsersUpdated as EventListener);
    window.addEventListener('bps_economy_updated', handleEconomyUpdated as EventListener);
    window.addEventListener('bps_districts_updated', handleDistrictsUpdated as EventListener);

    return () => {
      window.removeEventListener('bps_auth_changed', handleAuthChanged as EventListener);
      window.removeEventListener('bps_users_updated', handleUsersUpdated as EventListener);
      window.removeEventListener('bps_economy_updated', handleEconomyUpdated as EventListener);
      window.removeEventListener('bps_districts_updated', handleDistrictsUpdated as EventListener);
    };
  }, []);

  // Handle logout (also terminates Firebase Auth session if Google Sign-In was used)
  const handleLogout = () => {
    signOut(auth).catch(() => {});
    setCurrentUser(null);
    setLocalCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Guard: strictly prevent non-admin access to Input Data & Akun
  useEffect(() => {
    if (currentUser?.role !== 'admin' && (activeTab === 'input-data' || activeTab === 'accounts')) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  // If user is not logged in, show Auth Gate
  if (!currentUser) {
    return (
      <ErrorBoundary fallbackTitle="Terjadi Kesalahan pada Halaman Autentikasi">
        <AuthModal
          onSuccess={(loggedUser) => {
            setLocalCurrentUser(loggedUser);
            setActiveTab('dashboard');
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex min-w-0">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-3.5 sm:p-6 pb-24 md:pb-8 overflow-y-auto min-w-0 space-y-4">
          {showMobileInstallBanner && (
            <PWAInstallButton
              variant="mobile-banner"
              onDismissBanner={() => setShowMobileInstallBanner(false)}
            />
          )}

          <ErrorBoundary fallbackTitle="Terjadi Kesalahan pada Modul Ini">
            {/* Menu: Dashboard */}
            {activeTab === 'dashboard' && (
              <DashboardUsers
                users={users}
                currentUserRole={currentUser.role}
                onNavigateToAccounts={() => setActiveTab('accounts')}
              />
            )}

            {/* Menu: Perekonomian Kita */}
            {activeTab === 'economy' && (
              <EconomyModule
                economyData={economyData}
                districts={districts}
              />
            )}

            {/* Menu: Input Data (Hanya Admin) */}
            {activeTab === 'input-data' && currentUser.role === 'admin' && (
              <DataInputModule
                economyData={economyData}
                districts={districts}
                onDataUpdated={setEconomyData}
                onDistrictsUpdated={setDistricts}
              />
            )}

            {/* Menu: Daftar Indikator */}
            {activeTab === 'manage-indicators' && (
              <ManageIndicators
                economyData={economyData}
                userRole={currentUser.role}
                onNavigateToInputData={() => setActiveTab('input-data')}
                onNavigateToSchedule={() => setActiveTab('release-schedule')}
                onEconomyDataUpdated={setEconomyData}
              />
            )}

            {/* Menu: Jadwal Rilis Indikator */}
            {activeTab === 'release-schedule' && (
              <ReleaseScheduleModule
                userRole={currentUser.role}
                onNavigateToIndicator={() => setActiveTab('manage-indicators')}
              />
            )}

            {/* Menu: Akun (Hanya Admin) */}
            {activeTab === 'accounts' && currentUser.role === 'admin' && (
              <AccountManagement
                users={users}
                currentAdmin={currentUser}
                onUsersUpdated={setUsers}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}
