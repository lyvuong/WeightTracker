/**
 * Per-person accent palette.
 *
 * Tailwind v4 has no config file here, so its scanner only sees literal class
 * strings in source — `bg-${color}-500/15` would silently produce no CSS.
 * Every class is therefore written out in full, alongside a `hex` for recharts
 * (which needs a real colour value, not a class).
 */
export interface PersonColor {
  hex: string;
  chip: string;
  dot: string;
  ring: string;
  text: string;
  bar: string;
}

export const PERSON_COLORS: Record<string, PersonColor> = {
  violet: {
    hex: '#7c3aed',
    chip: 'bg-violet-50 border-violet-200 text-violet-700',
    dot: 'bg-violet-500',
    ring: 'ring-violet-500/40',
    text: 'text-violet-600',
    bar: 'bg-violet-500'
  },
  cyan: {
    hex: '#0891b2',
    chip: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-500/40',
    text: 'text-cyan-600',
    bar: 'bg-cyan-500'
  },
  amber: {
    hex: '#d97706',
    chip: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/40',
    text: 'text-amber-600',
    bar: 'bg-amber-500'
  },
  rose: {
    hex: '#e11d48',
    chip: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500/40',
    text: 'text-rose-600',
    bar: 'bg-rose-500'
  },
  emerald: {
    hex: '#059669',
    chip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500'
  },
  sky: {
    hex: '#0284c7',
    chip: 'bg-sky-50 border-sky-200 text-sky-700',
    dot: 'bg-sky-500',
    ring: 'ring-sky-500/40',
    text: 'text-sky-600',
    bar: 'bg-sky-500'
  },
  fuchsia: {
    hex: '#c026d3',
    chip: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
    dot: 'bg-fuchsia-500',
    ring: 'ring-fuchsia-500/40',
    text: 'text-fuchsia-600',
    bar: 'bg-fuchsia-500'
  },
  lime: {
    hex: '#65a30d',
    chip: 'bg-lime-50 border-lime-200 text-lime-700',
    dot: 'bg-lime-500',
    ring: 'ring-lime-500/40',
    text: 'text-lime-600',
    bar: 'bg-lime-500'
  }
};

export const COLOR_KEYS = Object.keys(PERSON_COLORS);

export const getPersonColor = (key?: string): PersonColor =>
  PERSON_COLORS[key || ''] || PERSON_COLORS.violet;

/** Colour assigned to the Nth person added, so a household stays distinguishable. */
export const nextColorKey = (usedCount: number): string => COLOR_KEYS[usedCount % COLOR_KEYS.length];

export const PERSON_EMOJIS = [
  '🙂', '😀', '😎', '🧑', '👩', '👨', '👧', '👦', '👶', '🧒',
  '👵', '👴', '🐻', '🐼', '🦊', '🐨', '🐯', '🦁', '🐧', '🦄',
  '🌟', '⚡', '🔥', '🌱'
];

export const DEFAULT_EMOJI = '🙂';
