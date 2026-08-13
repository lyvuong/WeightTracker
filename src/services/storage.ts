import type { EnrichedWeightEntry, FirebaseConfig, Person, WeightEntry, WeightUnit } from '../types';
import { calcBmi, fromKg } from '../utils/units';

const PEOPLE_KEY = 'weighttrack_people_v1';
const WEIGHTS_KEY = 'weighttrack_weights_v1';
const UNIT_KEY = 'weighttrack_unit';
const FIREBASE_CONFIG_KEY = 'weighttrack_firebase_config_custom';
const FAMILY_CODE_KEY = 'weighttrack_family_code';
const LAST_LOCAL_PERSON_KEY = 'weighttrack_last_local_person_id';

// Demo rows only ever live in local storage — they are filtered out before
// anything is seeded into a real household.
export const DEMO_PREFIX = 'demo-';

export const getStoredLastLocalPersonId = (): string => {
  try {
    return localStorage.getItem(LAST_LOCAL_PERSON_KEY) || '';
  } catch {
    return '';
  }
};

export const setStoredLastLocalPersonId = (personId: string): void => {
  try {
    if (personId) {
      localStorage.setItem(LAST_LOCAL_PERSON_KEY, personId);
    }
  } catch {}
};

/**
 * Local calendar date, NOT `toISOString().split('T')[0]`.
 *
 * toISOString() returns the UTC date, so an evening weigh-in in Pacific time
 * would be filed under tomorrow — which would break the entire "who has
 * weighed in today?" dashboard every night after 5pm.
 */
export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const nowTimeLocal = (): string => new Date().toTimeString().slice(0, 5);

const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==========================================
// Demo dataset
// ==========================================

export const INITIAL_PEOPLE: Person[] = [
  {
    id: `${DEMO_PREFIX}p1`,
    name: 'Alex',
    color: 'violet',
    emoji: '🙂',
    heightCm: 178,
    goalWeightKg: 75,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `${DEMO_PREFIX}p2`,
    name: 'Sam',
    color: 'cyan',
    emoji: '🐻',
    heightCm: 165,
    goalWeightKg: 60,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Fixed jitter so the demo curve looks measured rather than drawn, without
// changing on every page load (the seed is written to localStorage once).
const JITTER = [0.3, -0.2, 0.45, -0.35, 0.15, -0.5, 0.25, 0.05, -0.3, 0.4, -0.15, 0.2, -0.4, 0.35, 0.1, -0.25];

const buildDemoSeries = (
  personKey: string,
  startKg: number,
  endKg: number,
  time: string,
  offset: number
): WeightEntry[] => {
  const points = 15;
  const entries: WeightEntry[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const day = Math.round(45 - t * 45);
    const kg = Math.round((startKg + (endKg - startKg) * t + JITTER[(i + offset) % JITTER.length]) * 10) / 10;
    entries.push({
      id: `${DEMO_PREFIX}${personKey}-${i}`,
      personId: `${DEMO_PREFIX}${personKey}`,
      date: daysAgo(day),
      time,
      weightKg: kg,
      enteredUnit: 'kg',
      enteredValue: kg,
      createdAt: new Date().toISOString()
    });
  }
  return entries;
};

export const INITIAL_WEIGHTS: WeightEntry[] = [
  ...buildDemoSeries('p1', 82.4, 79.1, '07:10', 0),
  ...buildDemoSeries('p2', 63.2, 61.5, '07:35', 5)
];

// ==========================================
// Local mirrors
// ==========================================

export const loadLocalPeople = (): Person[] => {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY);
    if (!raw) {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(INITIAL_PEOPLE));
      return INITIAL_PEOPLE;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load local people:', err);
    return INITIAL_PEOPLE;
  }
};

export const saveLocalPeople = (people: Person[]): void => {
  try {
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  } catch (err) {
    console.error('Failed to save local people:', err);
  }
};

