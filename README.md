# ⚖️ WeightTracker — Household Weight & Body Trend PWA

A shared log of everyone's daily measured weight. Log a weigh-in in two taps, watch 7- and 30-day
trends, and track BMI and goal progress per person — on your phone, offline, and synced in real time
with the rest of the household.

WeightTracker is the fourth app in the family suite, alongside **CarTracker**, **HomeTracker** and
**ExpenseTracker**. It shares their Firebase project and their household codes, so joining
`VUONG-FAMILY` here is the same household you joined there.

---

## ✨ Highlights

- **Two-tap weigh-ins** — tap a person on the dashboard, type the number, done. A "weigh everyone"
  run walks the whole household in one pass.
- **People, not accounts** — profiles are independent of Google logins, so kids and anyone without
  their own account are tracked too.
- **lb or kg, your choice** — weights are stored in kilograms and displayed in your unit. Switching
  never rewrites or rounds your data, and two members can use different units.
- **BMI and goals** — BMI derived from each person's height, goal weight shown as a chart reference
  line and a dashboard progress bar.
- **Trends that mean something** — multi-person lines, a 7-point moving average that cuts through
  daily noise, weekly net change, and a body-fat chart when anyone records it.
- **Shared household sync** — real-time Firestore snapshots across every signed-in member's device.
- **Offline-capable PWA** — installable, service-worker cached, and fully usable with no connection.

---

## 🚀 Quick Start

### Prerequisites

Node v20+ (see `.nvmrc`).

### Installation

```bash
npm install
```

```bash
cp .env.example .env
```

Fill `.env` with the same six `VITE_FIREBASE_*` values the sibling apps use, then:

```bash
npm run dev
```

The app runs at **http://localhost:3002** (CarTracker is 3000, HomeTracker 3001, ExpenseTracker 3004).

Without a `.env` the app starts in **Local Demo Mode**: no login gate, sample data, everything stored
in `localStorage` on that device only.

---

## 🔥 Firebase Setup — shared backend with the sibling apps

WeightTracker uses the **same Firebase project** as CarTracker, HomeTracker and ExpenseTracker by
design. Pointing it at a different project would silently split the family's data in two.

Products used: **Authentication** (Google popup only) and **Cloud Firestore**. No Realtime Database,
no Functions, no Storage.

### No security-rule changes needed

The deployed rules already contain a generic subcollection match, so the two new subcollections are
covered the moment you deploy:

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if isAuthenticated() && request.auth.uid == userId;
}

match /households/{householdCode}/{subcollection}/{document=**} {
  allow read, write: if isHouseholdMember(householdCode);
}
```

After deploying, add the new domain under **Firebase Console → Authentication → Settings →
Authorized domains**, or `signInWithPopup` fails with `auth/unauthorized-domain`.

---

## 📦 Data Model

Every read and write resolves through `getStorageTarget(userId, familyCode)` in
[`src/services/firebase.ts`](src/services/firebase.ts): a stored household code switches the whole
app to the shared scope, otherwise it stays personal.

```
households/{CODE}/weight_members/{personId}      users/{uid}/weight_members/{personId}
households/{CODE}/weights/{entryId}              users/{uid}/weights/{entryId}
```

The collection is named `weight_members` rather than `members` because `households/{code}` is a
namespace shared by four apps — and `members` is already a *field* on `metadata/info`.

### `weight_members/{personId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | mirrors the document id |
| `name` | string | required |
| `color` / `emoji` | string | avatar; `color` keys into `PERSON_COLORS` |
| `heightCm` | number? | canonical cm, used for BMI |
| `goalWeightKg` | number? | canonical kg |
| `birthDate` | string? | `YYYY-MM-DD`, only used to suppress adult BMI bands under 20 |
| `linkedUid` | string? | set when seeded from a Google household member |
| `sortOrder` | number | in-memory ordering |
| `isArchived` | boolean? | hide without losing history |
| `createdAt` / `updatedAt` | string | ISO |
| `createdBy` / `lastEditedBy` | object? | `{ uid, displayName, email? }` |

**IDs:** people seeded from a Google account get the deterministic id `person-uid-{uid}`; manually
added people get `person-{timestamp}`. Determinism keeps the household prefill idempotent under
`setDoc(…, { merge: true })`, so two members opening the app at the same moment converge instead of
creating duplicate profiles for each other.

### `weights/{entryId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | mirrors the document id |
| `personId` | string | FK into `weight_members` |
| `date` | string | `YYYY-MM-DD`, **local** calendar date |
| `time` | string | `HH:MM` |
| `weightKg` | number | canonical, 4 dp |
| `bodyFatPct` | number? | optional |
| `notes` | string? | optional |
| `enteredUnit` / `enteredValue` | — | exactly what was typed, so an edit form never shows a converted-and-back number |
| `createdAt` | string | ISO |
| `loggedBy` / `lastEditedBy` | object? | audit trail |

**IDs:** `wt-{timestamp}`.

### Indexing

`weights` is queried with `orderBy('date', 'desc')` **only** — a single-field index Firestore creates
automatically. Never add a `where('personId', '==', …)` beside it; that needs a composite index.
Per-person filtering happens in memory, and sub-day ordering uses `` `${date}T${time}` `` string
comparison.

---

## ⚖️ Units, BMI and their limits

Weights are stored in **kilograms at 4 decimal places** and displayed in the active unit at 1 dp.
That storage grid is ~0.0001 kg (0.00022 lb) — roughly 200× finer than the 0.05 lb needed to resolve
a 1 dp pound display — so `fromKg(toKg(x, 'lb'), 'lb') === x` for every value a bathroom scale can
produce. Type 172.8 lb, see 172.8 lb, forever. Storing fewer decimals would make it come back as
172.9 unpredictably.

Switching units in Settings changes **display only** — it never triggers a write.

BMI comes from each person's profile height using the standard adult bands (under 18.5, 18.5–24.9,
25–29.9, 30+). Two caveats, both surfaced in the app:

