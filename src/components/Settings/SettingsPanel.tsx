import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cloud,
  Users,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  ShieldAlert,
  Scale,
  Info
} from 'lucide-react';
import type { FirebaseConfig, UserAuditInfo, UserProfile, WeightUnit } from '../../types';
import { getStoredFirebaseConfig, setStoredFirebaseConfig } from '../../services/storage';
import { initializeFirebaseService, loginWithGoogle } from '../../services/firebase';
import { fromKg, toKg } from '../../utils/units';

interface SettingsPanelProps {
  user: UserProfile | null;
  isFirebaseActive: boolean;
  familyCode: string;
  members: UserAuditInfo[];
  unit: WeightUnit;
  onSetUnit: (unit: WeightUnit) => void;
  onSetFamilyCode: (code: string) => Promise<{ success: boolean; message: string }>;
  onSignOut: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImportJSON: (json: string) => void;
  onRefreshData: () => void;
  onClearDemoData: () => void;
  onRestoreSampleData: () => void;
  onOpenAbout: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  user,
  isFirebaseActive,
  familyCode,
  members,
  unit,
  onSetUnit,
  onSetFamilyCode,
  onSignOut,
  onExportCSV,
  onExportJSON,
  onImportJSON,
  onRefreshData,
  onClearDemoData,
  onRestoreSampleData,
  onOpenAbout
}) => {
  const [inputFamilyCode, setInputFamilyCode] = useState(familyCode || '');
  const [familyStatusMsg, setFamilyStatusMsg] = useState('');
  const [isFamilySubmitting, setIsFamilySubmitting] = useState(false);

  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false);
  const [customConfig, setCustomConfig] = useState<FirebaseConfig>(() => {
    const existing = getStoredFirebaseConfig();
    return existing || {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  });
  const [firebaseSavedMsg, setFirebaseSavedMsg] = useState('');

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFamilySubmitting(true);
    setFamilyStatusMsg('');

    try {
      const res = await onSetFamilyCode(inputFamilyCode);
      setFamilyStatusMsg(res.message);
      if (!res.success) {
        setInputFamilyCode('');
      }
    } catch (err: any) {
      setFamilyStatusMsg(err.message || 'Error updating household code.');
      setInputFamilyCode('');
    } finally {
      setIsFamilySubmitting(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredFirebaseConfig(customConfig);
    const success = initializeFirebaseService(customConfig);
    if (success) {
      setFirebaseSavedMsg('✅ Custom Firebase config saved & initialized!');
      onRefreshData();
    } else {
      setFirebaseSavedMsg('⚠️ Config saved locally, but initialization failed. Check your keys.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        onImportJSON(event.target?.result as string);
        alert('🎉 Backup data imported successfully!');
      } catch (err: any) {
        alert(`❌ Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Live preview of the unit toggle, using a real round-trip through kg.
  const previewKg = toKg(180, 'lb');

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="glass-panel p-6 rounded-3xl space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-white font-display">Settings & Account</h1>
        </div>
        <p className="text-xs text-slate-400">
          Manage your login, units, household code, backups, and cloud setup.
        </p>
      </div>

      {/* 1. Google Account */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-white">Google User Account</h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            user
              ? 'bg-violet-950 text-violet-300 border-violet-800'
              : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {user ? (isFirebaseActive ? 'Authenticated (Firebase sync active)' : 'Authenticated') : 'Offline / Signed out'}
          </span>
        </div>

        {user ? (
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-12 h-12 rounded-full border border-violet-500/30" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-lg border border-violet-500/30">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <h3 className="font-bold text-white text-sm">{user.displayName}</h3>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold px-4 py-2 rounded-xl border border-red-800/80 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Sign in with Google to enable cloud backups, cross-device sync, and shared household weigh-ins.
            </p>
            <button
              onClick={() => loginWithGoogle()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/20 transition-all"
            >
              <Cloud className="w-4 h-4" />
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* 2. Units */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-bold text-white">Units</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Weights are always stored in kilograms, so switching units only changes how they're displayed —
          nothing is rewritten, and everyone in the household can use whichever unit they prefer.
        </p>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['lb', 'kg'] as WeightUnit[]).map(u => (
              <button
                key={u}
                onClick={() => onSetUnit(u)}
                className={`py-3 rounded-xl text-sm font-black transition-all border ${
                  unit === u
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/40 shadow-inner'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 font-mono text-center">
            {fromKg(previewKg, 'lb').toFixed(1)} lb = {fromKg(previewKg, 'kg').toFixed(1)} kg
          </p>
        </div>
      </div>

      {/* 3. Shared Household Sync */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Shared Household Sync</h2>
          </div>
          {familyCode && (
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              Active: {familyCode}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Anyone entering the same <strong>Household Code</strong> sees and edits the same people and weigh-ins in real
          time from their own Google account. Use the same code you use in CarTracker, HomeTracker and ExpenseTracker.
          There is no privacy between members here — everyone in the household can see everyone's weights.
        </p>

        <form onSubmit={handleJoinHousehold} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Household sync code (e.g. VUONG-FAMILY)
            </label>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                placeholder="E.G. VUONG-FAMILY"
                value={inputFamilyCode}
                onChange={(e) => setInputFamilyCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={isFamilySubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {isFamilySubmitting ? 'Verifying...' : 'Save & Join Household'}
              </button>
            </div>
          </div>

          {familyStatusMsg && (
            <p className={`text-xs font-semibold p-3 rounded-xl border ${
              familyStatusMsg.includes('✅') || familyStatusMsg.includes('🎉')
                ? 'bg-violet-950/80 text-violet-300 border-violet-800'
                : 'bg-red-950/80 text-red-300 border-red-800'
            }`}>
              {familyStatusMsg}
            </p>
          )}

          {familyCode && members.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h3 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                Members of {familyCode}
              </h3>
              <ul className="space-y-1.5">
                {members.map(m => (
                  <li key={m.uid} className="flex items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                      {m.displayName?.[0] || '?'}
                    </span>
                    <span className="text-slate-200 font-semibold">{m.displayName}</span>
                    {m.email && <span className="text-slate-500 font-mono truncate">{m.email}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>

      {/* 4. Data Portability */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-bold text-white">Data Portability & Offline Backups</h2>
        </div>

        <p className="text-xs text-slate-400">
          Export the full weight log as CSV (both lb and kg columns) or a JSON backup you can restore later.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4 text-violet-400" />
            Export CSV
          </button>

          <button
            onClick={onExportJSON}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4 text-violet-400" />
            Export full JSON backup
          </button>

          <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-violet-400" />
            Import JSON backup
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* 5. Advanced */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800/80">
        <button
          onClick={() => setIsAdvancedUnlocked(!isAdvancedUnlocked)}
          className="w-full p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              {isAdvancedUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Advanced Firebase & Demo Data</h2>
              <p className="text-xs text-slate-400">Custom API keys and demo data reset.</p>
            </div>
          </div>

          <span className="text-xs text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl whitespace-nowrap">
            {isAdvancedUnlocked ? 'Hide' : '🔓 Unlock'}
            {isAdvancedUnlocked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isAdvancedUnlocked && (
          <div className="p-6 pt-0 space-y-6 border-t border-slate-800/80 bg-slate-950/60">
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                These controls are for advanced setup. Changing API keys or clearing demo data affects this browser session.
              </span>
            </div>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Custom Firebase credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['API Key', 'apiKey', 'AIzaSy...'],
                  ['Project ID', 'projectId', 'my-autotrack-app'],
                  ['Auth Domain (optional)', 'authDomain', 'my-app.firebaseapp.com'],
                  ['App ID (optional)', 'appId', '1:123456:web:abcd']
                ] as const).map(([label, key, placeholder]) => (
                  <div key={key}>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={customConfig[key] || ''}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Save custom Firebase keys
                </button>
                {firebaseSavedMsg && <span className="text-xs text-violet-300 font-semibold">{firebaseSavedMsg}</span>}
              </div>
            </form>

            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Demo dataset management
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    if (confirm('Clear the sample people and weigh-ins from local storage?')) {
                      onClearDemoData();
                    }
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-950 text-red-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 hover:border-red-800 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge demo data
                </button>

                <button
                  onClick={() => {
                    onRestoreSampleData();
                    alert('Sample dataset restored!');
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-violet-400" />
                  Restore sample data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onOpenAbout}
        className="w-full glass-panel p-4 rounded-3xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-violet-300 transition-colors"
      >
        <Info className="w-4 h-4" />
        About WeightTracker
      </button>
    </div>
  );
};
