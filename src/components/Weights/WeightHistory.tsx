import React, { useMemo, useState } from 'react';
import { Download, Pencil, ArrowDown, ArrowUp, ListOrdered, Plus } from 'lucide-react';
import type { EnrichedWeightEntry, Person, TrendRange, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { formatDelta, formatWeight } from '../../utils/units';
import { formatLongDate, shiftDate } from '../../utils/weights';

interface WeightHistoryProps {
  entries: EnrichedWeightEntry[];
  people: Person[];
  unit: WeightUnit;
  today: string;
  activePersonId: string;
  onSelectPerson: (id: string) => void;
  onEditEntry: (entry: EnrichedWeightEntry) => void;
  onAddEntry: () => void;
  onExportCSV: (entries: EnrichedWeightEntry[]) => void;
}

const RANGES: { value: TrendRange; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 0, label: 'All' }
];

export const WeightHistory: React.FC<WeightHistoryProps> = ({
  entries,
  people,
  unit,
  today,
  activePersonId,
  onSelectPerson,
  onEditEntry,
  onAddEntry,
  onExportCSV
}) => {
  const [range, setRange] = useState<TrendRange>(30);

  const filtered = useMemo(() => {
    const cutoff = range === 0 ? '' : shiftDate(today, -range);
    return entries.filter(e =>
      (activePersonId === 'all' || e.personId === activePersonId) &&
      (range === 0 || e.date >= cutoff)
    );
  }, [entries, activePersonId, range, today]);

  // Entries arrive newest-first, so grouping in order gives descending days.
  const grouped = useMemo(() => {
    const map = new Map<string, EnrichedWeightEntry[]>();
    filtered.forEach((e) => {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const chip = (isActive: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
      isActive
        ? 'bg-violet-50 text-violet-700 border-violet-200'
        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
    }`;

  return (
    <div className="space-y-5">
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 font-display">Weight log</h1>
              <p className="text-[11px] text-slate-500">
                {filtered.length} weigh-in{filtered.length === 1 ? '' : 's'} shown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportCSV(filtered)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 transition-all"
            >
              <Download className="w-4 h-4 text-violet-600" />
              Export CSV
            </button>
            <button
              onClick={onAddEntry}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-violet-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <button onClick={() => onSelectPerson('all')} className={chip(activePersonId === 'all')}>
            Everyone
          </button>
          {people.map(p => (
            <button key={p.id} onClick={() => onSelectPerson(p.id)} className={chip(activePersonId === p.id)}>
              {p.emoji} {p.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r.value)} className={chip(range === r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center">
          <p className="text-sm font-bold text-slate-900">No weigh-ins in this range</p>
          <p className="text-xs text-slate-500 mt-1">Widen the date range or log a new entry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayEntries]) => (
            <section key={date} className="glass-panel rounded-3xl overflow-hidden">
              <header className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {formatLongDate(date)}
                </h2>
              </header>

              <ul className="divide-y divide-slate-100">
                {dayEntries.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => onEditEntry(e)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      {e.person ? (
                        <PersonAvatar person={e.person} size="sm" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">?</span>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {e.person?.name || 'Unknown person'}
                          <span className="ml-2 text-[11px] font-normal text-slate-400 font-mono">{e.time}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {e.bmi !== null && <span className="mr-2">BMI {e.bmi}</span>}
                          {e.bodyFatPct !== undefined && <span className="mr-2">{e.bodyFatPct}% fat</span>}
                          {e.notes && <span className="italic">{e.notes}</span>}
                          {!e.notes && e.lastEditedBy && (
                            <span className="text-slate-400">edited by {e.lastEditedBy.displayName}</span>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-black font-mono text-slate-900 leading-tight">
                          {formatWeight(e.weightKg, unit, false)}
                          <span className="text-[10px] font-bold text-slate-400 ml-1">{unit}</span>
                        </p>
                        {e.deltaFromPreviousKg !== null && Math.abs(e.deltaFromPreviousKg) > 0.005 && (
                          <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                            e.deltaFromPreviousKg < 0 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {e.deltaFromPreviousKg < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                            {formatDelta(e.deltaFromPreviousKg, unit).replace(/^[+−]/, '')}
                          </p>
                        )}
                      </div>

                      <Pencil className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
