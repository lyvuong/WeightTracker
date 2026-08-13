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
    <nav className="hidden lg:block bg-white/80 backdrop-blur-md border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1.5 py-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>

    {/* Mobile: a fixed bottom bar, thumb-reachable */}
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] no-print">
      <div className="grid grid-cols-5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-extrabold transition-colors ${
                isActive ? 'text-violet-700' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600' : ''}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  </>
);
