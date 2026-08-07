import React from 'react';
import { Plus, Check, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import type { PersonStats, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { formatDelta, formatWeight } from '../../utils/units';
import { getPersonColor } from '../../constants/people';

interface TodayWeighInStripProps {
  stats: PersonStats[];
  unit: WeightUnit;
  onWeighIn: (personId: string) => void;
  onWeighEveryone: () => void;
}

export const TodayWeighInStrip: React.FC<TodayWeighInStripProps> = ({
  stats,
  unit,
  onWeighIn,
  onWeighEveryone
}) => {
  const pending = stats.filter(s => !s.loggedToday);

  return (
    <section className="glass-panel p-5 rounded-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 font-display">Today's weigh-ins</h2>
          <p className="text-[11px] text-slate-500">
            {pending.length === 0
              ? 'Everyone is logged for today 🎉'
              : `${pending.length} of ${stats.length} still to go`}
          </p>
        </div>

        {pending.length >= 2 && (
          <button
            onClick={onWeighEveryone}
            className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            Weigh everyone
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        {stats.map((s) => {
          const color = getPersonColor(s.person.color);
          const delta = s.latest && s.previous ? s.latest.weightKg - s.previous.weightKg : null;

          return (
            <button
              key={s.person.id}
              onClick={() => onWeighIn(s.person.id)}
              className={`shrink-0 w-40 text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                s.loggedToday
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  : 'bg-slate-50 border-dashed border-slate-300 hover:border-violet-400'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <PersonAvatar person={s.person} size="sm" />
                {s.loggedToday ? (
                  <span className="w-6 h-6 rounded-full bg-violet-100 border border-violet-300 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-violet-700" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-slate-500" />
                  </span>
                )}
              </div>

              <p className={`text-xs font-bold truncate ${color.text}`}>{s.person.name}</p>

              {s.loggedToday && s.latest ? (
                <>
                  <p className="text-2xl font-black font-mono text-slate-900 leading-tight mt-1">
                    {formatWeight(s.latest.weightKg, unit, false)}
                    <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
                  </p>
                  {delta !== null && Math.abs(delta) > 0.005 ? (
                    <p className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
                      delta < 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {delta < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                      {formatDelta(delta, unit)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-0.5">First entry</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-black font-mono text-slate-300 leading-tight mt-1">
                    {s.latest ? formatWeight(s.latest.weightKg, unit, false) : '—'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.daysSinceLast === null
                      ? 'No weigh-ins yet'
                      : s.daysSinceLast === 1
                        ? 'Yesterday'
                        : `${s.daysSinceLast} days ago`}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