- Adult BMI categories are not valid under age 20 — the correct measure there is CDC BMI-for-age
  percentiles, which this app does not carry. When a birth date implies age < 20 the number is shown
  without a category.
- Historical entries are recalculated from the person's *current* height. Correct for adults, not
  for a growing child.

---

## 👨‍👩‍👧‍👦 How shared household sync works

**Settings → Shared Household Sync →** enter the same code you use in the sibling apps → **Save & Join
Household**. Everything re-points at `households/{CODE}` immediately and every signed-in member sees
live updates.

Joining an existing code is self-service. *Creating* a new one is restricted to the administrator
email in the Firestore rules; anyone else gets a "ask your admin for an existing code" message.

Two things to be clear about:

- **There is no privacy between members.** Anyone in the household can see, edit and delete every
  person's weigh-ins, including their children's. `loggedBy` and `lastEditedBy` make changes
  traceable after the fact, but the delete confirmation is the only guard — there is no undo.
- **A household code is the only thing protecting this data.** Any authenticated Google user who
  guesses a code can join it. Health data deserves better than `HOME-1234` — if you create a new
  code, make it long and unguessable, e.g. `VUONG-7Q4X-2M9K`.

---

## 🛠️ Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3002 |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | Serve the production build locally |
| `npm run icons` | Regenerate the PWA PNG icons |

---

## 🎨 Icon

`public/favicon.svg` is the source of truth: a bathroom scale seen from above on a violet gradient
tile. [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs) rasterizes the same geometry — pure
Node, no native image dependencies — into `pwa-512x512.png`, `pwa-192x192.png`,
`apple-touch-icon.png` and `favicon-32x32.png`. Edit the shapes in `colorAt()`, run `npm run icons`,
and keep the SVG in sync by hand.

---

## ⚡ Deploying to Cloudflare

```bash
npm run build && npx wrangler deploy
```

`wrangler.toml` serves `./dist` with `not_found_handling = "single-page-application"`, which is what
makes SPA routing work — `public/_redirects` must stay comment-only. `public/_routes.json` sends all
paths to the asset handler.

The service worker (`public/sw.js`) only registers in production builds (`import.meta.env.PROD`); it
is deliberately skipped in `npm run dev`, where its stale-while-revalidate cache would serve old JS
modules instead of Vite's live code. Bump `CACHE_NAME` whenever the app shell changes.

Don't forget the **Authorized domains** step in the Firebase console after the first deploy.

---

## 🧰 Technology Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 (no config file — theme lives in `src/index.css`) ·
Firebase v12 (Auth + Firestore) · Recharts · lucide-react · oxlint · Cloudflare Pages/Workers.

No router, no state library, no data-fetching library: `src/App.tsx` owns the state and the Firebase
wiring, components stay presentational.
