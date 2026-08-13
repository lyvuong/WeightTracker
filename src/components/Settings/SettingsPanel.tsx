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

  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setAuthErrorMsg('');
    if (!isFirebaseActive) {
      setAuthErrorMsg('⚠️ Firebase is not configured yet. Please expand "Advanced Settings" below to enter your Firebase credentials or add a .env file.');
      setIsAdvancedUnlocked(true);
      return;
    }
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setAuthErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
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
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-display">Settings & Account</h1>
        </div>
        <p className="text-xs text-slate-500">
          Manage your login, units, household code, backups, and cloud setup.
        </p>
      </div>

      {/* 1. Google Account */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-bold text-slate-900">Google User Account</h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            user
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {user ? (isFirebaseActive ? 'Authenticated (Firebase sync active)' : 'Authenticated') : 'Offline / Signed out'}
          </span>
        </div>

        {user ? (
          <div className="inset-well p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-12 h-12 rounded-full border border-violet-200" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-lg border border-violet-200">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{user.displayName}</h3>
                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-4 py-2 rounded-xl border border-red-200 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="inset-well p-5 rounded-2xl text-center space-y-3">
            <p className="text-xs text-slate-500">
              Sign in with Google to enable cloud backups, cross-device sync, and shared household weigh-ins.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-50"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>

            {authErrorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-left font-medium mt-2 leading-relaxed">
                {authErrorMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Units */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">Units</h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Weights are always stored in kilograms, so switching units only changes how they're displayed —
          nothing is rewritten, and everyone in the household can use whichever unit they prefer.
        </p>

        <div className="inset-well p-4 rounded-2xl space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['lb', 'kg'] as WeightUnit[]).map(u => (
              <button
                key={u}
                onClick={() => onSetUnit(u)}
                className={`py-3 rounded-xl text-sm font-black transition-all border ${
                  unit === u
                    ? 'bg-violet-100 text-violet-700 border-violet-300 shadow-inner'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
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
            <Users className="w-5 h-5 text-cyan-600" />
            <h2 className="text-lg font-bold text-slate-900">Shared Household Sync</h2>
          </div>
          {familyCode && (
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              Active: {familyCode}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Anyone entering the same <strong>Household Code</strong> sees and edits the same people and weigh-ins in real
          time from their own Google account. Use the same code you use in CarTracker, HomeTracker and ExpenseTracker.
          There is no privacy between members here — everyone in the household can see everyone's weights.
        </p>

        <form onSubmit={handleJoinHousehold} className="inset-well p-5 rounded-2xl space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Household sync code (e.g. VUONG-FAMILY)
            </label>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                placeholder="E.G. VUONG-FAMILY"
                value={inputFamilyCode}
                onChange={(e) => setInputFamilyCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 bg-white border border-slate-300 text-slate-900 font-mono text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={isFamilySubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-cyan-600/20 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {isFamilySubmitting ? 'Verifying...' : 'Save & Join Household'}
              </button>
            </div>
          </div>

          {familyStatusMsg && (
            <p className={`text-xs font-semibold p-3 rounded-xl border ${
              familyStatusMsg.includes('✅') || familyStatusMsg.includes('🎉')
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {familyStatusMsg}
            </p>
          )}

          {familyCode && members.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h3 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                Members of {familyCode}
              </h3>
              <ul className="space-y-1.5">
                {members.map(m => (
                  <li key={m.uid} className="flex items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold text-[10px]">
                      {m.displayName?.[0] || '?'}
                    </span>
                    <span className="text-slate-800 font-semibold">{m.displayName}</span>
                    {m.email && <span className="text-slate-400 font-mono truncate">{m.email}</span>}
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
          <Download className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">Data Portability & Offline Backups</h2>
        </div>

        <p className="text-xs text-slate-500">
          Export the full weight log as CSV (both lb and kg columns) or a JSON backup you can restore later.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all"
          >
            <Download className="w-4 h-4 text-violet-600" />
            Export CSV
          </button>

          <button
            onClick={onExportJSON}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all"
          >
            <Download className="w-4 h-4 text-violet-600" />
            Export full JSON backup
          </button>

          <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-violet-600" />
            Import JSON backup
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* 5. Advanced */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <button
          onClick={() => setIsAdvancedUnlocked(!isAdvancedUnlocked)}
          className="w-full p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              {isAdvancedUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Advanced Firebase & Demo Data</h2>
              <p className="text-xs text-slate-500">Custom API keys and demo data reset.</p>
            </div>
          </div>

          <span className="text-xs text-amber-700 font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl whitespace-nowrap">
            {isAdvancedUnlocked ? 'Hide' : '🔓 Unlock'}
            {isAdvancedUnlocked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {isAdvancedUnlocked && (
          <div className="p-6 pt-0 space-y-6 border-t border-slate-200 bg-slate-50">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <span>
                These controls are for advanced setup. Changing API keys or clearing demo data affects this browser session.
              </span>
            </div>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
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
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={customConfig[key] || ''}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                {firebaseSavedMsg && <span className="text-xs text-violet-700 font-semibold">{firebaseSavedMsg}</span>}
              </div>
            </form>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                Demo dataset management
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    if (confirm('Clear the sample people and weigh-ins from local storage?')) {
                      onClearDemoData();
                    }
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 hover:border-red-300 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge demo data
                </button>

                <button
                  onClick={() => {
                    onRestoreSampleData();
                    alert('Sample dataset restored!');
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-violet-600" />
                  Restore sample data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onOpenAbout}
        className="w-full glass-panel p-4 rounded-3xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-violet-700 transition-colors"
      >
        <Info className="w-4 h-4" />
        About WeightTracker
      </button>
    </div>
  );
};
