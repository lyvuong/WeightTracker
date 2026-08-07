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
      setTime(initialEntry.time);
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

  const field = 'w-full glass-input text-sm text-white px-3 py-2.5 rounded-xl placeholder:text-slate-600';
  const label = 'text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="glass-panel w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl bg-slate-900/95 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white font-display">
            {initialEntry ? 'Edit weigh-in' : 'Log a weigh-in'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="Close">
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
              <option key={p.id} value={p.id} className="bg-slate-900">
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
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
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
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-950 text-red-400 text-xs font-bold px-4 py-3 rounded-xl border border-slate-700 hover:border-red-800 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={!isValid}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
