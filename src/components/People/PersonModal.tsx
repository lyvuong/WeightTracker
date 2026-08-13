import React, { useEffect, useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import type { Person, WeightUnit } from '../../types';
import { COLOR_KEYS, PERSON_COLORS, PERSON_EMOJIS, DEFAULT_EMOJI, nextColorKey } from '../../constants/people';
import { cmToFeetInches, feetInchesToCm, fromKg, toKg } from '../../utils/units';

interface PersonModalProps {
  isOpen: boolean;
  unit: WeightUnit;
  initialPerson: Person | null;
  peopleCount: number;
  prefillName?: string;
  prefillUid?: string;
  onSave: (person: Person) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const PersonModal: React.FC<PersonModalProps> = ({
  isOpen,
  unit,
  initialPerson,
  peopleCount,
  prefillName,
  prefillUid,
  onSave,
  onDelete,
  onClose
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [color, setColor] = useState('violet');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [goal, setGoal] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialPerson) {
      setName(initialPerson.name);
      setEmoji(initialPerson.emoji || DEFAULT_EMOJI);
      setColor(initialPerson.color || 'violet');
      setBirthDate(initialPerson.birthDate || '');
      setGoal(initialPerson.goalWeightKg ? String(fromKg(initialPerson.goalWeightKg, unit)) : '');
      if (initialPerson.heightCm) {
        const { feet: f, inches: i } = cmToFeetInches(initialPerson.heightCm);
        setFeet(String(f));
        setInches(String(i));
        setHeightCm(String(Math.round(initialPerson.heightCm)));
      } else {
        setFeet('');
        setInches('');
        setHeightCm('');
      }
    } else {
      setName(prefillName || '');
      setEmoji(PERSON_EMOJIS[peopleCount % PERSON_EMOJIS.length] || DEFAULT_EMOJI);
      setColor(nextColorKey(peopleCount));
      setFeet('');
      setInches('');
      setHeightCm('');
      setGoal('');
      setBirthDate('');
    }
  }, [isOpen, initialPerson, prefillName, peopleCount, unit]);

  if (!isOpen) return null;

  const resolveHeightCm = (): number | undefined => {
    if (unit === 'kg') {
      const cm = Number(heightCm);
      return heightCm.trim() !== '' && Number.isFinite(cm) && cm > 0 ? cm : undefined;
    }
    const f = Number(feet) || 0;
    const i = Number(inches) || 0;
    if (f === 0 && i === 0) return undefined;
    return feetInchesToCm(f, i);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const goalNum = Number(goal);
    onSave({
      id: initialPerson?.id || (prefillUid ? `person-uid-${prefillUid}` : `person-${Date.now()}`),
      name: name.trim(),
      emoji,
      color,
      heightCm: resolveHeightCm(),
      goalWeightKg: goal.trim() !== '' && Number.isFinite(goalNum) && goalNum > 0 ? toKg(goalNum, unit) : undefined,
      birthDate: birthDate || undefined,
      linkedUid: initialPerson?.linkedUid || prefillUid,
      sortOrder: initialPerson?.sortOrder ?? peopleCount,
      isArchived: initialPerson?.isArchived,
      createdAt: initialPerson?.createdAt || now,
      updatedAt: now,
      createdBy: initialPerson?.createdBy
    });
  };

  const field = 'w-full glass-input text-sm px-3 py-2.5 rounded-xl';
  const label = 'text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl bg-white p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto my-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 font-display">
            {initialPerson ? `Edit ${initialPerson.name}` : 'Add a person'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className={label}>Name</label>
          <input
            type="text"
            placeholder="e.g. Mai"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            autoFocus
          />
        </div>

        <div>
          <label className={label}>Avatar</label>
          <div className="grid grid-cols-12 gap-1.5">
            {PERSON_EMOJIS.map(em => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                className={`aspect-square rounded-lg text-lg flex items-center justify-center border transition-all ${
                  emoji === em
                    ? 'bg-violet-100 border-violet-400 scale-110'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Colour</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_KEYS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                title={key}
                className={`w-8 h-8 rounded-full ${PERSON_COLORS[key].bar} transition-all ${
                  color === key ? 'ring-2 ring-offset-2 ring-offset-white ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Height (for BMI)</label>
            {unit === 'kg' ? (
              <input
                type="number"
                inputMode="numeric"
                placeholder="cm"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={`${field} font-mono`}
              />
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="ft"
                  value={feet}
                  onChange={(e) => setFeet(e.target.value)}
                  className={`${field} font-mono`}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="in"
                  value={inches}
                  onChange={(e) => setInches(e.target.value)}
                  className={`${field} font-mono`}
                />
              </div>
            )}
          </div>
          <div>
            <label className={label}>Goal weight ({unit})</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="optional"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={`${field} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className={label}>Birth date (optional)</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={field}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Only used to hide the adult BMI category for anyone under 20, where it doesn't apply.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {initialPerson && (
            <button
              type="button"
              onClick={() => onDelete(initialPerson.id)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 hover:border-red-300 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm py-3 rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            Save person
          </button>
        </div>
      </form>
    </div>
  );
};
