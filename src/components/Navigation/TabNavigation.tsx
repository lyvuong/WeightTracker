import React from 'react';
import { LayoutDashboard, ListOrdered, Users, TrendingUp, Settings } from 'lucide-react';
import type { ActiveTab } from '../../types';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log', label: 'Log', icon: ListOrdered },
  { id: 'people', label: 'People', icon: Users },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => (
  <>
    {/* Desktop: a pill row directly under the header */}
    <nav className="hidden lg:block bg-slate-900/80 backdrop-blur-md border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>

    {/* Mobile: a fixed bottom bar, thumb-reachable */}
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)] no-print">
      <div className="grid grid-cols-5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                isActive ? 'text-violet-300' : 'text-slate-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : ''}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  </>
);
