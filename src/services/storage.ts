import {
  User,
  RegionalPDRBData,
  DistrictData,
  IndicatorFormula,
  CustomIndicator,
  ReleaseSchedule,
  QuarterlyPDRBRecord,
  IndicatorTimestamps,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ECONOMY_DATA,
  ACEH_BESAR_DISTRICTS,
  INITIAL_FORMULAS,
  INITIAL_CUSTOM_INDICATORS,
  INITIAL_RELEASE_SCHEDULES,
  INITIAL_QUARTERLY_PDRB,
} from '../data/initialData';
import {
  pushUsersToFirestore,
  deleteSingleUserFromFirestore,
  pushCustomIndicatorsToFirestore,
  deleteCustomIndicatorFromFirestore,
  pushReleaseSchedulesToFirestore,
  deleteReleaseScheduleFromFirestore,
  pushBpsStateDoc,
} from './firestoreSync';

const USERS_STORAGE_KEY = 'bps_aceh_besar_users_v2';
const CURRENT_USER_KEY = 'bps_aceh_besar_current_user_v2';
const ECONOMY_STORAGE_KEY = 'bps_aceh_besar_economy_data_v2';
const DISTRICTS_STORAGE_KEY = 'bps_aceh_besar_districts_v2';
const FORMULAS_STORAGE_KEY = 'bps_aceh_besar_formulas_v2';
const CUSTOM_INDICATORS_STORAGE_KEY = 'bps_aceh_besar_custom_indicators_v2';
const SCHEDULES_STORAGE_KEY = 'bps_aceh_besar_release_schedules_v2';
const QUARTERLY_PDRB_STORAGE_KEY = 'bps_aceh_besar_quarterly_pdrb_v2';
const INDICATOR_TIMESTAMPS_KEY = 'bps_aceh_besar_indicator_timestamps_v2';

// =========================================================================
// USERS
// =========================================================================

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_USERS;

    // Migrate legacy seeded admin@bps1108.go.id to default admin / 123456
    let migrated = false;
    const updated = parsed.map((u: User) => {
      if (u.id === 'user-001' && u.email === 'admin@bps1108.go.id') {
        migrated = true;
        return {
          ...u,
          name: 'Administrator BPS Aceh Besar',
          email: 'admin',
          password: '123456',
          authProvider: 'password' as const,
        };
      }
      return u;
    });
    if (migrated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Error reading users from storage', e);
    return INITIAL_USERS;
  }
}

export function cacheUsersLocally(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('bps_users_updated', { detail: users }));
  } catch (e) {
    console.error('Error caching users locally', e);
  }
}

export function saveUsers(users: User[], deletedIds?: string[]): void {
  try {
    const prevUsers = getStoredUsers();
    const removedIds =
      deletedIds ??
      prevUsers.filter((p) => !users.some((n) => n.id === p.id)).map((p) => p.id);

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('bps_users_updated', { detail: users }));
    pushUsersToFirestore(users, removedIds);
  } catch (e) {
    console.error('Error saving users to storage', e);
  }
}

export function deleteUserAccountPermanently(userId: string): User[] {
  const updated = getStoredUsers().filter((u) => u.id !== userId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('bps_users_updated', { detail: updated }));
  deleteSingleUserFromFirestore(userId);
  return updated;
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(new CustomEvent('bps_auth_changed', { detail: user }));
  } catch (e) {
    console.error('Error setting current user', e);
  }
}

// =========================================================================
// ECONOMY DATA (PDRB & PENDUDUK)
// =========================================================================

export function getStoredEconomyData(): RegionalPDRBData {
  try {
    const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(INITIAL_ECONOMY_DATA));
      return INITIAL_ECONOMY_DATA;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading economy data', e);
    return INITIAL_ECONOMY_DATA;
  }
}

export function cacheEconomyDataLocally(data: RegionalPDRBData): void {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('bps_economy_updated', { detail: data }));
  } catch (e) {
    console.error('Error caching economy data', e);
  }
}

export function saveEconomyData(data: RegionalPDRBData): void {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('bps_economy_updated', { detail: data }));
    pushBpsStateDoc('economy_data', data);
  } catch (e) {
    console.error('Error saving economy data', e);
  }
}

export function resetEconomyData(): RegionalPDRBData {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(INITIAL_ECONOMY_DATA));
    window.dispatchEvent(new CustomEvent('bps_economy_updated', { detail: INITIAL_ECONOMY_DATA }));
    pushBpsStateDoc('economy_data', INITIAL_ECONOMY_DATA);
    return INITIAL_ECONOMY_DATA;
  } catch (e) {
    console.error('Error resetting economy data', e);
    return INITIAL_ECONOMY_DATA;
  }
}

// =========================================================================
// DISTRICTS
// =========================================================================

export function getStoredDistricts(): DistrictData[] {
  try {
    const raw = localStorage.getItem(DISTRICTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(ACEH_BESAR_DISTRICTS));
      return ACEH_BESAR_DISTRICTS;
    }
    return JSON.parse(raw);
  } catch {
    return ACEH_BESAR_DISTRICTS;
  }
}

