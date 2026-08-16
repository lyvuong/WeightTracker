import React, { useEffect, useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import type { Person, WeightDraft, WeightEntry, WeightUnit } from '../../types';
import { fromKg } from '../../utils/units';
import { nowTimeLocal, todayLocal } from '../../services/storage';

interface WeightFormModalProps {
  isOpen: boolean;
  people: Person[];
  unit: WeightUnit;
  initialEntry: WeightEntry | null;
  defaultPersonId?: string;
  onSave: (draft: WeightDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const QUICK_TAGS = [
  { label: '🌅 Morning', note: '🌅 Morning' },
  { label: '☀️ Afternoon', note: '☀️ Afternoon' },
  { label: '🌙 Evening', note: '🌙 Evening' },
  { label: '🏋️ Post-Workout', note: '🏋️ Post-Workout' },
  { label: '⚡ Fasted', note: '⚡ Fasted' }
];

export const WeightFormModal: React.FC<WeightFormModalProps> = ({
  isOpen,
  people,
  unit,
  initialEntry,
  defaultPersonId,
  onSave,
  onDelete,
  onClose
}) => {
  const [personId, setPersonId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTimeLocal());
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialEntry) {
      setPersonId(initialEntry.personId);
      setValue(
        initialEntry.enteredUnit === unit
          ? String(initialEntry.enteredValue)
          : String(fromKg(initialEntry.weightKg, unit))
      );
      setDate(initialEntry.date);
      setTime(initialEntry.time || nowTimeLocal());
      setBodyFat(initialEntry.bodyFatPct !== undefined ? String(initialEntry.bodyFatPct) : '');
      setNotes(initialEntry.notes || '');
    } else {
      setPersonId(defaultPersonId || people[0]?.id || '');
      setValue('');
      setDate(todayLocal());
      setTime(nowTimeLocal());
      setBodyFat('');
      setNotes('');
    }
  }, [isOpen, initialEntry, defaultPersonId, people, unit]);

  if (!isOpen) return null;

  const handleTagClick = (tagNote: string) => {
    if (!notes) {
      setNotes(tagNote);
    } else if (notes.includes(tagNote)) {
      setNotes(notes.replace(tagNote, '').trim().replace(/^,|,$/g, ''));
    } else {
      setNotes(`${notes} · ${tagNote}`);
    }
  };

  const parsed = Number(value);
  const isValid = personId && value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const fat = Number(bodyFat);
    onSave({
      id: initialEntry?.id,
      personId,
      date,
      time,
      value: parsed,
      unit,
      bodyFatPct: bodyFat.trim() !== '' && Number.isFinite(fat) ? fat : undefined,
      notes: notes.trim() || undefined
    });
  };

  const field = 'w-full glass-input text-sm px-3 py-2.5 rounded-xl';
  const label = 'text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto pt-2 sm:pt-10">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-lg rounded-2xl border border-slate-200 shadow-2xl bg-white p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto my-0"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 font-display">
            {initialEntry ? 'Edit weigh-in' : 'Log a weigh-in'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className={label}>Person</label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className={field}
          >
            {people.map(p => (
              <option key={p.id} value={p.id} className="bg-white">
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Weight ({unit})</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${field} font-mono`}
            />
          </div>
          <div>
            <label className={label}>Body fat % (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="—"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className={`${field} font-mono`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${field} font-mono`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={label}>Session Tag</label>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {QUICK_TAGS.map((tag) => {
              const isSelected = notes.includes(tag.note);
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleTagClick(tag.note)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-violet-100 text-violet-800 border-violet-300 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={label}>Notes (optional)</label>
          <input
            type="text"
            placeholder="After the gym, before breakfast…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={field}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          {initialEntry && (
            <button
              type="button"
              onClick={() => onDelete(initialEntry.id)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 hover:border-red-300 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={!isValid}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
