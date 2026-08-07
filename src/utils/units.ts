import type { WeightUnit } from '../types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

// ==========================================
// Display -> canonical (what gets stored)
// ==========================================

/**
 * Weights are stored in kg at 4 decimal places. That grid is ~0.0001 kg
 * (0.00022 lb), roughly 200x finer than the 0.05 lb needed to resolve a 1 dp
 * pound display — so fromKg(toKg(x, 'lb'), 'lb') === x for every value a
 * bathroom scale can produce. Storing fewer decimals would make 172.8 lb come
 * back as 172.9 unpredictably.
 */
export const toKg = (value: number, unit: WeightUnit): number =>
  round(unit === 'kg' ? value : value * KG_PER_LB, 4);

export const feetInchesToCm = (feet: number, inches: number): number =>
  round((feet * 12 + inches) * CM_PER_IN, 1);

// ==========================================
// Canonical -> display
// ==========================================

export const fromKg = (kg: number, unit: WeightUnit): number =>
  round(unit === 'kg' ? kg : kg / KG_PER_LB, 1);

export const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = Math.round(cm / CM_PER_IN);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
};

export const formatWeight = (kg: number, unit: WeightUnit, withUnit = true): string =>
  `${fromKg(kg, unit).toFixed(1)}${withUnit ? ` ${unit}` : ''}`;

export const formatDelta = (kg: number | null, unit: WeightUnit): string => {
  if (kg === null || kg === undefined) return '—';
  const value = fromKg(Math.abs(kg), unit);
  if (value === 0) return `0.0 ${unit}`;
  return `${kg > 0 ? '+' : '−'}${value.toFixed(1)} ${unit}`;
};

export const formatHeight = (cm: number | undefined, unit: WeightUnit): string => {
  if (!cm) return '—';
  if (unit === 'kg') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
};

// ==========================================
// Derived measures
// ==========================================

export const calcBmi = (kg: number, cm?: number): number | null => {
  if (!cm || cm <= 0) return null;
  const m = cm / 100;
  return round(kg / (m * m), 1);
};

export interface BmiBand {
  label: string;
  chip: string;
}

/**
 * Standard adult BMI bands. Not meaningful under age 20 — the caller checks
 * birthDate and renders the number without a band in that case.
 */
export const bmiBand = (bmi: number): BmiBand => {
  if (bmi < 18.5) return { label: 'Underweight', chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300' };
  if (bmi < 25) return { label: 'Healthy', chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
  if (bmi < 30) return { label: 'Overweight', chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
  return { label: 'Obese', chip: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };
};

/** Age in whole years, or null when no birth date is on file. */
export const ageFromBirthDate = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
};
