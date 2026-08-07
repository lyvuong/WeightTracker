import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { Person, WeightDraft, WeightEntry, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { fromKg } from '../../utils/units';
import { nowTimeLocal, todayLocal } from '../../services/storage';

interface QuickWeighInModalProps {
  isOpen: boolean;
  person: Person | null;
  unit: WeightUnit;
  existingEntry: WeightEntry | null;
  lastWeightKg: number | null;
  /** Position in a "weigh everyone" run, e.g. { index: 1, total: 3 }. */
  queue: { index: number; total: number } | null;
  onSave: (draft: WeightDraft) => void;
  onClose: () => void;
}

export const QuickWeighInModal: React.FC<QuickWeighInModalProps> = ({
  isOpen,
  person,
  unit,
  existingEntry,
  lastWeightKg,
  queue,
  onSave,
  onClose
}) => {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTimeLocal());
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [showWhen, setShowWhen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-hydrate whenever the modal opens or the queue advances to a new person.
  useEffect(() => {
    if (!isOpen || !person) return;
    if (existingEntry) {
      // Prefer the raw keystrokes when the units still match, so editing never
      // shows a converted-and-back number.
      setValue(
        existingEntry.enteredUnit === unit
          ? String(existingEntry.enteredValue)
          : String(fromKg(existingEntry.weightKg, unit))
      );
      setDate(existingEntry.date);
      setTime(existingEntry.time);
      setBodyFat(existingEntry.bodyFatPct !== undefined ? String(existingEntry.bodyFatPct) : '');
      setNotes(existingEntry.notes || '');
    } else {
      setValue('');
      setDate(todayLocal());
      setTime(nowTimeLocal());
      setBodyFat('');
      setNotes('');
    }
    setShowWhen(false);
    setShowMore(false);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen, person, existingEntry, unit]);

  if (!isOpen || !person) return null;

  const parsed = Number(value);
  const isValid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const fat = Number(bodyFat);
    onSave({
      id: existingEntry?.id,
      personId: person.id,
      date,
      time,
      value: parsed,
      unit,
      bodyFatPct: bodyFat.trim() !== '' && Number.isFinite(fat) ? fat : undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl bg-white p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PersonAvatar person={person} size="md" />
            <div>
              <h2 className="text-lg font-black text-slate-900 font-display leading-tight">{person.name}</h2>
              <p className="text-[11px] text-slate-500">
                {existingEntry ? 'Editing weigh-in' : 'New weigh-in'}
                {queue && ` · ${queue.index + 1} of ${queue.total}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {queue && queue.total > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: queue.total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= queue.index ? 'bg-violet-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        )}

        {/* The number is the whole point — give it the whole panel. */}
        <div className="inset-well rounded-2xl p-5 text-center space-y-1">
          <div className="flex items-baseline justify-center gap-2">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-40 bg-transparent text-center text-5xl font-black font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none"
            />
            <span className="text-2xl font-bold text-violet-600">{unit}</span>
          </div>
          {lastWeightKg !== null && (
            <p className="text-[11px] text-slate-500">
              Last recorded: {fromKg(lastWeightKg, unit).toFixed(1)} {unit}
            </p>
          )}
        </div>

        {/* Date & time, collapsed to "now" by default */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowWhen(!showWhen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <span>{showWhen ? 'Date & time' : `Logging for ${date === todayLocal() ? 'today' : date} at ${time}`}</span>
            {showWhen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showWhen && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input text-sm px-3 py-2 rounded-xl"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="glass-input text-sm px-3 py-2 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Optional extras */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <span>Body fat &amp; notes</span>
            {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showMore && (
            <div className="space-y-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="100"
                placeholder="Body fat %"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full glass-input text-sm px-3 py-2 rounded-xl"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full glass-input text-sm px-3 py-2 rounded-xl"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md shadow-violet-500/20 active:scale-[0.99] transition-all disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
          {queue && queue.index < queue.total - 1 ? 'Save & next person' : 'Save weigh-in'}
        </button>
      </form>
    </div>
  );
};
