import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { User as FirebaseUser, signOut } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import {
  User,
  CustomIndicator,
  ReleaseSchedule,
  RegionalPDRBData,
  IndicatorFormula,
  DistrictData,
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

// Sanitize helper to strip `undefined` properties before writing to Firestore
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((k) => {
    const val = obj[k];
    if (val !== undefined) {
      clean[k] = val;
    }
  });
  return clean as T;
}

export function sanitizeUserForFirestore(u: User): User {
  return stripUndefined({
    id: u.id,
    uid: u.uid,
    name: u.name || 'Pengguna BPS',
    email: u.email.trim().toLowerCase(),
    password: u.password ?? '',
    role: u.role === 'admin' ? 'admin' : 'user',
    gender: u.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    age: typeof u.age === 'number' && !isNaN(u.age) ? u.age : 25,
    institution: u.institution || 'Umum',
    phone: u.phone || '-',
    usagePurpose: u.usagePurpose || 'Umum',
    status: u.status === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
    authProvider: u.authProvider || 'password',
    photoURL: u.photoURL || undefined,
    createdAt: u.createdAt || new Date().toISOString(),
    lastLogin: u.lastLogin || new Date().toISOString(),
  });
}

// =========================================================================
// 1. APP USERS CRUD & GOOGLE SIGN-IN UPSERT
// =========================================================================

export async function pushUsersToFirestore(users: User[], deletedIds?: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    users.forEach((u) => {
      const ref = doc(db, 'app_users', u.id);
      batch.set(ref, sanitizeUserForFirestore(u));
    });
    if (deletedIds && deletedIds.length > 0) {
      deletedIds.forEach((delId) => {
        batch.delete(doc(db, 'app_users', delId));
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'app_users');
  }
}

export async function upsertSingleUserToFirestore(user: User): Promise<void> {
  try {
    const ref = doc(db, 'app_users', user.id);
    await setDoc(ref, sanitizeUserForFirestore(user));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `app_users/${user.id}`);
  }
}

export async function deleteSingleUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'app_users', userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `app_users/${userId}`);
  }
}

export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'app_users'));
    if (snap.empty) {
      await pushUsersToFirestore(INITIAL_USERS);
      return INITIAL_USERS;
    }
    const list = snap.docs.map((d) => d.data() as User);
    // Ensure default admin credential is present/updated
    const hasAdmin = list.some((u) => u.email.toLowerCase() === 'admin');
    if (!hasAdmin) {
      const defaultAdmin = INITIAL_USERS.find((u) => u.id === 'user-001');
      if (defaultAdmin) {
        await upsertSingleUserToFirestore(defaultAdmin);
        const filtered = list.filter((u) => u.id !== 'user-001');
        return [defaultAdmin, ...filtered];
      }
    }
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'app_users');
    return [];
  }
}

/**
 * Handles Google Sign-In strictly assigning role 'user' on new accounts.
 * Preserves existing admin-assigned role if account already exists in Firestore.
 */
