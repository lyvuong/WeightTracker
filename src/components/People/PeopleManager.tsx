import React from 'react';
import { UserPlus, Pencil, Users, Ruler, Target, Scale } from 'lucide-react';
import type { Person, PersonStats, UserAuditInfo, WeightUnit } from '../../types';
import { PersonAvatar } from '../People/PersonAvatar';
import { formatHeight, formatWeight } from '../../utils/units';

interface PeopleManagerProps {
  people: Person[];
  stats: PersonStats[];
  householdMembers: UserAuditInfo[];
  familyCode: string;
  unit: WeightUnit;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onAddFromMember: (member: UserAuditInfo) => void;
}

export const PeopleManager: React.FC<PeopleManagerProps> = ({
  people,
  stats,
  householdMembers,
  familyCode,
  unit,
  onAddPerson,
  onEditPerson,
  onAddFromMember
}) => {
  const statById = new Map(stats.map(s => [s.person.id, s]));

  // Household members who signed in but have no weight profile yet.
  const unprofiled = familyCode
    ? householdMembers.filter(m => !people.some(p => p.linkedUid === m.uid))
    : [];

  return (
    <div className="space-y-5">
      <div className="glass-panel p-5 rounded-3xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 font-display">People</h1>
            <p className="text-[11px] text-slate-500">
              Everyone tracked in this {familyCode ? 'household' : 'personal log'}. Profiles don't need their own login.
            </p>
          </div>
        </div>

        <button
          onClick={onAddPerson}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-violet-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add person
        </button>
      </div>

      {unprofiled.map(member => (
        <div
          key={member.uid}
          className="glass-card p-4 rounded-2xl border border-amber-200 bg-amber-50 flex items-center justify-between gap-3 flex-wrap"
        >
          <p className="text-xs text-amber-800">
            <strong>{member.displayName}</strong> is in this household but has no weight profile yet.
          </p>
          <button
            onClick={() => onAddFromMember(member)}
            className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap"
          >
            Add profile
          </button>
        </div>
      ))}

      {people.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center">
          <p className="text-sm font-bold text-slate-900">No people yet</p>
          <p className="text-xs text-slate-500 mt-1">Add everyone whose weight you want to track.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((person) => {
            const s = statById.get(person.id);
            return (
              <div key={person.id} className="glass-panel p-5 rounded-3xl space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <PersonAvatar person={person} size="lg" />
                    <div>
                      <h3 className="text-base font-black text-slate-900 font-display leading-tight">{person.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {s?.entryCount ?? 0} weigh-in{(s?.entryCount ?? 0) === 1 ? '' : 's'}
                        {s?.daysSinceLast !== null && s?.daysSinceLast !== undefined &&
                          ` · last ${s.daysSinceLast === 0 ? 'today' : `${s.daysSinceLast}d ago`}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onEditPerson(person)}
                    className="p-2 text-slate-400 hover:text-violet-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all"
                    title={`Edit ${person.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <dl className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      <Scale className="w-3.5 h-3.5" /> Current
                    </dt>
                    <dd className="font-mono font-bold text-slate-900">
                      {s?.latest ? formatWeight(s.latest.weightKg, unit) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      <Ruler className="w-3.5 h-3.5" /> Height
                    </dt>
                    <dd className="font-mono font-bold text-slate-700">{formatHeight(person.heightCm, unit)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-slate-500">
                      <Target className="w-3.5 h-3.5" /> Goal
                    </dt>
                    <dd className="font-mono font-bold text-slate-700">
                      {person.goalWeightKg ? formatWeight(person.goalWeightKg, unit) : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
