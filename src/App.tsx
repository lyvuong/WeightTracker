import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './components/Navbar/Navbar';
import { TabNavigation } from './components/Navigation/TabNavigation';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { WeightHistory } from './components/Weights/WeightHistory';
import { QuickWeighInModal } from './components/Weights/QuickWeighInModal';
import { WeightFormModal } from './components/Weights/WeightFormModal';
import { PeopleManager } from './components/People/PeopleManager';
import { PersonModal } from './components/People/PersonModal';
import { WeightTrends } from './components/Trends/WeightTrends';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { AboutPage } from './components/About/AboutPage';
import { LoginScreen } from './components/Auth/LoginScreen';
import { PWAInstallPrompt } from './components/PWA/PWAInstallPrompt';

import type {
  ActiveTab,
  EnrichedWeightEntry,
  Person,
  UserAuditInfo,
  UserProfile,
  WeightDraft,
  WeightEntry,
  WeightUnit
} from './types';
import { nextColorKey, PERSON_EMOJIS } from './constants/people';
import { toKg } from './utils/units';
import {
  buildPersonStats,
  enrichEntries,
  householdStreak,
  sortEntriesDesc,
  sortPeople
} from './utils/weights';
import {
  DEMO_PREFIX,
  clearDemoData,
  exportDataAsJSON,
  exportWeightsAsCSV,
  getStoredFamilyCode,
  getStoredUnit,
  importJSONBackup,
  loadLocalPeople,
  loadLocalWeights,
  restoreSampleData,
  saveLocalPeople,
  saveLocalWeights,
  setStoredFamilyCode,
  setStoredUnit,
  todayLocal
} from './services/storage';
import {
  deleteFirestorePerson,
  deleteFirestoreWeight,
  initializeFirebaseService,
  isFirebaseConfigured,
  loginWithGoogle,
  logoutFirebase,
  saveFirestorePerson,
  saveFirestoreWeight,
  subscribeAuth,
  subscribeFirestorePeople,
  subscribeFirestoreWeights,
  subscribeHouseholdMembers,
  verifyOrCreateHousehold
} from './services/firebase';

/**
 * Turns the household roster into starter profiles. Deterministic
 * `person-uid-{uid}` ids keep this idempotent under setDoc(merge), so two
 * members opening the app at the same moment converge instead of creating
 * duplicate profiles for each other.
 */
const buildPeopleFromHousehold = (members: UserAuditInfo[], fallback: UserProfile): Person[] => {
  const now = new Date().toISOString();
  const roster = members.length > 0
    ? members
    : [{ uid: fallback.uid, displayName: fallback.displayName || 'Me', email: fallback.email || undefined }];

  return roster.map((m, i) => ({
    id: `person-uid-${m.uid}`,
    name: m.displayName || 'Household Member',
    color: nextColorKey(i),
    emoji: PERSON_EMOJIS[i % PERSON_EMOJIS.length],
    linkedUid: m.uid,
    sortOrder: i,
    createdAt: now,
    updatedAt: now
  }));
};

