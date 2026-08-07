// One-time backfill of a legacy DailyWeights.csv export into this app's
// Firestore schema (households/{code}/weight_members + weights). Never
// shipped in the app — runs out-of-band with the Firebase Admin SDK, which
// bypasses the app's normal security rules on purpose (a signed-in user
// couldn't legally bulk-write thousands of docs that fast under
// isHouseholdMember anyway).
//
// Usage:
//   node scripts/migrate-daily-weights.mjs --dry-run
//   node scripts/migrate-daily-weights.mjs --apply [--yes] [--no-auto-rollback]
//   node scripts/migrate-daily-weights.mjs --rollback --manifest <path> [--yes]
//
// Credentials: pass --key <path-to-service-account.json> or set
// GOOGLE_APPLICATION_CREDENTIALS. Generate the key in the Firebase Console:
// Project Settings -> Service Accounts -> Generate new private key. This
// script never sees or requests the key value itself — only a file path.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_HOUSEHOLD = '3701';
const DEFAULT_CSV = path.join(SCRIPTS_DIR, 'DailyWeights.csv');
const BATCH_SIZE = 450; // headroom under Firestore's 500-op batch limit

const TARGET_NAMES = {
  '1': 'Ly Vuong',
  '2': 'Huan Vuong',
  '3': 'Huong Pham'
};

// New person profiles (if needed) get these in userId order — same palette
// order the app's own nextColorKey() would assign.
const PALETTE = [
  { color: 'violet', emoji: '🙂' },
  { color: 'cyan', emoji: '🐻' },
  { color: 'amber', emoji: '😎' }
];

// Keep in sync with src/utils/units.ts — duplicated here because this is a
// standalone Node script with no TypeScript build step.
const KG_PER_LB = 0.45359237;
const round = (n, dp) => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};
const toKg = (lb) => round(lb * KG_PER_LB, 4);

class MigrationError extends Error {}

// ==========================================
// CLI args
// ==========================================

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

// ==========================================
// CSV parsing (RFC4180-aware: handles commas and newlines inside quotes)
// ==========================================

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function loadAndValidateCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new MigrationError(`CSV file not found: ${csvPath}`);
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const table = parseCSV(raw);
  if (table.length === 0) throw new MigrationError(`CSV file is empty: ${csvPath}`);

  const header = table[0];
  const idx = {
    id: header.indexOf('DailyWeightId'),
    userId: header.indexOf('DailyWeightUserId'),
    notes: header.indexOf('Notes'),
    observedAt: header.indexOf('ObservedAt'),
    weight: header.indexOf('Weight')
  };
  for (const [key, col] of Object.entries(idx)) {
    if (col === -1) throw new MigrationError(`CSV is missing expected column for "${key}".`);
  }

  const dataRows = table.slice(1).filter(r => r.length > 1 || (r[0] && r[0].trim() !== ''));
  const errors = [];
  const seenIds = new Set();
  const rows = [];

  dataRows.forEach((cols, i) => {
    const lineNo = i + 2; // 1-indexed, + header row
    if (cols.length !== header.length) {
      errors.push(`Line ${lineNo}: expected ${header.length} columns, got ${cols.length}`);
      return;
    }
    const id = cols[idx.id].trim();
    const userId = cols[idx.userId].trim();
    const notes = cols[idx.notes];
    const observedAt = cols[idx.observedAt].trim();
    const weightRaw = cols[idx.weight].trim();
    const weight = parseFloat(weightRaw);

    if (!/^\d+$/.test(id)) { errors.push(`Line ${lineNo}: DailyWeightId "${id}" is not a positive integer`); return; }
    if (seenIds.has(id)) { errors.push(`Line ${lineNo}: duplicate DailyWeightId "${id}"`); return; }
    seenIds.add(id);
    if (!Object.prototype.hasOwnProperty.call(TARGET_NAMES, userId)) {
      errors.push(`Line ${lineNo}: DailyWeightUserId "${userId}" is not one of ${Object.keys(TARGET_NAMES).join(', ')}`);
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      errors.push(`Line ${lineNo}: Weight "${weightRaw}" is not a positive number`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(observedAt)) {
      errors.push(`Line ${lineNo}: ObservedAt "${observedAt}" doesn't match "YYYY-MM-DD HH:MM:SS"`);
      return;
    }

    rows.push({ id, userId, notes, observedAt, weight });
  });

  if (errors.length > 0) {
    throw new MigrationError(
      `CSV validation failed (${errors.length} problem row(s)) — nothing was written:\n` +
      errors.map(e => `  - ${e}`).join('\n')
    );
  }

  return rows;
}

// ==========================================
// Outlier detection (reporting only — never affects what gets written)
// ==========================================

