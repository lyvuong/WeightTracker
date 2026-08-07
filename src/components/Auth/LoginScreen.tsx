import React, { useState } from 'react';
import { Cloud, Scale, Users, Lock } from 'lucide-react';

interface LoginScreenProps {
  onGoogleSignIn: () => Promise<any>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleSignIn }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 font-sans relative overflow-hidden">

      {/* Dynamic Background Glow Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel p-8 rounded-3xl shadow-xl border border-slate-200 space-y-8 relative z-10">

        {/* App Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-lg shadow-violet-500/10 mb-2">
            <img src="/favicon.svg" alt="WeightTracker Icon" className="w-10 h-10 object-contain" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-display">
            Weight<span className="text-violet-600">Tracker</span> <span className="text-xs uppercase font-extrabold text-violet-700 px-2 py-0.5 rounded bg-violet-50 border border-violet-200 align-middle">PWA</span>
          </h1>

          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
            Daily weigh-ins for the whole household — synced in real time
          </p>
        </div>

        {/* Notice Card */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Sign in to log weigh-ins, track BMI and goals, and share the household log across all your devices.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs font-semibold text-red-700 text-center">
            {errorMsg}
          </div>
        )}

        {/* Google Auth Sign In Action */}
        <div className="space-y-4 pt-2">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm py-3.5 px-5 rounded-2xl border border-slate-300 hover:border-violet-400 shadow-sm transition-all disabled:opacity-50 group"
          >
            {isSigningIn ? (
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
          <div className="p-2">
            <Scale className="w-4 h-4 text-violet-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-slate-500 block">Daily Weigh-Ins</span>
          </div>
          <div className="p-2">
            <Cloud className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-slate-500 block">Cloud Sync</span>
          </div>
          <div className="p-2">
            <Users className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-[10px] font-medium text-slate-500 block">Family Household</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>WeightTracker Progressive Web App • Cloudflare Pages Ready</p>
      </footer>

    </div>
  );
};
