import React from 'react';
import {
  Info,
  Users,
  Scale,
  Cloud,
  ShieldAlert,
  Smartphone,
  Code2,
  Cpu,
  Sparkles,
  GitBranch,
  Globe,
  Zap,
  CheckCircle2,
  Target,
  Database,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface AboutPageProps {
  familyCode: string;
}

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  children
}) => (
  <section className="glass-panel p-6 rounded-3xl space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-violet-600" />
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
    </div>
    <div className="text-xs text-slate-500 leading-relaxed space-y-2">{children}</div>
  </section>
);

const TECH_STACK = [
  { name: 'React 19', category: 'UI Framework', desc: 'Concurrent rendering & modern hooks' },
  { name: 'Vite 8', category: 'Build Tooling', desc: 'Lightning-fast ESM bundler & HMR' },
  { name: 'TypeScript', category: 'Language', desc: 'Strict end-to-end type safety' },
  { name: 'Tailwind CSS 4', category: 'Styling Engine', desc: 'Config-free light theme system' },
  { name: 'Cloudflare Pages', category: 'Hosting Platform', desc: 'Global edge network deployment' },
  { name: 'Firebase Cloud', category: 'Sync Engine', desc: 'Firestore auth & real-time sync' }
];

const KEY_FEATURES = [
  {
    icon: Zap,
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    title: 'Two-Tap Weigh-Ins',
    desc: 'Tap a person on the dashboard, type the number, done. A "weigh everyone" run walks the whole household in one pass.'
  },
  {
    icon: Target,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    title: 'BMI & Goal Tracking',
    desc: 'BMI derived from each profile\'s height, plus a goal weight shown as a chart reference line and a dashboard progress bar.'
  },
  {
    icon: TrendingUp,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    title: 'Trends That Mean Something',
    desc: 'Multi-person lines, a 7-point moving average that cuts through daily noise, weekly net change, and a body-fat chart.'
  },
  {
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    title: 'Shared Household Sync',
    desc: 'Real-time Firestore snapshots across every signed-in member\'s device, using the same Household Sync Codes as the sibling apps.'
  },
  {
    icon: Database,
    color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200',
    title: '100% Data Portability',
    desc: 'Export the full weight log as CSV in both lb and kg, and back up or restore the complete app state as JSON at any time.'
  },
  {
    icon: Smartphone,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    title: 'Offline-First PWA',
    desc: 'Fully functional without a connection using a cached app shell and local storage, with automatic cloud sync on reconnect.'
  }
];

