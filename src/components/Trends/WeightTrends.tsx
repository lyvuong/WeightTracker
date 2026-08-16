import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { TrendingUp, Layers, Calendar } from 'lucide-react';
import type { EnrichedWeightEntry, Person, TrendRange, WeightUnit } from '../../types';
import { getPersonColor } from '../../constants/people';
import { fromKg } from '../../utils/units';
import { compareEntriesChronological, entryKey, formatDisplayTime, formatShortDate, movingAverage, shiftDate } from '../../utils/weights';

interface WeightTrendsProps {
  entries: EnrichedWeightEntry[];
  people: Person[];
  unit: WeightUnit;
  today: string;
}

const RANGES: { value: TrendRange; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 365, label: '1Y' },
  { value: 0, label: 'All' }
];

const AXIS = { stroke: '#94a3b8', tick: { fill: '#64748b', fontSize: 12 } };
const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  borderRadius: '12px',
  color: '#0f172a',
  fontSize: 12,
  boxShadow: '0 4px 16px -4px rgba(15,23,42,0.15)'
};

/** ISO-ish week key (Monday start) used to bucket the weekly change chart. */
const weekStart = (date: string): string => {
  const d = new Date(`${date}T00:00:00`);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const WeightTrends: React.FC<WeightTrendsProps> = ({ entries, people, unit, today }) => {
  const [range, setRange] = useState<TrendRange>(90);
  const [plotMode, setPlotMode] = useState<'all' | 'dailyAvg'>('all');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showAverage, setShowAverage] = useState(true);

  const visible = useMemo(() => people.filter(p => !hidden.has(p.id)), [people, hidden]);

  const inRange = useMemo(() => {
    const cutoff = range === 0 ? '' : shiftDate(today, -range);
    return entries.filter(e => range === 0 || e.date >= cutoff);
  }, [entries, range, today]);

  /**
   * Generates chart rows based on selected plotMode:
   * - 'all': Every weigh-in is its own point with its distinct timestamp
   * - 'dailyAvg': Averages multiple weigh-ins on the same day into one point per date
   */
  const chartData = useMemo(() => {
    const chronological = [...inRange].sort(compareEntriesChronological);

    if (plotMode === 'dailyAvg') {
      // Group by calendar date and compute mean weight for each person
      const byDate = new Map<string, { sums: Record<string, number>; counts: Record<string, number> }>();
      chronological.forEach((e) => {
        const item = byDate.get(e.date) || { sums: {}, counts: {} };
        item.sums[e.personId] = (item.sums[e.personId] || 0) + fromKg(e.weightKg, unit);
        item.counts[e.personId] = (item.counts[e.personId] || 0) + 1;
        byDate.set(e.date, item);
      });

      const rows = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => {
          const row: Record<string, any> = {
            date: formatShortDate(date),
            rawDate: date,
            fullLabel: formatShortDate(date)
          };
          for (const pid of Object.keys(data.sums)) {
            row[pid] = Math.round((data.sums[pid] / data.counts[pid]) * 10) / 10;
          }
          return row;
        });

      if (showAverage) {
        people.forEach((p) => {
          const series = rows.map(r => (r[p.id] === undefined ? null : (r[p.id] as number)));
          const ma = movingAverage(series, 7);
          rows.forEach((r, i) => {
            if (ma[i] !== null) r[`${p.id}__ma`] = ma[i];
          });
        });
      }

      return rows;
    }

    // Default 'all': Pivot each chronological timestamp
    // If multiple entries occur at the exact same minute across different people, merge into the same row
    const byTs = new Map<string, Record<string, any>>();
    chronological.forEach((e) => {
      const tsKey = entryKey(e);
      const row = byTs.get(tsKey) || {
        date: formatShortDate(e.date),
        rawDate: e.date,
        time: e.time,
        fullLabel: `${formatShortDate(e.date)}${e.time ? ` ${formatDisplayTime(e.time)}` : ''}`
      };
      row[e.personId] = fromKg(e.weightKg, unit);
      byTs.set(tsKey, row);
    });

    const rows = Array.from(byTs.values());

    if (showAverage) {
      people.forEach((p) => {
        const series = rows.map(r => (r[p.id] === undefined ? null : (r[p.id] as number)));
        const ma = movingAverage(series, 7);
        rows.forEach((r, i) => {
          if (ma[i] !== null) r[`${p.id}__ma`] = ma[i];
        });
      });
    }

    return rows;
  }, [inRange, unit, plotMode, showAverage, people]);

  const soloPerson = visible.length === 1 ? visible[0] : null;

  /**
   * Padded domain — without it a 2 lb swing flattens against zero. When a goal
   * line is drawn it has to be inside the domain too, otherwise recharts clips
   * it and the reference line silently disappears.
   */
  const yDomain = useMemo<[number | string, number | string]>(() => {
    const goal = soloPerson?.goalWeightKg ? fromKg(soloPerson.goalWeightKg, unit) : null;
    if (goal === null) return ['dataMin - 2', 'dataMax + 2'];

    const values = chartData
      .flatMap(row => visible.map(p => row[p.id]))
      .filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return ['dataMin - 2', 'dataMax + 2'];

    return [
      Math.floor(Math.min(...values, goal) - 2),
      Math.ceil(Math.max(...values, goal) + 2)
    ];
  }, [chartData, visible, soloPerson, unit]);

  const hasBodyFat = useMemo(
    () => inRange.some(e => e.bodyFatPct !== undefined && !hidden.has(e.personId)),
    [inRange, hidden]
  );

  const bodyFatData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();
    inRange
      .filter(e => e.bodyFatPct !== undefined)
      .forEach((e) => {
        const row = byDate.get(e.date) || { date: formatShortDate(e.date) };
        row[e.personId] = e.bodyFatPct;
        byDate.set(e.date, row);
      });
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, r]) => r);
  }, [inRange]);

  /** Net change per calendar week, for the single selected person. */
  const weeklyData = useMemo(() => {
    if (!soloPerson) return [];
    const buckets = new Map<string, { first: number; last: number }>();
    [...inRange]
      .filter(e => e.personId === soloPerson.id)
      .sort((a, b) => entryKey(a).localeCompare(entryKey(b)))
      .forEach((e) => {
        const wk = weekStart(e.date);
        const b = buckets.get(wk);
        if (b) b.last = e.weightKg;
        else buckets.set(wk, { first: e.weightKg, last: e.weightKg });
      });

    const weeks = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return weeks.map(([wk, b], i) => {
      const prev = i > 0 ? weeks[i - 1][1].last : b.first;
      return {
        week: formatShortDate(wk),
        change: Math.round((fromKg(b.last, unit) - fromKg(prev, unit)) * 10) / 10
      };
    });
  }, [inRange, soloPerson, unit]);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chip = (isActive: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
      isActive
        ? 'bg-violet-50 text-violet-700 border-violet-200'
        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
    }`;

  if (people.length === 0 || entries.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center">
        <p className="text-sm font-bold text-slate-900">Nothing to chart yet</p>
        <p className="text-xs text-slate-500 mt-1">Log a few weigh-ins and trends will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 font-display">Trends</h1>
            <p className="text-[11px] text-slate-500">
              Daily weight swings of a pound or two are normal — the dashed 7-point average is the line to watch.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.value)} className={chip(range === r.value)}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPlotMode('all')}
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                plotMode === 'all'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              All weigh-ins
            </button>
            <button
              onClick={() => setPlotMode('dailyAvg')}
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                plotMode === 'dailyAvg'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Daily average
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {people.map((p) => {
            const isVisible = !hidden.has(p.id);
            const color = getPersonColor(p.color);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  isVisible ? color.chip : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isVisible ? color.dot : 'bg-slate-300'}`} />
                {p.name}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={showAverage}
            onChange={(e) => setShowAverage(e.target.checked)}
            className="accent-violet-500 w-4 h-4"
          />
          Show 7-point moving average
        </label>
      </div>

      {/* Weight over time */}
      <section className="glass-panel p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Weight over time ({unit}) {plotMode === 'all' ? '· Intraday' : '· Daily Avg'}
          </h2>
          <span className="text-[11px] text-slate-400">
            {chartData.length} data points
          </span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" {...AXIS} minTickGap={24} />
              <YAxis domain={yDomain} {...AXIS} width={38} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: any, name: any) => [`${Number(value).toFixed(1)} ${unit}`, String(name)]}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel || _label}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />

              {soloPerson?.goalWeightKg && (
                <ReferenceLine
                  y={fromKg(soloPerson.goalWeightKg, unit)}
                  stroke={getPersonColor(soloPerson.color).hex}
                  strokeDasharray="6 4"
                  label={{ value: 'Goal', fill: '#64748b', fontSize: 11, position: 'right' }}
                />
              )}

              {visible.map(p => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.id}
                  name={p.name}
                  stroke={getPersonColor(p.color).hex}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}

              {showAverage && visible.map(p => (
                <Line
                  key={`${p.id}__ma`}
                  type="monotone"
                  dataKey={`${p.id}__ma`}
                  name={`${p.name} · avg`}
                  stroke={getPersonColor(p.color).hex}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {visible.length > 1 && people.some(p => p.goalWeightKg) && (
          <p className="text-[11px] text-slate-400">
            Goal lines are shown when a single person is selected — several dashed goals at once are unreadable. Goal progress for everyone is on the Dashboard.
          </p>
        )}
      </section>

      {/* Weekly net change, single person only */}
      {soloPerson && weeklyData.length > 1 && (
        <section className="glass-panel p-5 rounded-3xl space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Weekly change · {soloPerson.name} ({unit})
          </h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" {...AXIS} minTickGap={16} />
                <YAxis {...AXIS} width={38} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: any) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(1)} ${unit}`, 'Change']}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="change" radius={[4, 4, 4, 4]}>
                  {weeklyData.map((d, i) => (
                    <Cell key={i} fill={d.change <= 0 ? '#059669' : '#d97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Body fat, only when anyone actually records it */}
      {hasBodyFat && bodyFatData.length > 1 && (
        <section className="glass-panel p-5 rounded-3xl space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Body fat (%)</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyFatData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" {...AXIS} minTickGap={24} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} {...AXIS} width={38} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any) => [`${v}%`, String(n)]} />
                {visible.map(p => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    name={p.name}
                    stroke={getPersonColor(p.color).hex}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};
