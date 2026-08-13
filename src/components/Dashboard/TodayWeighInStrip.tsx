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
    <section className="glass-panel p-3 sm:p-3.5 rounded-2xl space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 font-display">Today's weigh-ins</h2>
          <p className="text-[10px] text-slate-500">
            {pending.length === 0
              ? 'Everyone is logged for today 🎉'
              : `${pending.length} of ${stats.length} still to go`}
          </p>
        </div>

        {pending.length >= 2 && (
          <button
            onClick={onWeighEveryone}
            className="flex items-center gap-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap"
          >
            <Zap className="w-3 h-3" />
            Weigh everyone
          </button>
        )}
      </div>

      <div className={`grid grid-cols-2 ${stats.length > 4 ? 'sm:flex sm:overflow-x-auto sm:scrollbar-none' : 'sm:grid-cols-3 md:grid-cols-4'} gap-2 sm:gap-2.5`}>
        {stats.map((s) => {
          const color = getPersonColor(s.person.color);
          const delta = s.latest && s.previous ? s.latest.weightKg - s.previous.weightKg : null;

          return (
            <button
              key={s.person.id}
              onClick={() => onWeighIn(s.person.id)}
              className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.98] flex flex-col justify-between min-w-0 ${
                stats.length > 4 ? 'sm:w-36 sm:shrink-0' : 'w-full'
              } ${
                s.loggedToday
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  : 'bg-slate-50 border-dashed border-slate-300 hover:border-violet-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <PersonAvatar person={s.person} size="sm" />
                {s.loggedToday ? (
                  <span className="w-5 h-5 rounded-full bg-violet-100 border border-violet-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-700" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                )}
              </div>

              <p className={`text-[11px] font-bold truncate ${color.text}`}>{s.person.name}</p>

              {s.loggedToday && s.latest ? (
                <div className="mt-0.5">
                  <p className="text-base sm:text-xl font-black font-mono text-slate-900 leading-tight truncate">
                    {formatWeight(s.latest.weightKg, unit, false)}
                    <span className="text-[10px] font-bold text-slate-400 ml-1">{unit}</span>
                  </p>
                  {delta !== null && Math.abs(delta) > 0.005 ? (
                    <p className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 truncate ${
                      delta < 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {delta < 0 ? <ArrowDown className="w-2.5 h-2.5 shrink-0" /> : <ArrowUp className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate">{formatDelta(delta, unit)}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">First entry</p>
                  )}
                </div>
              ) : (
                <div className="mt-0.5">
                  <p className="text-base sm:text-xl font-black font-mono text-slate-300 leading-tight truncate">
                    {s.latest ? formatWeight(s.latest.weightKg, unit, false) : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {s.daysSinceLast === null
                      ? 'No weigh-ins'
                      : s.daysSinceLast === 1
                        ? 'Yesterday'
                        : `${s.daysSinceLast}d ago`}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
