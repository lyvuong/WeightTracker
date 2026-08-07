import React from 'react';
import { Info, Users, Scale, Cloud, ShieldAlert, Smartphone } from 'lucide-react';

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
      <Icon className="w-5 h-5 text-violet-400" />
      <h2 className="text-base font-bold text-white">{title}</h2>
    </div>
    <div className="text-xs text-slate-400 leading-relaxed space-y-2">{children}</div>
  </section>
);

export const AboutPage: React.FC<AboutPageProps> = ({ familyCode }) => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
      <img src="/favicon.svg" alt="WeightTracker" className="w-14 h-14 rounded-2xl ring-1 ring-white/20" />
      <div>
        <h1 className="text-2xl font-black text-white font-display">
          Weight<span className="text-violet-400">Tracker</span>
        </h1>
        <p className="text-xs text-slate-400">
          Daily household weigh-ins · v1.0 · Progressive Web App
        </p>
      </div>
    </div>

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
      <p className="text-slate-300">
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

    <footer className="text-center text-[11px] text-slate-600 pb-4">
      Built with React, Vite, Tailwind and Firebase · deployed on Cloudflare
    </footer>
  </div>
);