export const loadLocalWeights = (): WeightEntry[] => {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (!raw) {
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(INITIAL_WEIGHTS));
      return INITIAL_WEIGHTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load local weights:', err);
    return INITIAL_WEIGHTS;
  }
};

export const saveLocalWeights = (weights: WeightEntry[]): void => {
  try {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  } catch (err) {
    console.error('Failed to save local weights:', err);
  }
};

export const clearDemoData = (): void => {
  saveLocalPeople(loadLocalPeople().filter(p => !p.id.startsWith(DEMO_PREFIX)));
  saveLocalWeights(loadLocalWeights().filter(w => !w.id.startsWith(DEMO_PREFIX)));
};

export const restoreSampleData = (): void => {
  saveLocalPeople([...INITIAL_PEOPLE, ...loadLocalPeople().filter(p => !p.id.startsWith(DEMO_PREFIX))]);
  saveLocalWeights([...INITIAL_WEIGHTS, ...loadLocalWeights().filter(w => !w.id.startsWith(DEMO_PREFIX))]);
};

// ==========================================
// Preferences & credentials
// ==========================================

export const getStoredUnit = (): WeightUnit => (localStorage.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb');

export const setStoredUnit = (unit: WeightUnit): void => {
  localStorage.setItem(UNIT_KEY, unit);
};

export const getStoredFirebaseConfig = (): FirebaseConfig | null => {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredFirebaseConfig = (config: FirebaseConfig | null): void => {
  if (!config) {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
  } else {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  }
};

export const getStoredFamilyCode = (): string => localStorage.getItem(FAMILY_CODE_KEY) || '';

export const setStoredFamilyCode = (code: string): void => {
  const clean = code.trim().toUpperCase();
  if (!clean) {
    localStorage.removeItem(FAMILY_CODE_KEY);
  } else {
    localStorage.setItem(FAMILY_CODE_KEY, clean);
  }
};

// ==========================================
// Export / import
// ==========================================

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const csvCell = (value: string): string => `"${(value || '').replace(/"/g, '""')}"`;

/** Both units are emitted so the export stays readable whatever the app is set to. */
export const exportWeightsAsCSV = (entries: EnrichedWeightEntry[]): void => {
  const headers = ['Date', 'Time', 'Person', 'Weight (lb)', 'Weight (kg)', 'Body Fat %', 'BMI', 'Notes', 'Logged By'];
  const rows = entries.map(e => [
    csvCell(e.date),
    csvCell(e.time),
    csvCell(e.person?.name || 'Unknown'),
    fromKg(e.weightKg, 'lb').toFixed(1),
    fromKg(e.weightKg, 'kg').toFixed(1),
    e.bodyFatPct !== undefined ? e.bodyFatPct.toFixed(1) : '',
    calcBmi(e.weightKg, e.person?.heightCm)?.toFixed(1) ?? '',
    csvCell(e.notes || ''),
    csvCell(e.loggedBy?.displayName || '')
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `WeightTracker_Log_${todayLocal()}.csv`
  );
};

export const exportDataAsJSON = (people: Person[], weights: WeightEntry[]): void => {
  const backup = {
    version: '1.0',
    app: 'WeightTracker',
    exportDate: new Date().toISOString(),
    unit: getStoredUnit(),
    people,
    weights
  };
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `WeightTracker_Backup_${todayLocal()}.json`
  );
};

export const importJSONBackup = (jsonString: string): { people: Person[]; weights: WeightEntry[] } => {
  try {
    const data = JSON.parse(jsonString);
    const people: Person[] = data.people || [];
    const weights: WeightEntry[] = data.weights || [];
    if (!Array.isArray(people) || !Array.isArray(weights)) {
      throw new Error('Invalid JSON backup file structure.');
    }
    saveLocalPeople(people);
    saveLocalWeights(weights);
    return { people, weights };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to parse JSON backup file.');
  }
};