function findOutliers(rows) {
  const byUser = { '1': [], '2': [], '3': [] };
  rows.forEach(r => byUser[r.userId]?.push(r));

  const flagged = [];
  for (const userId of Object.keys(TARGET_NAMES)) {
    const weights = byUser[userId].map(r => r.weight).slice().sort((a, b) => a - b);
    if (weights.length === 0) continue;
    const median = weights[Math.floor(weights.length / 2)];
    byUser[userId].forEach(r => {
      if (r.weight > median * 2 || r.weight < median * 0.4) {
        flagged.push({ id: r.id, name: TARGET_NAMES[userId], date: r.observedAt.slice(0, 10), weight: r.weight, median });
      }
    });
  }
  flagged.sort((a, b) => Number(a.id) - Number(b.id));
  return flagged;
}

// ==========================================
// Person resolution: reuse-by-name or create
// ==========================================

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function resolvePeople(db, householdCode) {
  const peopleCol = db.collection('households').doc(householdCode).collection('weight_members');
  const snap = await peopleCol.get();
  const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const maxSortOrder = existing.reduce(
    (max, p) => Math.max(max, typeof p.sortOrder === 'number' ? p.sortOrder : -1),
    -1
  );

  const mapping = {};
  const toCreate = [];
  const reused = [];
  let nextSort = maxSortOrder + 1;
  let paletteIdx = 0;

  for (const [userId, name] of Object.entries(TARGET_NAMES)) {
    const matches = existing.filter(p => (p.name || '').trim().toLowerCase() === name.toLowerCase());
    if (matches.length > 1) {
      throw new MigrationError(
        `Ambiguous match: ${matches.length} people named "${name}" already exist in ` +
        `households/${householdCode}/weight_members (ids: ${matches.map(m => m.id).join(', ')}). ` +
        `Resolve manually before running this script.`
      );
    }
    if (matches.length === 1) {
      mapping[userId] = matches[0].id;
      reused.push({ userId, name, id: matches[0].id });
      continue;
    }

    const id = `person-migrate-${slugify(name)}`;
    const palette = PALETTE[paletteIdx % PALETTE.length];
    paletteIdx++;
    const now = new Date().toISOString();
    const person = {
      id,
      name,
      color: palette.color,
      emoji: palette.emoji,
      sortOrder: nextSort++,
      createdAt: now,
      updatedAt: now
    };
    toCreate.push(person);
    mapping[userId] = id;
  }

  return { mapping, toCreate, reused };
}

// ==========================================
// CSV row -> WeightEntry
// ==========================================

// Informational only — every UI feature (grouping, sorting, streaks, trend
// charts) reads `date`/`time` directly from the CSV substrings below, not
// from this value, so treating ObservedAt as UTC here can't skew anything
// user-visible. Avoids depending on the migration machine's own timezone.
function toIsoBestEffort(observedAt) {
  const [datePart, timePart] = observedAt.split(' ');
  const hms = timePart.split('.')[0];
  return `${datePart}T${hms}.000Z`;
}

function buildWeightEntries(rows, personMapping) {
  return rows.map((r) => {
    const [datePart, timePart] = r.observedAt.split(' ');
    const entry = {
      id: `csv-${r.id}`,
      personId: personMapping[r.userId],
      date: datePart,
      time: timePart.slice(0, 5),
      weightKg: toKg(r.weight),
      notes: r.notes && r.notes.trim() ? r.notes.trim() : undefined,
      enteredUnit: 'lb',
      enteredValue: r.weight,
      createdAt: toIsoBestEffort(r.observedAt),
      loggedBy: { uid: 'legacy-import', displayName: TARGET_NAMES[r.userId] }
    };
    // Firestore rejects `undefined` — same strip-before-write idiom the app
    // itself uses in src/services/firebase.ts.
    return JSON.parse(JSON.stringify(entry));
  });
}

// ==========================================
// Household precondition
// ==========================================

async function assertHouseholdExists(db, code) {
  const snap = await db.collection('households').doc(code).collection('metadata').doc('info').get();
  if (!snap.exists) {
    throw new MigrationError(
      `households/${code}/metadata/info does not exist. This script never auto-creates a ` +
      `household — join or create "${code}" once from the app first, or pass the correct --household code.`
    );
  }
}

// ==========================================
// Manifest + rollback
// ==========================================

function manifestPathFor(runId) {
  return path.join(SCRIPTS_DIR, `.migration-manifest-${runId}.json`);
}

function writeManifestSync(filePath, manifest) {
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
}

