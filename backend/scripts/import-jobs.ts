/**
 * Import historical Apex jobs (2024–2026) from Excel export.
 *
 * Prerequisites: run the Excel parser first to generate the JSON:
 *   python3 backend/scripts/parse-jobs-excel.py
 *
 * Run:
 *   dotenv -e .env -- npx ts-node --transpile-only scripts/import-jobs.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ImportJob {
  jobNumber: string;
  name: string;
  clientName: string;
  services: string;
  county: string;
  contractedValue: number;
  notes: string;
}

// ─── Fuzzy matching ──────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((w) => w.length > 1));
}

/** Jaccard similarity between two word sets: |A ∩ B| / |A ∪ B| */
function jaccardSim(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/** Returns the best-matching client id (or null if score < threshold). */
function fuzzyMatchClient(
  excelName: string,
  dbClients: { id: string; name: string }[],
): string | null {
  const normExcel = normalize(excelName);
  let bestId: string | null = null;
  let bestScore = 0;

  for (const c of dbClients) {
    const normDb = normalize(c.name);

    // Exact match after normalisation
    if (normExcel === normDb) return c.id;

    // Containment check (one name fully inside the other, min 4 chars)
    if (
      normExcel.length >= 4 &&
      normDb.length >= 4 &&
      (normExcel.includes(normDb) || normDb.includes(normExcel))
    ) {
      const score = 0.85; // strong but not exact
      if (score > bestScore) {
        bestScore = score;
        bestId = c.id;
      }
      continue;
    }

    const score = jaccardSim(excelName, c.name);
    if (score > bestScore) {
      bestScore = score;
      bestId = c.id;
    }
  }

  return bestScore >= 0.45 ? bestId : null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dataPath = process.env.JOBS_JSON ?? '/tmp/apex-jobs-import.json';

  if (!fs.existsSync(dataPath)) {
    console.error(`❌  JSON file not found at ${dataPath}`);
    console.error('   Run: python3 backend/scripts/parse-jobs-excel.py first');
    process.exit(1);
  }

  const jobs: ImportJob[] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📂  Loaded ${jobs.length} jobs from JSON`);

  // Fetch existing data for dedup / matching
  const [existingProjects, existingClients] = await Promise.all([
    prisma.project.findMany({ select: { jobNumber: true } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
  ]);

  const existingJobNumbers = new Set(
    existingProjects.map((p) => p.jobNumber).filter(Boolean),
  );
  console.log(`🗂   ${existingJobNumbers.size} existing projects, ${existingClients.length} existing clients`);

  let skipped = 0;
  let created = 0;
  let newClients = 0;
  let matched = 0;

  // Client cache: excelName → id (built as we go to avoid creating duplicates
  // within the same import run)
  const clientCache = new Map<string, string>();

  for (const job of jobs) {
    // ── Dedup check ──────────────────────────────────────────────────────────
    if (existingJobNumbers.has(job.jobNumber)) {
      skipped++;
      continue;
    }

    // ── Client resolution ────────────────────────────────────────────────────
    let clientId: string;

    if (clientCache.has(job.clientName)) {
      clientId = clientCache.get(job.clientName)!;
    } else {
      const matchId = fuzzyMatchClient(job.clientName, existingClients);

      if (matchId) {
        clientId = matchId;
        matched++;
      } else {
        // Create a new client with minimal info; staff can fill details later
        const newClient = await prisma.client.create({
          data: {
            name: job.clientName || 'Unknown Client',
            segment: 'Unknown',
            industry: 'Unknown',
            status: 'Active',
          },
        });
        clientId = newClient.id;
        existingClients.push({ id: newClient.id, name: newClient.name });
        newClients++;
      }

      clientCache.set(job.clientName, clientId);
    }

    // ── Project creation ──────────────────────────────────────────────────────
    await prisma.project.create({
      data: {
        jobNumber: job.jobNumber,
        name: job.name,
        clientId,
        status: 'Active',
        contractedValue: job.contractedValue ?? 0,
        county: job.county ? [job.county] : [],
        description: [job.services, job.notes].filter(Boolean).join(' | ') || null,
      },
    });

    created++;
    existingJobNumbers.add(job.jobNumber);

    if (created % 50 === 0) {
      console.log(`   ✔  ${created} projects created so far…`);
    }
  }

  console.log('\n✅  Import complete');
  console.log(`   Created : ${created} projects`);
  console.log(`   Skipped : ${skipped} (already existed)`);
  console.log(`   Matched : ${matched} jobs to existing clients`);
  console.log(`   New clients created: ${newClients}`);
}

main()
  .catch((e) => {
    console.error('❌  Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