export function cacheDistrictsLocally(districts: DistrictData[]): void {
  try {
    localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(districts));
    window.dispatchEvent(new CustomEvent('bps_districts_updated', { detail: districts }));
  } catch (e) {
    console.error('Error caching districts', e);
  }
}

export function saveDistricts(districts: DistrictData[]): void {
  try {
    localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(districts));
    window.dispatchEvent(new CustomEvent('bps_districts_updated', { detail: districts }));
    pushBpsStateDoc('districts', districts);
  } catch (e) {
    console.error('Error saving districts', e);
  }
}

// =========================================================================
// FORMULAS
// =========================================================================

export function getStoredFormulas(): IndicatorFormula[] {
  try {
    const raw = localStorage.getItem(FORMULAS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FORMULAS_STORAGE_KEY, JSON.stringify(INITIAL_FORMULAS));
      return INITIAL_FORMULAS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FORMULAS;
  }
}

export function cacheFormulasLocally(formulas: IndicatorFormula[]): void {
  try {
    localStorage.setItem(FORMULAS_STORAGE_KEY, JSON.stringify(formulas));
    window.dispatchEvent(new CustomEvent('bps_formulas_updated', { detail: formulas }));
  } catch (e) {
    console.error('Error caching formulas', e);
  }
}

export function saveFormulas(formulas: IndicatorFormula[]): void {
  try {
    localStorage.setItem(FORMULAS_STORAGE_KEY, JSON.stringify(formulas));
    window.dispatchEvent(new CustomEvent('bps_formulas_updated', { detail: formulas }));
    pushBpsStateDoc('formulas', formulas);
  } catch (e) {
    console.error('Error saving formulas', e);
  }
}

// =========================================================================
// CUSTOM INDICATORS
// =========================================================================

function sanitizeCustomIndicatorList(parsed: any[]): CustomIndicator[] {
  return parsed.map((item: any) => {
    const colHeaders: string[] =
      Array.isArray(item.columnHeaders) && item.columnHeaders.length > 0
        ? item.columnHeaders
        : ['2020', '2021', '2022', '2023', '2024'];
    const rowHeaders: string[] =
      Array.isArray(item.rowHeaders) && item.rowHeaders.length > 0
        ? item.rowHeaders
        : ['Kabupaten Aceh Besar', 'Provinsi Aceh'];

    let gridData: Record<string, Record<string, number>> = item.gridData;
    if (!gridData || typeof gridData !== 'object') {
      gridData = {};
      rowHeaders.forEach((r) => {
        gridData[r] = {};
        colHeaders.forEach((c) => {
          const fallbackVal = item.values?.[c] ?? 5.0;
          gridData[r][c] = typeof fallbackVal === 'number' ? fallbackVal : parseFloat(fallbackVal) || 0;
        });
      });
    }

    return {
      id: item.id || `ci-${Date.now()}`,
      name: item.name || 'Indikator Kustom',
      code: item.code || 'IND_KUSTOM',
      unit: item.unit || '%',
      source: item.source || 'BPS Kabupaten Aceh Besar',
      rowCount: rowHeaders.length,
      colCount: colHeaders.length,
      rowHeaders,
      columnHeaders: colHeaders,
      gridData,
      periodicity: item.periodicity || 'tahunan',
      category: item.category || 'Indikator Khusus Daerah',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    };
  });
}

export function getStoredCustomIndicators(): CustomIndicator[] {
  try {
    const raw = localStorage.getItem(CUSTOM_INDICATORS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOM_INDICATORS_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOM_INDICATORS));
      return INITIAL_CUSTOM_INDICATORS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_CUSTOM_INDICATORS;
    }
    return sanitizeCustomIndicatorList(parsed);
  } catch (err) {
    console.error('Error reading custom indicators, returning defaults', err);
    return INITIAL_CUSTOM_INDICATORS;
  }
}

export function cacheCustomIndicatorsLocally(indicators: CustomIndicator[]): void {
  try {
    const clean = sanitizeCustomIndicatorList(indicators);
    localStorage.setItem(CUSTOM_INDICATORS_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('bps_custom_indicators_updated', { detail: clean }));
  } catch (e) {
    console.error('Error caching custom indicators', e);
  }
}

export function saveCustomIndicators(indicators: CustomIndicator[], deletedIds?: string[]): void {
  try {
    const prev = getStoredCustomIndicators();
    const removed =
      deletedIds ?? prev.filter((p) => !indicators.some((n) => n.id === p.id)).map((p) => p.id);

    const clean = sanitizeCustomIndicatorList(indicators);
    localStorage.setItem(CUSTOM_INDICATORS_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('bps_custom_indicators_updated', { detail: clean }));
    pushCustomIndicatorsToFirestore(clean, removed);
  } catch (e) {
    console.error('Error saving custom indicators', e);
  }
}

export function deleteCustomIndicatorById(id: string): CustomIndicator[] {
  const updated = getStoredCustomIndicators().filter((c) => c.id !== id);
  localStorage.setItem(CUSTOM_INDICATORS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('bps_custom_indicators_updated', { detail: updated }));
  deleteCustomIndicatorFromFirestore(id);
  return updated;
}

