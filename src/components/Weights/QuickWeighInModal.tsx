import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Clock, Calendar, Plus, Edit2, Sparkles } from 'lucide-react';
import type { Person, WeightDraft, WeightEntry, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { formatWeight, fromKg } from '../../utils/units';
import { formatDisplayTime } from '../../utils/weights';
import { nowTimeLocal, todayLocal } from '../../services/storage';

const QUICK_TAGS = [
  { label: '🌅 Morning', note: '🌅 Morning' },
  { label: '☀️ Afternoon', note: '☀️ Afternoon' },
  { label: '🌙 Evening', note: '🌙 Evening' },
  { label: '🏋️ Post-Workout', note: '🏋️ Post-Workout' },
  { label: '⚡ Fasted', note: '⚡ Fasted' },
  { label: '💧 Post-Hydration', note: '💧 Post-Hydration' }
];

interface QuickWeighInModalProps {
  isOpen: boolean;
  person: Person | null;
  unit: WeightUnit;
  todayEntries?: WeightEntry[];
  editingEntry?: WeightEntry | null;
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
  todayEntries = [],
  editingEntry,
  lastWeightKg,
  queue,
  onSave,
  onClose
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState(nowTimeLocal());
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [showDateTime, setShowDateTime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or re-hydrate when opened or when editing entry changes
  useEffect(() => {
    if (!isOpen || !person) return;

    if (editingEntry) {
      setSelectedEntryId(editingEntry.id);
      setValue(
        editingEntry.enteredUnit === unit
          ? String(editingEntry.enteredValue)
          : String(fromKg(editingEntry.weightKg, unit))
      );
      setDate(editingEntry.date);
      setTime(editingEntry.time || nowTimeLocal());
      setBodyFat(editingEntry.bodyFatPct !== undefined ? String(editingEntry.bodyFatPct) : '');
      setNotes(editingEntry.notes || '');
      setShowDateTime(true);
    } else {
      // Default: brand new weigh-in!
      setSelectedEntryId(null);
      setValue('');
      setDate(todayLocal());
      setTime(nowTimeLocal());
      setBodyFat('');
      setNotes('');
      setShowDateTime(false);
    }

    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen, person, editingEntry, unit]);

  if (!isOpen || !person) return null;

  const isEditing = Boolean(selectedEntryId);

  const handleSelectEntryToEdit = (entry: WeightEntry) => {
    setSelectedEntryId(entry.id);
    setValue(
      entry.enteredUnit === unit
        ? String(entry.enteredValue)
        : String(fromKg(entry.weightKg, unit))
    );
    setDate(entry.date);
    setTime(entry.time || nowTimeLocal());
    setBodyFat(entry.bodyFatPct !== undefined ? String(entry.bodyFatPct) : '');
    setNotes(entry.notes || '');
    setShowDateTime(true);
    inputRef.current?.focus();
  };

  const handleSwitchToNew = () => {
    setSelectedEntryId(null);
    setValue('');
    setDate(todayLocal());
    setTime(nowTimeLocal());
    setBodyFat('');
    setNotes('');
    setShowDateTime(false);
    inputRef.current?.focus();
  };

  const handleTagClick = (tagNote: string) => {
    if (!notes) {
      setNotes(tagNote);
    } else if (notes.includes(tagNote)) {
      // Remove tag if already clicked
      setNotes(notes.replace(tagNote, '').trim().replace(/^,|,$/g, ''));
    } else {
      setNotes(`${notes} · ${tagNote}`);
    }
  };

  const parsed = Number(value);
  const isValid = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const fat = Number(bodyFat);
    onSave({
      id: selectedEntryId || undefined,
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto pt-2 sm:pt-8">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-2xl border border-slate-200 shadow-2xl bg-white p-4 sm:p-5 space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto my-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PersonAvatar person={person} size="sm" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-display leading-tight">{person.name}</h2>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {isEditing ? (
                  <span className="text-violet-600 font-semibold flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editing weigh-in
                  </span>
                ) : (
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3 text-violet-600" /> New weigh-in
                  </span>
                )}
                {queue && ` · ${queue.index + 1} of ${queue.total}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar if multi-person run */}
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

        {/* Today's Existing Entries (if any) */}
        {todayEntries.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Today's logs ({todayEntries.length})
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleSwitchToNew}
                  className="text-[10px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-0.5"
                >
                  <Plus className="w-2.5 h-2.5" /> Log new instead
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {todayEntries.map((e) => {
                const active = selectedEntryId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => handleSelectEntryToEdit(e)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                      active
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
                    }`}
                    title="Click to edit this weigh-in"
                  >
                    <span>{formatDisplayTime(e.time)}</span>
                    <span className={active ? 'text-violet-100' : 'text-slate-900 font-extrabold'}>
                      {formatWeight(e.weightKg, unit)}
                    </span>
                  </button>
                );
              })}
            </div>
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
          {lastWeightKg !== null && !isEditing && (
            <p className="text-xs text-slate-500">
              Last recorded: {fromKg(lastWeightKg, unit).toFixed(1)} {unit}
            </p>
          )}
        </div>

        {/* Quick Tag Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span>Quick Tag Session</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {QUICK_TAGS.map((tag) => {
              const isSelected = notes.includes(tag.note);
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleTagClick(tag.note)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
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

        {/* Body fat & notes inputs */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="Body fat % (optional)"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full glass-input text-xs px-3 py-2 rounded-xl font-mono"
            />
            <button
              type="button"
              onClick={() => setShowDateTime(prev => !prev)}
              className="w-full glass-input text-xs px-3 py-2 rounded-xl flex items-center justify-between text-slate-600 hover:text-slate-900"
            >
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-violet-600" />
                {time}
              </span>
              <span className="text-[10px] text-slate-400">{showDateTime ? 'Hide' : 'Edit time'}</span>
            </button>
          </div>

          {showDateTime && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full glass-input text-xs px-2.5 py-1.5 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full glass-input text-xs px-2.5 py-1.5 rounded-lg font-mono"
                />
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Notes (optional, e.g. before breakfast)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full glass-input text-xs px-3 py-2 rounded-xl"
          />
        </div>

        {/* Primary Save Action Button */}
        <button
          type="submit"
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md shadow-violet-500/20 active:scale-[0.99] transition-all disabled:opacity-40 shrink-0"
        >
          <Check className="w-4 h-4" />
          {isEditing
            ? 'Update weigh-in'
            : queue && queue.index < queue.total - 1
              ? 'Save & next person'
              : 'Save weigh-in'}
        </button>
      </form>
    </div>
  );
};