function readManifestSync(filePath) {
  if (!fs.existsSync(filePath)) throw new MigrationError(`Manifest not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function verifyDeleted(db, weightsCol, ids) {
  const stillExists = [];
  for (const group of chunk(ids, 300)) {
    const refs = group.map(id => weightsCol.doc(id));
    if (refs.length === 0) continue;
    const snaps = await db.getAll(...refs);
    snaps.forEach(s => { if (s.exists) stillExists.push(s.id); });
  }
  return stillExists;
}

async function performRollback({ db, manifest, manifestPath, assumeYes }) {
  if (manifest.rolledBackAt) {
    console.log(`Manifest ${manifestPath} was already rolled back at ${manifest.rolledBackAt}. Nothing to do.`);
    return;
  }

  console.log('');
  console.log(`About to delete ${manifest.weightsWritten.length} weight doc(s) and ` +
    `${manifest.peopleCreated.length} person doc(s) from households/${manifest.householdCode}.`);

  if (!assumeYes) {
    const ok = await confirm('Continue with rollback? [y/N] ');
    if (!ok) { console.log('Rollback cancelled.'); return; }
  }

  const peopleCol = db.collection('households').doc(manifest.householdCode).collection('weight_members');
  const weightsCol = db.collection('households').doc(manifest.householdCode).collection('weights');

  for (const ids of chunk(manifest.weightsWritten, BATCH_SIZE)) {
    const batch = db.batch();
    ids.forEach(id => batch.delete(weightsCol.doc(id)));
    await batch.commit();
    console.log(`  deleted ${ids.length} weight doc(s)`);
  }
  for (const id of manifest.peopleCreated) {
    await peopleCol.doc(id).delete();
    console.log(`  deleted person doc ${id}`);
  }

  const stillExists = await verifyDeleted(db, weightsCol, manifest.weightsWritten);
  if (stillExists.length > 0) {
    throw new MigrationError(
      `Rollback verification failed: ${stillExists.length} doc(s) still exist ` +
      `(${stillExists.slice(0, 10).join(', ')}${stillExists.length > 10 ? ', ...' : ''}). ` +
      `Re-run --rollback with the same manifest to retry.`
    );
  }

  manifest.rolledBackAt = new Date().toISOString();
  writeManifestSync(manifestPath, manifest);
  console.log(`Rollback complete and verified. Manifest marked rolled back: ${manifestPath}`);
}

// ==========================================
// Summary printer (shared by dry-run and apply)
// ==========================================

function printSummary({ rows, flagged, reused, toCreate, householdCode }) {
  const counts = { '1': 0, '2': 0, '3': 0 };
  rows.forEach(r => counts[r.userId]++);
  const dates = rows.map(r => r.observedAt.slice(0, 10)).sort();

  console.log('');
  console.log('=== Migration summary ===');
  console.log(`Household:  households/${householdCode}`);
  console.log(`Total rows: ${rows.length}`);
  for (const [uid, name] of Object.entries(TARGET_NAMES)) {
    console.log(`  ${name.padEnd(14)} (userId ${uid}): ${counts[uid]} rows`);
  }
  console.log(`Date range: ${dates[0]} -> ${dates[dates.length - 1]}`);

  console.log('');
  console.log('Person profiles:');
  reused.forEach(p => console.log(`  reuse existing   ${p.name.padEnd(14)} -> ${p.id}`));
  toCreate.forEach(p => console.log(`  CREATE NEW       ${p.name.padEnd(14)} -> ${p.id}`));

  console.log('');
  console.log(`Flagged outlier rows (${flagged.length}) — imported as-is, review these afterward:`);
  flagged.forEach(f =>
    console.log(`  csv-${f.id}  ${f.name.padEnd(12)} ${f.date}  weight=${f.weight}  (their median ~${f.median})`)
  );
  console.log('');
}

// ==========================================
// Modes
// ==========================================

async function runDryRun({ db, householdCode, csvPath }) {
  const rows = loadAndValidateCsv(csvPath);
  await assertHouseholdExists(db, householdCode);
  const { toCreate, reused } = await resolvePeople(db, householdCode);
  const flagged = findOutliers(rows);
  printSummary({ rows, flagged, reused, toCreate, householdCode });
  console.log('Dry run only — nothing was written. Re-run with --apply to perform the migration.');
}

async function runApply({ db, householdCode, csvPath, autoRollback, assumeYes }) {
  const rows = loadAndValidateCsv(csvPath);
  await assertHouseholdExists(db, householdCode);
  const { mapping, toCreate, reused } = await resolvePeople(db, householdCode);
  const flagged = findOutliers(rows);
  printSummary({ rows, flagged, reused, toCreate, householdCode });

  if (!assumeYes) {
    const ok = await confirm(
      `About to write ${rows.length} weight doc(s) and ${toCreate.length} new person profile(s) ` +
      `to households/${householdCode}. Continue? [y/N] `
    );
    if (!ok) { console.log('Aborted — nothing written.'); return; }
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = manifestPathFor(runId);
  const manifest = {
    runId,
    householdCode,
    csvPath,
    startedAt: new Date().toISOString(),
    peopleCreated: [],
    weightsWritten: [],
    completedAt: null
  };
  writeManifestSync(manifestPath, manifest);
  console.log(`Manifest: ${manifestPath}`);
  console.log('');

  const peopleCol = db.collection('households').doc(householdCode).collection('weight_members');
  const weightsCol = db.collection('households').doc(householdCode).collection('weights');

  try {
    for (const person of toCreate) {
      await peopleCol.doc(person.id).set(person, { merge: true });
      manifest.peopleCreated.push(person.id);
      writeManifestSync(manifestPath, manifest);
      console.log(`  created person ${person.id} (${person.name})`);
    }

    const entries = buildWeightEntries(rows, mapping);
    const batches = chunk(entries, BATCH_SIZE);
    let written = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = db.batch();
      for (const entry of batches[i]) {
        batch.set(weightsCol.doc(entry.id), entry, { merge: true });
      }
      await batch.commit();
      batches[i].forEach(e => manifest.weightsWritten.push(e.id));
      writeManifestSync(manifestPath, manifest);
      written += batches[i].length;
      console.log(`  batch ${i + 1}/${batches.length} committed (${written}/${entries.length} written)`);
    }

    manifest.completedAt = new Date().toISOString();
    writeManifestSync(manifestPath, manifest);

    console.log('');
    console.log(`Done. documents written: ${manifest.weightsWritten.length}, people created: ${manifest.peopleCreated.length}`);
    console.log(`Manifest saved at: ${manifestPath}`);
    console.log(`To undo this run: node scripts/migrate-daily-weights.mjs --rollback --manifest ${manifestPath}`);
  } catch (err) {
    console.error('');
    console.error('ERROR during migration:', err?.message || err);

    if (autoRollback) {
      console.error('Auto-rolling back everything written so far...');
      try {
        await performRollback({ db, manifest, manifestPath, assumeYes: true });
      } catch (rollbackErr) {
        console.error('ROLLBACK ALSO FAILED:', rollbackErr?.message || rollbackErr);
        console.error(`Manual cleanup needed using manifest: ${manifestPath}`);
      }
    } else {
      console.error('Auto-rollback disabled (--no-auto-rollback). To roll back manually, run:');
      console.error(`  node scripts/migrate-daily-weights.mjs --rollback --manifest ${manifestPath}`);
    }
    process.exitCode = 1;
  }
}

async function runRollback({ db, manifestPath, assumeYes }) {
  const manifest = readManifestSync(manifestPath);
  await performRollback({ db, manifest, manifestPath, assumeYes });
}

// ==========================================
// Firestore init
// ==========================================

function initFirestore(keyArg) {
  const keyPath = keyArg
    ? path.resolve(keyArg)
    : (process.env.GOOGLE_APPLICATION_CREDENTIALS ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) : null);

  if (!keyPath) {
    throw new MigrationError(
      'No service-account credential found.\n' +
      '  Pass --key <path-to-service-account.json> or set GOOGLE_APPLICATION_CREDENTIALS.\n' +
      '  Generate one in the Firebase Console: Project Settings -> Service Accounts -> Generate new private key.'
    );
  }
  if (!fs.existsSync(keyPath)) {
    throw new MigrationError(`Service-account key file not found: ${keyPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const app = initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

// ==========================================
// Entry point
// ==========================================

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.rollback ? 'rollback' : args.apply ? 'apply' : 'dry-run';
  const householdCode = (args.household || DEFAULT_HOUSEHOLD).trim().toUpperCase();
  const csvPath = args.csv ? path.resolve(args.csv) : DEFAULT_CSV;
  const assumeYes = !!args.yes;

  console.log(`Mode: ${mode}`);

  const db = initFirestore(args.key);

  if (mode === 'rollback') {
    if (!args.manifest) throw new MigrationError('--rollback requires --manifest <path>');
    await runRollback({ db, manifestPath: path.resolve(args.manifest), assumeYes });
    return;
  }

  if (mode === 'apply') {
    await runApply({ db, householdCode, csvPath, autoRollback: !args['no-auto-rollback'], assumeYes });
    return;
  }

  await runDryRun({ db, householdCode, csvPath });
}

main().catch((err) => {
  console.error('');
  console.error(err instanceof MigrationError ? `Error: ${err.message}` : err);
  process.exitCode = 1;
});
