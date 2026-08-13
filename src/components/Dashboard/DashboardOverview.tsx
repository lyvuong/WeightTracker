import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { Users, ListOrdered, Flame, Target, UserPlus, ArrowDown, ArrowUp, Zap, Plus, Check } from 'lucide-react';
import type { EnrichedWeightEntry, Person, PersonStats, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { getPersonColor } from '../../constants/people';
import { ageFromBirthDate, bmiBand, formatDelta, formatWeight, fromKg } from '../../utils/units';
import { entriesForPerson, entryKey, formatShortDate, shiftDate } from '../../utils/weights';

interface DashboardOverviewProps {
  people: Person[];
  stats: PersonStats[];
  entries: EnrichedWeightEntry[];
  unit: WeightUnit;
  streak: number;
  today: string;
  lastLocalPersonId?: string;
  onWeighIn: (personId: string) => void;
  onWeighEveryone: () => void;
  onAddPerson: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  people,
  stats,
  entries,
  unit,
  streak,
  today,
  lastLocalPersonId,
  onWeighIn,
  onWeighEveryone,
  onAddPerson
}) => {
  if (people.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 font-display">No one is being tracked yet</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add everyone in the household — including kids and anyone without their own login — then log a weigh-in in two taps.
          </p>
        </div>
        <button
          onClick={onAddPerson}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add your first person
        </button>
      </div>
    );
  }

  // Sort stats so the last person who weighed in ON THIS DEVICE is on top
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      if (lastLocalPersonId) {
        if (a.person.id === lastLocalPersonId) return -1;
        if (b.person.id === lastLocalPersonId) return 1;
      }
      const keyA = a.latest ? entryKey(a.latest) : '';
      const keyB = b.latest ? entryKey(b.latest) : '';
      if (keyA !== keyB) {
        return keyB.localeCompare(keyA);
      }
      return (a.person.sortOrder ?? 0) - (b.person.sortOrder ?? 0);
    });
  }, [stats, lastLocalPersonId]);

  const pendingCount = stats.filter(s => !s.loggedToday).length;
  const goalCount = stats.filter(s => s.goalDeltaKg !== null && s.goalDeltaKg <= 0).length;
  const cutoff = shiftDate(today, -30);

  return (
    <div className="space-y-3">

      {/* Top Banner: Household Summary & Quick Weigh-Everyone Action */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-700 flex-wrap">
          <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-xl border border-violet-200">
            <Users className="w-3.5 h-3.5" />
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </span>
          <span className="flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-xl border border-cyan-200">
            <ListOrdered className="w-3.5 h-3.5" />
            {entries.length} logged
          </span>
          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl border border-amber-200">
            <Flame className="w-3.5 h-3.5" />
            {streak}d streak
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-200">
            <Target className="w-3.5 h-3.5" />
            {goalCount}/{stats.filter(s => s.person.goalWeightKg).length} at goal
          </span>
        </div>

        {pendingCount >= 2 && (
          <button
            onClick={onWeighEveryone}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all whitespace-nowrap ml-auto active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            Weigh everyone ({pendingCount} left)
          </button>
        )}
      </div>

      {/* Per-person summary cards — sorted with the most recent weigh-in user on top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedStats.map((s) => {
          const color = getPersonColor(s.person.color);
          const age = ageFromBirthDate(s.person.birthDate);
          const series = entriesForPerson(entries, s.person.id)
            .filter(e => e.date >= cutoff)
            .map(e => ({ date: formatShortDate(e.date), value: fromKg(e.weightKg, unit) }));

          return (
            <div key={s.person.id} className="glass-panel p-3.5 sm:p-4 rounded-2xl space-y-3 min-w-0">
              
              {/* Card Header: Avatar, Name & Today's Weigh-in Action / Status */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PersonAvatar person={s.person} size="md" />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 font-display leading-tight truncate">{s.person.name}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      {s.daysSinceLast === null
                        ? 'No weigh-ins yet'
                        : s.daysSinceLast === 0
                          ? 'Logged today'
                          : `Last ${s.daysSinceLast === 1 ? 'yesterday' : `${s.daysSinceLast}d ago`}`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {s.loggedToday && s.latest ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-700" />
                      </span>
                      <div>
                        <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 leading-none">
                          {formatWeight(s.latest.weightKg, unit, false)}
                          <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onWeighIn(s.person.id)}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Weigh In
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Column Key Stats: 7d, 30d, BMI */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {([
                  ['7 days', s.change7dKg],
                  ['30 days', s.change30dKg]
                ] as const).map(([label, value]) => (
                  <div key={label} className="inset-well rounded-xl py-1.5 px-2">
                    <p className={`text-xs sm:text-sm font-bold font-mono flex items-center justify-center gap-0.5 ${
                      value === null ? 'text-slate-400' : value < 0 ? 'text-emerald-600' : value > 0 ? 'text-amber-600' : 'text-slate-600'
                    }`}>
                      {value !== null && value < 0 && <ArrowDown className="w-3 h-3 shrink-0" />}
                      {value !== null && value > 0 && <ArrowUp className="w-3 h-3 shrink-0" />}
                      {formatDelta(value, unit).replace(/^[+−]/, '')}
                    </p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
                <div className="inset-well rounded-xl py-1.5 px-2">
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-700">{s.bmi ?? '—'}</p>
                  <p className="text-xs text-slate-500">BMI</p>
                </div>
              </div>

              {/* BMI Category & Goal Text */}
              {s.bmi !== null && (
                <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${bmiBand(s.bmi).chip}`}>
                    {bmiBand(s.bmi).label}
                  </span>
                  {s.person.goalWeightKg && s.goalDeltaKg !== null && (
                    <span className={s.goalDeltaKg <= 0 ? 'text-emerald-600 font-bold' : 'text-slate-600 font-medium'}>
                      Goal {formatWeight(s.person.goalWeightKg, unit)} ({s.goalDeltaKg <= 0 ? 'Reached 🎉' : `${formatDelta(s.goalDeltaKg, unit).replace('+', '')} left`})
                    </span>
                  )}
                </div>
              )}

              {s.person.goalWeightKg && s.goalDeltaKg !== null && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color.bar} rounded-full transition-all`}
                    style={{ width: `${s.goalProgressPct ?? 0}%` }}
                  />
                </div>
              )}

              {series.length > 1 && (
                <div className="h-16 w-full min-w-0 overflow-hidden pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: 12, boxShadow: '0 2px 8px rgba(15,23,42,0.1)' }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)} ${unit}`, s.person.name]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color.hex}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