export const App: React.FC = () => {
  const [people, setPeople] = useState<Person[]>(() => loadLocalPeople());
  const [weights, setWeights] = useState<WeightEntry[]>(() => loadLocalWeights());
  const [unit, setUnitState] = useState<WeightUnit>(() => getStoredUnit());
  const [familyCode, setFamilyCodeState] = useState<string>(() => getStoredFamilyCode());
  const [householdMembers, setHouseholdMembers] = useState<UserAuditInfo[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activePersonId, setActivePersonId] = useState<string>('all');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [quickQueue, setQuickQueue] = useState<string[]>([]);
  const [quickIndex, setQuickIndex] = useState(0);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);

  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [personPrefill, setPersonPrefill] = useState<UserAuditInfo | null>(null);

  // Read inside the seeding branch without making it an effect dependency —
  // a roster change must not tear down and rebuild the snapshot listeners.
  const householdMembersRef = useRef<UserAuditInfo[]>([]);
  useEffect(() => {
    householdMembersRef.current = householdMembers;
  }, [householdMembers]);

  const today = todayLocal();

  const auditInfo: UserAuditInfo | undefined = user
    ? { uid: user.uid, displayName: user.displayName || 'Household Member', email: user.email || undefined }
    : undefined;

  // Online / offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase init, auth, and both collection subscriptions
  useEffect(() => {
    const initialized = initializeFirebaseService();
    const active = initialized && isFirebaseConfigured();
    setIsFirebaseActive(active);

    if (!active) {
      setIsAuthLoading(false);
      return;
    }

    let unsubPeople: (() => void) | null = null;
    let unsubWeights: (() => void) | null = null;

    const unsubscribeAuth = subscribeAuth((userProfile) => {
      setUser(userProfile);
      setIsAuthLoading(false);
      unsubPeople?.();
      unsubPeople = null;
      unsubWeights?.();
      unsubWeights = null;

      if (!userProfile) {
        setStoredFamilyCode('');
        setFamilyCodeState('');
        return;
      }

      // Cloud is the source of truth once signed in. The first empty snapshot
      // means "cloud is empty, push what's local up"; later empty snapshots
      // mean everything was deleted and local should follow.
      let hasSeededPeople = false;
      unsubPeople = subscribeFirestorePeople(userProfile.uid, familyCode, (cloudPeople) => {
        if (cloudPeople.length > 0) {
          hasSeededPeople = true;
          setPeople(cloudPeople);
          saveLocalPeople(cloudPeople);
          return;
        }
        if (hasSeededPeople) {
          setPeople([]);
          saveLocalPeople([]);
          return;
        }
        hasSeededPeople = true;
        const local = loadLocalPeople().filter(p => !p.id.startsWith(DEMO_PREFIX));
        const seed = local.length > 0
          ? local
          : buildPeopleFromHousehold(householdMembersRef.current, userProfile);
        setPeople(seed);
        saveLocalPeople(seed);
        seed.forEach(p => saveFirestorePerson(userProfile.uid, p, familyCode));
      });

      let hasSeededWeights = false;
      unsubWeights = subscribeFirestoreWeights(userProfile.uid, familyCode, (cloudWeights) => {
        if (cloudWeights.length > 0) {
          hasSeededWeights = true;
          setWeights(cloudWeights);
          saveLocalWeights(cloudWeights);
          return;
        }
        if (hasSeededWeights) {
          setWeights([]);
          saveLocalWeights([]);
          return;
        }
        hasSeededWeights = true;
        const local = loadLocalWeights().filter(w => !w.id.startsWith(DEMO_PREFIX));
        setWeights(local);
        saveLocalWeights(local);
        local.forEach(w => saveFirestoreWeight(userProfile.uid, w, familyCode));
      });
    });

    return () => {
      unsubPeople?.();
      unsubWeights?.();
      unsubscribeAuth();
    };
  }, [familyCode]);

  // Household roster, used for the "no profile yet" prompt and the seed
  useEffect(() => {
    if (!isFirebaseActive || !user || !familyCode) {
      setHouseholdMembers([]);
      return;
    }
    return subscribeHouseholdMembers(familyCode, setHouseholdMembers);
  }, [isFirebaseActive, user, familyCode]);

  // Local mirrors
  useEffect(() => {
    saveLocalPeople(people);
  }, [people]);

  useEffect(() => {
    saveLocalWeights(weights);
  }, [weights]);

  // ==========================================
  // Derived views — all keyed on `unit`, so flipping lb/kg re-renders
  // everything without a single write.
  // ==========================================

  const sortedPeople = useMemo(() => sortPeople(people), [people]);

  const enrichedEntries: EnrichedWeightEntry[] = useMemo(
    () => enrichEntries(weights, sortedPeople, unit),
    [weights, sortedPeople, unit]
  );

  const personStats = useMemo(
    () => sortedPeople.filter(p => !p.isArchived).map(p => buildPersonStats(p, weights, today)),
    [sortedPeople, weights, today]
  );

  const streak = useMemo(
    () => householdStreak(sortedPeople, weights, today),
    [sortedPeople, weights, today]
  );

  const quickPersonId = quickQueue[quickIndex] || '';
  const quickPerson = sortedPeople.find(p => p.id === quickPersonId) || null;

  const quickExistingEntry = useMemo(() => {
    if (!quickPersonId) return null;
    const todays = weights.filter(w => w.personId === quickPersonId && w.date === today);
    return todays.length ? sortEntriesDesc(todays)[0] : null;
  }, [quickPersonId, weights, today]);

  const quickLastWeightKg = useMemo(() => {
    if (!quickPersonId) return null;
    const stat = personStats.find(s => s.person.id === quickPersonId);
    return stat?.latest?.weightKg ?? null;
  }, [quickPersonId, personStats]);

  // ==========================================
  // Handlers
  // ==========================================

  const handleSetUnit = (next: WeightUnit) => {
    setStoredUnit(next);
    setUnitState(next);
  };

  const handleSetFamilyCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setStoredFamilyCode('');
      setFamilyCodeState('');
      return { success: true, message: 'Back to your personal log.' };
    }

    if (user && isFirebaseActive) {
      const res = await verifyOrCreateHousehold(cleanCode, user);
      if (!res.success) {
        setStoredFamilyCode('');
        setFamilyCodeState('');
        return { success: false, message: res.message };
      }
    }

    setStoredFamilyCode(cleanCode);
    setFamilyCodeState(cleanCode);
    return { success: true, message: `✅ Sharing with household ${cleanCode}.` };
  };

  const openQuickWeighIn = (personId: string) => {
    setQuickQueue([personId]);
    setQuickIndex(0);
    setIsQuickOpen(true);
  };

  const openWeighEveryone = () => {
    const pending = personStats.filter(s => !s.loggedToday).map(s => s.person.id);
    const queue = pending.length > 0 ? pending : personStats.map(s => s.person.id);
    if (queue.length === 0) return;
    setQuickQueue(queue);
    setQuickIndex(0);
    setIsQuickOpen(true);
  };

  const openNavbarWeighIn = () => {
    if (personStats.length === 0) return;
    const firstPending = personStats.find(s => !s.loggedToday);
    openQuickWeighIn((firstPending || personStats[0]).person.id);
  };

  const persistWeight = (draft: WeightDraft): WeightEntry => {
    const id = draft.id || `wt-${Date.now()}`;
    const existing = weights.find(w => w.id === id);
    const entry: WeightEntry = {
      id,
      personId: draft.personId,
      date: draft.date,
      time: draft.time,
      weightKg: toKg(draft.value, draft.unit),
      bodyFatPct: draft.bodyFatPct,
      notes: draft.notes,
      enteredUnit: draft.unit,
      enteredValue: draft.value,
      createdAt: existing?.createdAt || new Date().toISOString(),
      loggedBy: existing?.loggedBy || auditInfo,
      lastEditedBy: existing ? auditInfo : undefined
    };

    setWeights(prev => prev.some(w => w.id === id)
      ? prev.map(w => (w.id === id ? entry : w))
      : [entry, ...prev]);

    if (user && isFirebaseActive) {
      saveFirestoreWeight(user.uid, entry, familyCode);
    }
    return entry;
  };

  const handleQuickSave = (draft: WeightDraft) => {
    persistWeight(draft);
    if (quickIndex < quickQueue.length - 1) {
      setQuickIndex(quickIndex + 1);
    } else {
      setIsQuickOpen(false);
      setQuickQueue([]);
      setQuickIndex(0);
    }
  };

  const handleFormSave = (draft: WeightDraft) => {
    persistWeight(draft);
    setIsEntryModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteWeight = (id: string) => {
    if (!confirm('Delete this weigh-in?')) return;
    setWeights(prev => prev.filter(w => w.id !== id));
    setIsEntryModalOpen(false);
    setEditingEntry(null);
    if (user && isFirebaseActive) {
      deleteFirestoreWeight(user.uid, id, familyCode);
    }
  };

  const handleSavePerson = (person: Person) => {
    const stamped: Person = {
      ...person,
      createdBy: person.createdBy || auditInfo,
      lastEditedBy: auditInfo
    };
    setPeople(prev => prev.some(p => p.id === stamped.id)
      ? prev.map(p => (p.id === stamped.id ? stamped : p))
      : [...prev, stamped]);

    setIsPersonModalOpen(false);
    setEditingPerson(null);
    setPersonPrefill(null);

    if (user && isFirebaseActive) {
      saveFirestorePerson(user.uid, stamped, familyCode);
    }
  };

  const handleDeletePerson = (id: string) => {
    const person = people.find(p => p.id === id);
    const owned = weights.filter(w => w.personId === id);
    const label = person?.name || 'this person';
    if (!confirm(`Delete ${label} and all ${owned.length} of their weigh-ins? This cannot be undone.`)) return;

    setPeople(prev => prev.filter(p => p.id !== id));
    setWeights(prev => prev.filter(w => w.personId !== id));
    setIsPersonModalOpen(false);
    setEditingPerson(null);
    if (activePersonId === id) setActivePersonId('all');

    if (user && isFirebaseActive) {
      owned.forEach(w => deleteFirestoreWeight(user.uid, w.id, familyCode));
      deleteFirestorePerson(user.uid, id, familyCode);
    }
  };

  const handleImportJSON = (json: string) => {
    const imported = importJSONBackup(json);
    setPeople(imported.people);
    setWeights(imported.weights);
    if (user && isFirebaseActive) {
      imported.people.forEach(p => saveFirestorePerson(user.uid, p, familyCode));
      imported.weights.forEach(w => saveFirestoreWeight(user.uid, w, familyCode));
    }
  };

  const handleRefreshData = () => {
    setPeople(loadLocalPeople());
    setWeights(loadLocalWeights());
  };

  const handleClearDemoData = () => {
    clearDemoData();
    handleRefreshData();
  };

  const handleRestoreSampleData = () => {
    restoreSampleData();
    handleRefreshData();
  };

  const handleSignOut = async () => {
    await logoutFirebase();
    setUser(null);
    setPeople([]);
    setWeights([]);
  };

  // PWA manifest shortcuts (/?action=weigh, /?action=log). Runs after the
  // first render so personStats is populated when `weigh` fires.
  const shortcutHandled = useRef(false);
  useEffect(() => {
    if (shortcutHandled.current) return;
    const action = new URLSearchParams(window.location.search).get('action');
    if (!action) {
      shortcutHandled.current = true;
      return;
    }
    if (action === 'log') {
      setActiveTab('log');
      shortcutHandled.current = true;
    }
    if (action === 'weigh' && personStats.length > 0) {
      openNavbarWeighIn();
      shortcutHandled.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personStats.length]);

  // ==========================================
  // Render
  // ==========================================

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <span>Authenticating WeightTracker session…</span>
        </div>
      </div>
    );
  }

  if (isFirebaseActive && !user) {
    return <LoginScreen onGoogleSignIn={loginWithGoogle} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-14 lg:pb-0">
      <Navbar
        people={sortedPeople}
        activePersonId={activePersonId}
        onSelectPerson={setActivePersonId}
        onOpenWeighIn={openNavbarWeighIn}
        onOpenAddPerson={() => {
          setEditingPerson(null);
          setPersonPrefill(null);
          setIsPersonModalOpen(true);
        }}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenAbout={() => setActiveTab('about')}
        user={user}
        isOnline={isOnline}
        isFirebaseActive={isFirebaseActive}
      />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-5 lg:px-8 py-2 sm:py-3">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            people={sortedPeople}
            stats={personStats}
            entries={enrichedEntries}
            unit={unit}
            streak={streak}
            today={today}
            onWeighIn={openQuickWeighIn}
            onWeighEveryone={openWeighEveryone}
            onAddPerson={() => {
              setEditingPerson(null);
              setPersonPrefill(null);
              setIsPersonModalOpen(true);
            }}
          />
        )}

        {activeTab === 'log' && (
          <WeightHistory
            entries={enrichedEntries}
            people={sortedPeople}
            unit={unit}
            today={today}
            activePersonId={activePersonId}
            onSelectPerson={setActivePersonId}
            onEditEntry={(entry) => {
              setEditingEntry(entry);
              setIsEntryModalOpen(true);
            }}
            onAddEntry={() => {
              setEditingEntry(null);
              setIsEntryModalOpen(true);
            }}
            onExportCSV={exportWeightsAsCSV}
          />
        )}

        {activeTab === 'people' && (
          <PeopleManager
            people={sortedPeople}
            stats={personStats}
            householdMembers={householdMembers}
            familyCode={familyCode}
            unit={unit}
            onAddPerson={() => {
              setEditingPerson(null);
              setPersonPrefill(null);
              setIsPersonModalOpen(true);
            }}
            onEditPerson={(person) => {
              setEditingPerson(person);
              setPersonPrefill(null);
              setIsPersonModalOpen(true);
            }}
            onAddFromMember={(member) => {
              setEditingPerson(null);
              setPersonPrefill(member);
              setIsPersonModalOpen(true);
            }}
          />
        )}

        {activeTab === 'trends' && (
          <WeightTrends
            entries={enrichedEntries}
            people={sortedPeople.filter(p => !p.isArchived)}
            unit={unit}
            today={today}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            user={user}
            isFirebaseActive={isFirebaseActive}
            familyCode={familyCode}
            members={householdMembers}
            unit={unit}
            onSetUnit={handleSetUnit}
            onSetFamilyCode={handleSetFamilyCode}
            onSignOut={handleSignOut}
            onExportCSV={() => exportWeightsAsCSV(enrichedEntries)}
            onExportJSON={() => exportDataAsJSON(people, weights)}
            onImportJSON={handleImportJSON}
            onRefreshData={handleRefreshData}
            onClearDemoData={handleClearDemoData}
            onRestoreSampleData={handleRestoreSampleData}
            onOpenAbout={() => setActiveTab('about')}
          />
        )}

        {activeTab === 'about' && <AboutPage familyCode={familyCode} />}
      </main>

      <QuickWeighInModal
        isOpen={isQuickOpen}
        person={quickPerson}
        unit={unit}
        existingEntry={quickExistingEntry}
        lastWeightKg={quickLastWeightKg}
        queue={quickQueue.length > 1 ? { index: quickIndex, total: quickQueue.length } : null}
        onSave={handleQuickSave}
        onClose={() => {
          setIsQuickOpen(false);
          setQuickQueue([]);
          setQuickIndex(0);
        }}
      />

      <WeightFormModal
        isOpen={isEntryModalOpen}
        people={sortedPeople}
        unit={unit}
        initialEntry={editingEntry}
        defaultPersonId={activePersonId !== 'all' ? activePersonId : undefined}
        onSave={handleFormSave}
        onDelete={handleDeleteWeight}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEditingEntry(null);
        }}
      />

      <PersonModal
        isOpen={isPersonModalOpen}
        unit={unit}
        initialPerson={editingPerson}
        peopleCount={people.length}
        prefillName={personPrefill?.displayName}
        prefillUid={personPrefill?.uid}
        householdMembers={householdMembers}
        onSave={handleSavePerson}
        onDelete={handleDeletePerson}
        onClose={() => {
          setIsPersonModalOpen(false);
          setEditingPerson(null);
          setPersonPrefill(null);
        }}
      />

      <PWAInstallPrompt />

      <footer className="hidden lg:block border-t border-slate-200 bg-white/60 py-5 text-center text-xs text-slate-400 no-print">
        <p>WeightTracker · shared household weigh-ins · Cloudflare Pages ready · offline capable</p>
      </footer>
    </div>
  );
};

export default App;
