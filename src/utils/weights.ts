import type {
  EnrichedWeightEntry,
  Person,
  PersonStats,
  WeightEntry,
  WeightUnit
} from '../types';
import { calcBmi, fromKg } from './units';

/** Sortable timestamp for an entry: "2026-08-06T07:15". */
export const entryKey = (e: { date: string; time: string }): string => `${e.date}T${e.time || '00:00'}`;

export const compareEntriesChronological = <T extends { date: string; time: string; createdAt?: string; id?: string }>(a: T, b: T): number => {
  const keyA = entryKey(a);
  const keyB = entryKey(b);
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const createdA = a.createdAt || a.id || '';
  const createdB = b.createdAt || b.id || '';
  return createdA.localeCompare(createdB);
};

/** Newest first, matching the way every list in the app reads. */
export const sortEntriesDesc = <T extends { date: string; time: string; createdAt?: string; id?: string }>(entries: T[]): T[] =>
  [...entries].sort((a, b) => compareEntriesChronological(b, a));

export const sortPeople = (people: Person[]): Person[] =>
  [...people].sort((a, b) => {
    if (!!a.isArchived !== !!b.isArchived) return a.isArchived ? 1 : -1;
    if (a.sortOrder !== b.sortOrder) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    return a.name.localeCompare(b.name);
  });

/** Flexible name matching for household accounts (e.g. "Quoc-Huan Vuong" vs "Huan Vuong"). */
export const namesMatch = (nameA: string = '', nameB: string = ''): boolean => {
  const normA = nameA.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const normB = nameB.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = normA.split(/\s+/).filter(Boolean);
  const tokensB = normB.split(/\s+/).filter(Boolean);
  const common = tokensA.filter(t => tokensB.includes(t));
  return (
    common.length >= Math.min(tokensA.length, tokensB.length) ||
    common.length >= 2 ||
    (common.length > 0 && common.length / Math.min(tokensA.length, tokensB.length) >= 0.5)
  );
};

export const daysBetween = (fromDate: string, toDate: string): number => {
  const a = new Date(`${fromDate}T00:00:00`).getTime();
  const b = new Date(`${toDate}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
};

export const shiftDate = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "Aug 6" for chart axes and list headers — no date library in this stack. */
export const formatShortDate = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const formatLongDate = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

export const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time;
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
};

export const relativeDay = (date: string, today: string): string => {
  const diff = daysBetween(date, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 0) return formatShortDate(date);
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.round(diff / 7)} wk ago`;
  return formatShortDate(date);
};

/**
 * Joins each entry to its person and computes the display-ready fields.
 * `deltaFromPreviousKg` compares against that person's previous entry in
 * chronological order, not the previous row in the list.
 */
export const enrichEntries = (
  entries: WeightEntry[],
  people: Person[],
  unit: WeightUnit
): EnrichedWeightEntry[] => {
  const byId = new Map(people.map(p => [p.id, p]));
  const previousKg = new Map<string, number>();

  // Walk oldest-first so each entry can see the one before it.
  const chronological = [...entries].sort(compareEntriesChronological);
  const enrichedChronological = chronological.map((entry) => {
    const person = byId.get(entry.personId) || null;
    const prev = previousKg.get(entry.personId);
    previousKg.set(entry.personId, entry.weightKg);
    return {
      ...entry,
      person,
      displayWeight: fromKg(entry.weightKg, unit),
      bmi: calcBmi(entry.weightKg, person?.heightCm),
      deltaFromPreviousKg: prev === undefined ? null : entry.weightKg - prev
    };
  });

  return enrichedChronological.reverse();
};

/** Chronological (oldest first) entries for one person. */
export const entriesForPerson = (entries: WeightEntry[], personId: string): WeightEntry[] =>
  entries
    .filter(e => e.personId === personId)
    .sort(compareEntriesChronological);

/** The entry closest to (but not after) `date`, used for the N-day deltas. */
const entryOnOrBefore = (chronological: WeightEntry[], date: string): WeightEntry | null => {
  let match: WeightEntry | null = null;
  for (const e of chronological) {
    if (e.date <= date) match = e;
    else break;
  }
  return match;
};

export const buildPersonStats = (
  person: Person,
  entries: WeightEntry[],
  today: string
): PersonStats => {
  const chronological = entriesForPerson(entries, person.id);
  const latest = chronological.length ? chronological[chronological.length - 1] : null;
  const previous = chronological.length > 1 ? chronological[chronological.length - 2] : null;

  const todayEntries = chronological.filter(e => e.date === today);
  const todayCount = todayEntries.length;
  const todayFirst = todayEntries.length ? todayEntries[0] : null;
  const todayDeltaKg = todayEntries.length > 1 && todayFirst && latest && latest.date === today
    ? latest.weightKg - todayFirst.weightKg
    : null;

  const changeOver = (days: number): number | null => {
    if (!latest) return null;
    const past = entryOnOrBefore(chronological, shiftDate(today, -days));
    if (!past || past.id === latest.id) return null;
    return latest.weightKg - past.weightKg;
  };

  const goalDeltaKg = latest && person.goalWeightKg ? latest.weightKg - person.goalWeightKg : null;

  // Progress from the first recorded weight toward the goal, clamped to 0-100.
  let goalProgressPct: number | null = null;
  if (latest && person.goalWeightKg && chronological.length > 0) {
    const start = chronological[0].weightKg;
    const span = Math.abs(start - person.goalWeightKg);
    if (span > 0.01) {
      const travelled = Math.abs(start - latest.weightKg);
      goalProgressPct = Math.max(0, Math.min(100, Math.round((travelled / span) * 100)));
    } else {
      goalProgressPct = 100;
    }
  }

  return {
    person,
    latest,
    previous,
    loggedToday: todayCount > 0,
    todayEntries,
    todayCount,
    todayFirst,
    todayDeltaKg,
    daysSinceLast: latest ? daysBetween(latest.date, today) : null,
    change7dKg: changeOver(7),
    change30dKg: changeOver(30),
    bmi: latest ? calcBmi(latest.weightKg, person.heightCm) : null,
    goalDeltaKg,
    goalProgressPct,
    entryCount: chronological.length
  };
};

/**
 * Trailing simple moving average over the last `window` *available* points.
 * Weigh-ins have gaps, so this averages by sample count rather than by
 * calendar day — a 7-point average of a person who weighs in twice a week
 * still smooths the noise it is meant to smooth.
 */
export const movingAverage = (values: (number | null)[], window: number): (number | null)[] => {
  const recent: number[] = [];
  return values.map((v) => {
    if (v === null || v === undefined) return null;
    recent.push(v);
    if (recent.length > window) recent.shift();
    const sum = recent.reduce((acc, n) => acc + n, 0);
    return Math.round((sum / recent.length) * 10) / 10;
  });
};

/**
 * Consecutive days ending today on which every non-archived person logged a
 * weight. Returns 0 when anyone is missing today.
 */
export const householdStreak = (
  people: Person[],
  entries: WeightEntry[],
  today: string
): number => {
  const active = people.filter(p => !p.isArchived);
  if (active.length === 0) return 0;

  const logged = new Set(entries.map(e => `${e.personId}|${e.date}`));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = shiftDate(today, -i);
    if (active.every(p => logged.has(`${p.id}|${day}`))) streak += 1;
    else break;
  }
  return streak;
};