export async function upsertGoogleUserToFirestore(
  fbUser: FirebaseUser,
  localUsersFallback: User[]
): Promise<{ user: User; error?: string }> {
  const email = (fbUser.email || '').trim().toLowerCase();
  if (!email) {
    return {
      user: {} as User,
      error: 'Akun Google tidak memiliki alamat email yang valid.',
    };
  }

  let existingUsers: User[] = [];
  try {
    const snap = await getDocs(collection(db, 'app_users'));
    if (!snap.empty) {
      existingUsers = snap.docs.map((d) => d.data() as User);
    } else {
      existingUsers = localUsersFallback;
    }
  } catch {
    existingUsers = localUsersFallback;
  }

  const found = existingUsers.find(
    (u) => u.email.toLowerCase() === email || (u.uid && u.uid === fbUser.uid)
  );

  const now = new Date().toISOString();

  if (found) {
    if (found.status === 'Tidak Aktif') {
      await signOut(auth).catch(() => {});
      return {
        user: found,
        error:
          'Akun Google Anda saat ini berstatus Tidak Aktif. Hubungi Administrator BPS Kabupaten Aceh Besar.',
      };
    }

    const updatedUser: User = sanitizeUserForFirestore({
      ...found,
      uid: fbUser.uid,
      name: found.name || fbUser.displayName || email.split('@')[0],
      authProvider: 'google',
      photoURL: fbUser.photoURL || found.photoURL,
      lastLogin: now,
    });

    await upsertSingleUserToFirestore(updatedUser);
    return { user: updatedUser };
  }

  // Strictly 'user' role for ALL new Google sign-ins! Only Admin can change role.
  const newUser: User = sanitizeUserForFirestore({
    id: `user-${fbUser.uid.slice(0, 12)}-${Date.now().toString().slice(-4)}`,
    uid: fbUser.uid,
    name: fbUser.displayName || email.split('@')[0],
    email,
    password: '(Login Google)',
    role: 'user',
    gender: 'Laki-laki',
    age: 26,
    institution: 'Pengguna Akun Google',
    phone: '-',
    usagePurpose: 'Umum',
    status: 'Aktif',
    authProvider: 'google',
    photoURL: fbUser.photoURL || undefined,
    createdAt: now,
    lastLogin: now,
  });

  await upsertSingleUserToFirestore(newUser);
  return { user: newUser };
}

// =========================================================================
// 2. CUSTOM INDICATORS SYNC
// =========================================================================

export async function pushCustomIndicatorsToFirestore(
  indicators: CustomIndicator[],
  deletedIds?: string[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    indicators.forEach((ci) => {
      const ref = doc(db, 'custom_indicators', ci.id);
      batch.set(
        ref,
        stripUndefined({
          ...ci,
          periodicity: ci.periodicity || 'tahunan',
          category: ci.category || 'Indikator Khusus Daerah',
          updatedAt: ci.updatedAt || ci.createdAt || new Date().toISOString(),
        })
      );
    });
    if (deletedIds && deletedIds.length > 0) {
      deletedIds.forEach((id) => {
        batch.delete(doc(db, 'custom_indicators', id));
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'custom_indicators');
  }
}

export async function deleteCustomIndicatorFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'custom_indicators', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `custom_indicators/${id}`);
  }
}

// =========================================================================
// 3. RELEASE SCHEDULES SYNC
// =========================================================================

export async function pushReleaseSchedulesToFirestore(
  schedules: ReleaseSchedule[],
  deletedIds?: string[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    schedules.forEach((s) => {
      const ref = doc(db, 'release_schedules', s.id);
      batch.set(
        ref,
        stripUndefined({
          id: s.id,
          indicatorCode: s.indicatorCode,
          indicatorName: s.indicatorName,
          periodTarget: s.periodTarget,
          releaseDate: s.releaseDate,
          frequency: s.frequency,
          status: s.status,
          officialBRSTitle: s.officialBRSTitle || s.indicatorName,
          downloadLink: s.downloadLink || '',
          notes: s.notes || '',
        })
      );
    });
    if (deletedIds && deletedIds.length > 0) {
      deletedIds.forEach((id) => {
        batch.delete(doc(db, 'release_schedules', id));
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'release_schedules');
  }
}

export async function deleteReleaseScheduleFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'release_schedules', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `release_schedules/${id}`);
  }
}

// =========================================================================
// 4. CENTRALIZED BPS STATE DOCUMENTS (bps_state/*)
// =========================================================================

