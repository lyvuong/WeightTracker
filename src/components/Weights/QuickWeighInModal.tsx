import React, { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto pt-2 sm:pt-10">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-2xl border border-slate-200 shadow-2xl bg-white p-4 sm:p-5 space-y-3 sm:space-y-4 max-h-[85vh] overflow-y-auto my-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PersonAvatar person={person} size="sm" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-display leading-tight">{person.name}</h2>
              <p className="text-[11px] text-slate-500">
                {existingEntry ? 'Editing weigh-in' : 'New weigh-in'}
                {queue && ` · ${queue.index + 1} of ${queue.total}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100" aria-label="Close">
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

        {/* Compact weight number input */}
        <div className="inset-well rounded-xl p-3 text-center space-y-0.5">
          <div className="flex items-baseline justify-center gap-1.5">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-36 bg-transparent text-center text-4xl sm:text-5xl font-black font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none"
            />
            <span className="text-xl font-bold text-violet-600">{unit}</span>
          </div>
          {lastWeightKg !== null && (
            <p className="text-xs text-slate-500">
              Last recorded: {fromKg(lastWeightKg, unit).toFixed(1)} {unit}
            </p>
          )}
        </div>

        {/* Body fat & notes inputs - open by default */}
        <div className="space-y-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            placeholder="Body fat % (optional)"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className="w-full glass-input text-xs px-3 py-2.5 rounded-xl font-mono"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full glass-input text-xs px-3 py-2.5 rounded-xl"
          />
        </div>

        {/* Primary Save Action Button */}
        <button
          type="submit"
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md shadow-violet-500/20 active:scale-[0.99] transition-all disabled:opacity-40 shrink-0"
        >
          <Check className="w-4 h-4" />
          {queue && queue.index < queue.total - 1 ? 'Save & next person' : 'Save weigh-in'}
        </button>
      </form>
    </div>
  );
};
