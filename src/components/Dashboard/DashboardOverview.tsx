import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { Users, ListOrdered, Flame, Target, UserPlus, ArrowDown, ArrowUp } from 'lucide-react';
import type { EnrichedWeightEntry, Person, PersonStats, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { getPersonColor } from '../../constants/people';
import { ageFromBirthDate, bmiBand, formatDelta, formatWeight, fromKg } from '../../utils/units';
import { entriesForPerson, formatShortDate, shiftDate } from '../../utils/weights';
import { TodayWeighInStrip } from './TodayWeighInStrip';

interface DashboardOverviewProps {
  people: Person[];
  stats: PersonStats[];
  entries: EnrichedWeightEntry[];
  unit: WeightUnit;
  streak: number;
  today: string;
  onWeighIn: (personId: string) => void;
  onWeighEveryone: () => void;
  onAddPerson: () => void;
}

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: string; tone: string }> = ({
  icon: Icon,
  label,
  value,
  tone
}) => (
  <div className="glass-card p-4 rounded-2xl">
    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 ${tone}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-xl font-black font-mono text-white leading-none">{value}</p>
    <p className="text-[11px] text-slate-400 mt-1">{label}</p>
  </div>
);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  people,
  stats,
  entries,
  unit,
  streak,
  today,
  onWeighIn,
  onWeighEveryone,
  onAddPerson
}) => {
  if (people.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white font-display">No one is being tracked yet</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add everyone in the household — including kids and anyone without their own login — then log a weigh-in in two taps.
          </p>
        </div>
        <button
          onClick={onAddPerson}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add your first person
        </button>
      </div>
    );
  }

  const goalCount = stats.filter(s => s.goalDeltaKg !== null && s.goalDeltaKg <= 0).length;
  const cutoff = shiftDate(today, -30);

  return (
    <div className="space-y-6">
      <TodayWeighInStrip
        stats={stats}
        unit={unit}
        onWeighIn={onWeighIn}
        onWeighEveryone={onWeighEveryone}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Users}
          label="People tracked"
          value={String(people.length)}
          tone="bg-violet-500/10 border-violet-500/20 text-violet-400"
        />
        <StatTile
          icon={ListOrdered}
          label="Weigh-ins logged"
          value={String(entries.length)}
          tone="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
        />
        <StatTile
          icon={Flame}
          label={streak === 1 ? 'Day everyone logged' : 'Days everyone logged'}
          value={String(streak)}
          tone="bg-amber-500/10 border-amber-500/20 text-amber-400"
        />
        <StatTile
          icon={Target}
          label="At or under goal"
          value={`${goalCount}/${stats.filter(s => s.person.goalWeightKg).length || 0}`}
          tone="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        />
      </div>

      {/* Per-person summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((s) => {
          const color = getPersonColor(s.person.color);
          const age = ageFromBirthDate(s.person.birthDate);
          const series = entriesForPerson(entries, s.person.id)
            .filter(e => e.date >= cutoff)
            .map(e => ({ date: formatShortDate(e.date), value: fromKg(e.weightKg, unit) }));

          return (
            // min-w-0: grid items default to min-width:auto, which lets the
            // chart's measured width push the column past the viewport.
            <div key={s.person.id} className="glass-panel p-5 rounded-3xl space-y-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PersonAvatar person={s.person} size="lg" />
                  <div>
                    <h3 className="text-base font-black text-white font-display leading-tight">{s.person.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {s.entryCount} weigh-in{s.entryCount === 1 ? '' : 's'}
                      {s.daysSinceLast !== null && ` · last ${s.daysSinceLast === 0 ? 'today' : `${s.daysSinceLast}d ago`}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black font-mono text-white leading-none">
                    {s.latest ? formatWeight(s.latest.weightKg, unit, false) : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {([
                  ['7 days', s.change7dKg],
                  ['30 days', s.change30dKg]
                ] as const).map(([label, value]) => (
                  <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl py-2">
                    <p className={`text-sm font-bold font-mono flex items-center justify-center gap-0.5 ${
                      value === null ? 'text-slate-600' : value < 0 ? 'text-emerald-400' : value > 0 ? 'text-amber-400' : 'text-slate-300'
                    }`}>
                      {value !== null && value < 0 && <ArrowDown className="w-3 h-3" />}
                      {value !== null && value > 0 && <ArrowUp className="w-3 h-3" />}
                      {formatDelta(value, unit).replace(/^[+−]/, '')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2">
                  <p className="text-sm font-bold font-mono text-slate-200">{s.bmi ?? '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">BMI</p>
                </div>
              </div>

              {s.bmi !== null && (
                age !== null && age < 20 ? (
                  <p className="text-[11px] text-slate-500">
                    BMI categories are for adults — not a clinical measure under 20.
                  </p>
                ) : (
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${bmiBand(s.bmi).chip}`}>
                    {bmiBand(s.bmi).label}
                  </span>
                )
              )}

              {s.person.goalWeightKg && s.goalDeltaKg !== null && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Goal {formatWeight(s.person.goalWeightKg, unit)}
                    </span>
                    <span className={s.goalDeltaKg <= 0 ? 'text-emerald-400 font-bold' : 'text-slate-300 font-semibold'}>
                      {s.goalDeltaKg <= 0
                        ? 'Goal reached 🎉'
                        : `${formatDelta(s.goalDeltaKg, unit).replace('+', '')} to go`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color.bar} rounded-full transition-all`}
                      style={{ width: `${s.goalProgressPct ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              {series.length > 1 && (
                <div className="h-24 w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: 12 }}
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
                  <p className="text-[10px] text-slate-500 text-center">Last 30 days</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