export async function pushBpsStateDoc(key: string, payload: any): Promise<void> {
  try {
    await setDoc(doc(db, 'bps_state', key), {
      key,
      payload,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bps_state/${key}`);
  }
}

// =========================================================================
// 5. INITIAL SEED & REAL-TIME MULTI-DEVICE SUBSCRIPTIONS
// =========================================================================

export async function ensureFirestoreSeeded(): Promise<void> {
  try {
    const usersSnap = await getDocs(collection(db, 'app_users'));
    if (usersSnap.empty) {
      await pushUsersToFirestore(INITIAL_USERS);
    } else {
      // Ensure user-001 has updated default admin email ('admin' / '123456') if still old default
      const adminDoc = usersSnap.docs.find((d) => d.id === 'user-001');
      if (adminDoc) {
        const adminData = adminDoc.data() as User;
        if (adminData.email === 'admin@bps1108.go.id') {
          await upsertSingleUserToFirestore(INITIAL_USERS[0]);
        }
      }
    }

    const ciSnap = await getDocs(collection(db, 'custom_indicators'));
    if (ciSnap.empty) {
      await pushCustomIndicatorsToFirestore(INITIAL_CUSTOM_INDICATORS);
    }

    const schedSnap = await getDocs(collection(db, 'release_schedules'));
    if (schedSnap.empty) {
      await pushReleaseSchedulesToFirestore(INITIAL_RELEASE_SCHEDULES);
    }

    const econDoc = await getDoc(doc(db, 'bps_state', 'economy_data'));
    if (!econDoc.exists()) {
      await pushBpsStateDoc('economy_data', INITIAL_ECONOMY_DATA);
    }

    const qDoc = await getDoc(doc(db, 'bps_state', 'quarterly_pdrb'));
    if (!qDoc.exists()) {
      await pushBpsStateDoc('quarterly_pdrb', INITIAL_QUARTERLY_PDRB);
    }

    const formDoc = await getDoc(doc(db, 'bps_state', 'formulas'));
    if (!formDoc.exists()) {
      await pushBpsStateDoc('formulas', INITIAL_FORMULAS);
    }

    const distDoc = await getDoc(doc(db, 'bps_state', 'districts'));
    if (!distDoc.exists()) {
      await pushBpsStateDoc('districts', ACEH_BESAR_DISTRICTS);
    }

    const tsDoc = await getDoc(doc(db, 'bps_state', 'indicator_timestamps'));
    if (!tsDoc.exists()) {
      await pushBpsStateDoc('indicator_timestamps', {
        PDRB_ADHB: '2026-11-03T17:00:00Z',
        PDRB_ADHK: '2026-11-03T17:10:00Z',
        POP_AB: '2026-11-03T17:20:00Z',
        PDRB_TW: '2026-11-03T18:20:00Z',
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'seed_check');
  }
}

export interface FirestoreSyncCallbacks {
  onUsers: (users: User[]) => void;
  onCustomIndicators: (indicators: CustomIndicator[]) => void;
  onReleaseSchedules: (schedules: ReleaseSchedule[]) => void;
  onEconomyData: (data: RegionalPDRBData) => void;
  onQuarterlyPDRB: (records: QuarterlyPDRBRecord[]) => void;
  onFormulas: (formulas: IndicatorFormula[]) => void;
  onDistricts: (districts: DistrictData[]) => void;
  onIndicatorTimestamps: (timestamps: IndicatorTimestamps) => void;
}

export function subscribeToBpsFirestore(callbacks: FirestoreSyncCallbacks): () => void {
  ensureFirestoreSeeded();

  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'app_users'),
      (snap) => {
        if (!snap.empty) {
          const users = snap.docs.map((d) => d.data() as User);
          users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callbacks.onUsers(users);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'app_users')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'custom_indicators'),
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data() as CustomIndicator);
          callbacks.onCustomIndicators(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'custom_indicators')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'release_schedules'),
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data() as ReleaseSchedule);
          callbacks.onReleaseSchedules(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'release_schedules')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'bps_state'),
      (snap) => {
        snap.docs.forEach((d) => {
          const docData = d.data() as { key?: string; payload?: any };
          if (!docData?.payload) return;
          if (d.id === 'economy_data') callbacks.onEconomyData(docData.payload);
          if (d.id === 'quarterly_pdrb') callbacks.onQuarterlyPDRB(docData.payload);
          if (d.id === 'formulas') callbacks.onFormulas(docData.payload);
          if (d.id === 'districts') callbacks.onDistricts(docData.payload);
          if (d.id === 'indicator_timestamps') callbacks.onIndicatorTimestamps(docData.payload);
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bps_state')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