// =========================================================================
// INDICATOR TIMESTAMPS (UNTUK URUTAN TERBARU DI DAFTAR INDIKATOR)
// =========================================================================

const DEFAULT_TIMESTAMPS: IndicatorTimestamps = {
  PDRB_ADHB: '2026-11-03T17:00:00Z',
  PDRB_ADHK: '2026-11-03T17:10:00Z',
  POP_AB: '2026-11-03T17:20:00Z',
  PDRB_TW: '2026-11-03T18:20:00Z',
};

export function getStoredIndicatorTimestamps(): IndicatorTimestamps {
  try {
    const raw = localStorage.getItem(INDICATOR_TIMESTAMPS_KEY);
    if (!raw) {
      localStorage.setItem(INDICATOR_TIMESTAMPS_KEY, JSON.stringify(DEFAULT_TIMESTAMPS));
      return DEFAULT_TIMESTAMPS;
    }
    return { ...DEFAULT_TIMESTAMPS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TIMESTAMPS;
  }
}

export function cacheIndicatorTimestampsLocally(timestamps: IndicatorTimestamps): void {
  try {
    localStorage.setItem(INDICATOR_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    window.dispatchEvent(new CustomEvent('bps_timestamps_updated', { detail: timestamps }));
  } catch (e) {
    console.error('Error caching indicator timestamps', e);
  }
}

export function touchIndicatorTimestamp(code: string): IndicatorTimestamps {
  const current = getStoredIndicatorTimestamps();
  const next = { ...current, [code]: new Date().toISOString() };
  localStorage.setItem(INDICATOR_TIMESTAMPS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('bps_timestamps_updated', { detail: next }));
  pushBpsStateDoc('indicator_timestamps', next);
  return next;
}

// =========================================================================
// RELEASE SCHEDULES
// =========================================================================

function sortSchedulesByNearest(list: ReleaseSchedule[]): ReleaseSchedule[] {
  const today = new Date('2026-11-03T00:00:00').getTime();
  return [...list].sort((a, b) => {
    const timeA = new Date(a.releaseDate).getTime();
    const timeB = new Date(b.releaseDate).getTime();

    const isUpcomingA = timeA >= today;
    const isUpcomingB = timeB >= today;

    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;
    if (isUpcomingA && isUpcomingB) return timeA - timeB;
    return timeB - timeA;
  });
}

export function getStoredReleaseSchedules(): ReleaseSchedule[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    let list: ReleaseSchedule[] = INITIAL_RELEASE_SCHEDULES;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
    return sortSchedulesByNearest(list);
  } catch (e) {
    console.error('Error reading release schedules', e);
    return sortSchedulesByNearest(INITIAL_RELEASE_SCHEDULES);
  }
}

export function cacheReleaseSchedulesLocally(schedules: ReleaseSchedule[]): void {
  try {
    const sorted = sortSchedulesByNearest(schedules);
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent('bps_schedules_updated', { detail: sorted }));
  } catch (e) {
    console.error('Error caching schedules', e);
  }
}

export function saveReleaseSchedules(schedules: ReleaseSchedule[], deletedIds?: string[]): void {
  try {
    const prev = getStoredReleaseSchedules();
    const removed =
      deletedIds ?? prev.filter((p) => !schedules.some((n) => n.id === p.id)).map((p) => p.id);

    const sorted = sortSchedulesByNearest(schedules);
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent('bps_schedules_updated', { detail: sorted }));
    pushReleaseSchedulesToFirestore(sorted, removed);
  } catch (e) {
    console.error('Error saving release schedules', e);
  }
}

export function deleteReleaseScheduleById(id: string): ReleaseSchedule[] {
  const updated = getStoredReleaseSchedules().filter((s) => s.id !== id);
  localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('bps_schedules_updated', { detail: updated }));
  deleteReleaseScheduleFromFirestore(id);
  return updated;
}

// =========================================================================
// QUARTERLY PDRB
// =========================================================================

export function getStoredQuarterlyPDRB(): QuarterlyPDRBRecord[] {
  try {
    const raw = localStorage.getItem(QUARTERLY_PDRB_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUARTERLY_PDRB_STORAGE_KEY, JSON.stringify(INITIAL_QUARTERLY_PDRB));
      return INITIAL_QUARTERLY_PDRB;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_QUARTERLY_PDRB;
  } catch (e) {
    console.error('Error reading quarterly PDRB', e);
    return INITIAL_QUARTERLY_PDRB;
  }
}

export function cacheQuarterlyPDRBLocally(records: QuarterlyPDRBRecord[]): void {
  try {
    localStorage.setItem(QUARTERLY_PDRB_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('bps_quarterly_pdrb_updated', { detail: records }));
  } catch (e) {
    console.error('Error caching quarterly PDRB', e);
  }
}

export function saveQuarterlyPDRB(records: QuarterlyPDRBRecord[]): void {
  try {
    localStorage.setItem(QUARTERLY_PDRB_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('bps_quarterly_pdrb_updated', { detail: records }));
    pushBpsStateDoc('quarterly_pdrb', records);
  } catch (e) {
    console.error('Error saving quarterly PDRB', e);
  }
}
