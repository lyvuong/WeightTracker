import React from 'react';
import { PlusCircle, Wifi, WifiOff, Cloud, Database, Settings, Info, UserPlus } from 'lucide-react';
import type { Person, UserProfile } from '../../types';

interface NavbarProps {
  people: Person[];
  activePersonId: string;
  onSelectPerson: (id: string) => void;
  onOpenWeighIn: () => void;
  onOpenAddPerson: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  user: UserProfile | null;
  isOnline: boolean;
  isFirebaseActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  people,
  activePersonId,
  onSelectPerson,
  onOpenWeighIn,
  onOpenAddPerson,
  onOpenSettings,
  onOpenAbout,
  user,
  isOnline,
  isFirebaseActive
}) => (
  <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16 gap-3">

        {/* Logo & App Name */}
        <div className="flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt="WeightTracker Icon"
            className="w-10 h-10 rounded-xl shadow-md shadow-violet-500/20 ring-1 ring-slate-200 object-cover"
          />
          <div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 font-display">
              Weight<span className="text-violet-600">Tracker</span>
            </span>
            <span className="hidden xl:inline-block ml-2 text-[10px] uppercase font-bold px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-md tracking-wider">
              PWA v1.0
            </span>
          </div>
        </div>

        {/* Person selector — drives the default filter on Log and Trends */}
        <div className="flex-1 max-w-xs sm:max-w-sm mx-2 hidden sm:block">
          {people.length > 0 ? (
            <select
              value={activePersonId}
              onChange={(e) => onSelectPerson(e.target.value)}
              className="w-full bg-white border border-slate-300 text-violet-700 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-sm truncate"
            >
              <option value="all" className="bg-white text-slate-900">👨‍👩‍👧 Everyone</option>
              {people.map(p => (
                <option key={p.id} value={p.id} className="bg-white text-slate-900">
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={onOpenAddPerson}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 border-dashed flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-violet-600" />
              <span>Add your first person</span>
            </button>
          )}
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">

          {/* Network Offline / Online Badge */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* Firebase Status Badge */}
          <button
            onClick={onOpenSettings}
            title={isFirebaseActive ? `Synced with Firebase Cloud (${user?.email || 'Cloud Firestore'})` : 'Local / Demo Storage (Click to set up Firebase)'}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              isFirebaseActive
                ? 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
          >
            {isFirebaseActive ? <Cloud className="w-3.5 h-3.5 text-violet-600" /> : <Database className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isFirebaseActive ? 'Firebase Sync' : 'Demo Storage'}</span>
          </button>

          {/* Primary action */}
          <button
            onClick={onOpenWeighIn}
            disabled={people.length === 0}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Weigh In</span>
          </button>

          {/* About */}
          <button
            onClick={onOpenAbout}
            className="p-2 text-slate-500 hover:text-violet-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all"
            title="About WeightTracker"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:block p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all"
            title="Settings & Firebase Config"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  </header>
);
