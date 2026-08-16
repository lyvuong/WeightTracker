export type WeightUnit = 'lb' | 'kg';

export interface UserAuditInfo {
  uid: string;
  displayName: string;
  email?: string;
}

/**
 * A tracked person. Deliberately independent of Google accounts: kids and a
 * spouse without their own login still get a profile. Seeded once from
 * households/{code}/metadata/info.members[] but editable from then on.
 */
export interface Person {
  id: string;
  name: string;
  color: string; // key into PERSON_COLORS
  emoji: string;
  heightCm?: number; // canonical cm
  goalWeightKg?: number; // canonical kg
  birthDate?: string; // YYYY-MM-DD
  linkedUid?: string; // set when seeded from a Google household member
  sortOrder: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserAuditInfo;
  lastEditedBy?: UserAuditInfo;
}

/**
 * One measured weigh-in. weightKg is the single source of truth; lb is a
 * display projection, so switching units never rewrites stored data.
 * enteredUnit/enteredValue preserve exactly what was typed, so re-opening the
 * edit form never shows a converted-and-back number.
 */
export interface WeightEntry {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD, local calendar date
  time: string; // HH:MM
  weightKg: number; // canonical, 4 dp
  bodyFatPct?: number;
  notes?: string;
  enteredUnit: WeightUnit;
  enteredValue: number;
  createdAt: string;
  loggedBy?: UserAuditInfo;
  lastEditedBy?: UserAuditInfo;
}

/** Form payload from the weigh-in modals — pre-conversion, in display units. */
export interface WeightDraft {
  id?: string;
  personId: string;
  date: string;
  time: string;
  value: number; // expressed in `unit`
  unit: WeightUnit;
  bodyFatPct?: number;
  notes?: string;
}

/**
 * Read-side join of an entry with its person. Never persisted — built in
 * memory so lists and charts can read display-ready fields directly.
 */
export interface EnrichedWeightEntry extends WeightEntry {
  person: Person | null;
  displayWeight: number; // in the active display unit, 1 dp
  bmi: number | null; // null when the person has no height on file
  deltaFromPreviousKg: number | null;
}

/** Per-person rollup powering the dashboard cards. */
export interface PersonStats {
  person: Person;
  latest: WeightEntry | null;
  previous: WeightEntry | null;
  loggedToday: boolean;
  todayEntries: WeightEntry[];
  todayCount: number;
  todayFirst: WeightEntry | null;
  todayDeltaKg: number | null; // latest - todayFirst for today
  daysSinceLast: number | null;
  change7dKg: number | null;
  change30dKg: number | null;
  bmi: number | null;
  goalDeltaKg: number | null; // latest - goal; negative means under goal
  goalProgressPct: number | null;
  entryCount: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type ActiveTab = 'dashboard' | 'log' | 'people' | 'trends' | 'settings' | 'about';

/** Trend window in days; 0 means all time. */
export type TrendRange = 7 | 30 | 90 | 365 | 0;