export const AboutPage: React.FC<AboutPageProps> = ({ familyCode }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero Brand Banner */}
      <div className="relative overflow-hidden glass-panel p-8 sm:p-10 rounded-3xl border border-violet-200 shadow-lg shadow-violet-500/5 text-center sm:text-left">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-sm font-mono">
                Official Release
              </span>
              <span className="text-xs font-mono font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
                v1.0.0
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight flex items-center justify-center sm:justify-start gap-3">
              <Scale className="w-9 h-9 text-violet-600" />
              <span>WeightTracker PWA</span>
            </h1>

            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              A Progressive Web App for daily household weigh-ins, BMI and goal tracking, trend charts, and
              real-time shared sync — for everyone in the household, not just Google accounts.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] text-slate-500 uppercase font-extrabold tracking-wider block">Environment</span>
              <span className="text-sm font-bold text-emerald-600 font-mono flex items-center gap-1.5 justify-center mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Cloudflare Edge
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Profile Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
            <Code2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900 font-display">Developer Information</h2>
        </div>

        <div className="inset-well p-6 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-500 p-1 shadow-md shadow-violet-500/20">
              <img
                src="/avatar.png"
                alt="Ly Vuong"
                className="w-full h-full rounded-[12px] object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white" title="Active Developer">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Ly Vuong</h3>
                <p className="text-xs text-violet-600 font-semibold">Creator & Lead Engineer</p>
              </div>

              <a
                href="https://github.com/lyvuong/WeightTracker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 shadow-sm transition-all self-center sm:self-auto"
              >
                <GitBranch className="w-4 h-4 text-violet-600" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Engineered with a focus on privacy, rapid performance, and an intuitive user experience. Built as
              part of a shared household suite alongside CarTracker, HomeTracker, and ExpenseTracker, using
              modern web technologies to deliver a native app-like experience across desktop and mobile.
            </p>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl border border-violet-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900 font-display">Key Capabilities & Features</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KEY_FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="glass-card p-5 rounded-2xl hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${feature.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{feature.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture & Tech Stack Grid */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-fuchsia-50 text-fuchsia-600 rounded-xl border border-fuchsia-200">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900 font-display">Technology Stack</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TECH_STACK.map((tech, idx) => (
            <div key={idx} className="inset-well p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{tech.name}</span>
                <span className="text-[10px] uppercase font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                  {tech.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* App-specific notes */}
      <Section icon={Info} title="What this app is">
        <p>
          A shared log of everyone's daily measured weight. Log a weigh-in in two taps from the dashboard,
          see 7- and 30-day trends, and track BMI and goal progress per person.
        </p>
        <p>
          Everyone in a household is a <strong>profile</strong>, not an account — kids and anyone without their
          own Google login still get tracked.
        </p>
      </Section>

      <Section icon={Users} title="Who can see your weights">
        <p className="text-slate-600">
          There is deliberately no privacy between members. Anyone signed in to household{' '}
          <strong className="font-mono">{familyCode || '(none — personal mode)'}</strong> can see, edit and delete
          every person's weigh-ins, including their own children's.
        </p>
        <p>
          Every entry records who logged it and who last edited it, so unexpected changes are traceable — but
          there is no undo beyond the delete confirmation.
        </p>
      </Section>

      <Section icon={ShieldAlert} title="A note on household codes">
        <p>
          A household code is the only thing standing between a signed-in Google user and this data. Short,
          guessable codes like <span className="font-mono">HOME-1234</span> are a real risk for health data —
          prefer something long and unguessable such as <span className="font-mono">VUONG-7Q4X-2M9K</span>.
        </p>
        <p>Creating brand-new codes is restricted to the project administrator; joining an existing one is not.</p>
      </Section>

      <Section icon={Scale} title="Units, BMI and their limits">
        <p>
          Weights are stored in kilograms and displayed in your chosen unit, so switching between lb and kg never
          rewrites or rounds your data.
        </p>
        <p>
          BMI is computed from the height on each person's profile. It is a rough population statistic, not a
          diagnosis — it says nothing about muscle mass or body composition, and the adult categories are not
          valid under age 20, where BMI-for-age percentiles are the correct measure. Historical entries are
          recalculated using the person's <em>current</em> height, which is accurate for adults but not for a
          growing child.
        </p>
      </Section>

      <Section icon={Cloud} title="Sync & the sibling apps">
        <p>
          WeightTracker shares one Firebase project and one set of household codes with CarTracker, HomeTracker
          and ExpenseTracker. Joining <span className="font-mono">VUONG-FAMILY</span> here is the same household
          you joined there.
        </p>
        <p>
          Weigh-ins are stored under <span className="font-mono">households/&#123;code&#125;/weights</span> and
          never touch the shared expense ledger those apps use.
        </p>
      </Section>

      <Section icon={Smartphone} title="Offline & install">
        <p>
          A service worker caches the app shell, so it opens and reads your local log with no connection. Install
          it from your browser's menu ("Add to Home Screen") for a full-screen, app-like weigh-in.
        </p>
        <p>Without Firebase credentials the app runs entirely in local demo mode on this device.</p>
      </Section>

      {/* Footer Info & Copyright */}
      <div className="glass-panel p-6 rounded-2xl text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
          <Globe className="w-4 h-4 text-violet-600" />
          <span>WeightTracker Progressive Web Application</span>
        </div>
        <p className="text-xs text-slate-400">
          © {currentYear} Ly Vuong. All rights reserved. Open source under MIT license.
        </p>
      </div>

    </div>
  );
};

export default AboutPage;
