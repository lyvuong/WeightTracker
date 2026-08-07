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
    hex: '#a78bfa',
    chip: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    dot: 'bg-violet-400',
    ring: 'ring-violet-500/40',
    text: 'text-violet-300',
    bar: 'bg-violet-500'
  },
  cyan: {
    hex: '#22d3ee',
    chip: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    dot: 'bg-cyan-400',
    ring: 'ring-cyan-500/40',
    text: 'text-cyan-300',
    bar: 'bg-cyan-500'
  },
  amber: {
    hex: '#fbbf24',
    chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/40',
    text: 'text-amber-300',
    bar: 'bg-amber-500'
  },
  rose: {
    hex: '#fb7185',
    chip: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    dot: 'bg-rose-400',
    ring: 'ring-rose-500/40',
    text: 'text-rose-300',
    bar: 'bg-rose-500'
  },
  emerald: {
    hex: '#34d399',
    chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-500/40',
    text: 'text-emerald-300',
    bar: 'bg-emerald-500'
  },
  sky: {
    hex: '#38bdf8',
    chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    dot: 'bg-sky-400',
    ring: 'ring-sky-500/40',
    text: 'text-sky-300',
    bar: 'bg-sky-500'
  },
  fuchsia: {
    hex: '#e879f9',
    chip: 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300',
    dot: 'bg-fuchsia-400',
    ring: 'ring-fuchsia-500/40',
    text: 'text-fuchsia-300',
    bar: 'bg-fuchsia-500'
  },
  lime: {
    hex: '#a3e635',
    chip: 'bg-lime-500/15 border-lime-500/30 text-lime-300',
    dot: 'bg-lime-400',
    ring: 'ring-lime-500/40',
    text: 'text-lime-300',
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
