/**
 * seed-apex-import.ts
 *
 * Imports 73 clients, their contacts, and 150 projects from apex-import-150.json.
 *
 * Run AFTER:
 *   1. npx prisma migrate deploy   (applies migrations to fresh DB)
 *   2. npx ts-node -r tsconfig-paths/register prisma/seed-users.ts
 *      (app startup also seeds roles, service types, dropdown options via onModuleInit)
 *
 * Then run:
 *   npx ts-node -r tsconfig-paths/register prisma/seed-apex-import.ts
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a multi-county string into an array of trimmed county names.
 * Handles formats like:
 *   "Allen"
 *   "Allen, Dekalb & Steuben"
 *   "Fountain and White"
 *   "DeKalb & Noble"
 *   "Various"
 */
function parseCounties(raw: string | null | undefined): string[] {
  if (!raw) return [];
  // Split on ", ", " & ", " and " (case-insensitive)
  return raw
    .split(/,\s*|\s+&\s+|\s+and\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting Apex data import...\n');

  const dataPath = path.resolve(__dirname, '../../apex-import-150.json');
  const raw = fs.readFileSync(dataPath, 'utf-8').replace(/:\s*NaN/g, ': null');
  const data = JSON.parse(raw) as {
    summary: Record<string, unknown>;
    clients: Record<
      string,
      {
        name: string;
        segment: string;
        industry: string;
        status: string;
        contacts: Array<{ name: unknown }>;
      }
    >;
    projects: Array<{
      jobNumber: string;
      name: string;
      clientName: string;
      rawClient: string;
      services_raw: string;
      serviceTypes: string[];
      county: string | null;
      status: string;
      startDate: string | null;
      description: string | null;
      subdivision: string | null;
    }>;
  };

  // ── 1. Upsert clients ───────────────────────────────────────────────────────
  console.log('1️⃣  Upserting clients...');
  const clientIdByName = new Map<string, string>();

  for (const [key, c] of Object.entries(data.clients)) {
    let client = await prisma.client.findFirst({ where: { name: c.name } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: c.name,
          segment: c.segment,
          industry: c.industry,
          status: c.status,
          lifetimeRevenue: 0,
        },
      });
    }
    clientIdByName.set(key, client.id);
  }
  console.log(`   ✅ ${clientIdByName.size} clients upserted\n`);

  // ── 2. Create contacts ──────────────────────────────────────────────────────
  console.log('2️⃣  Creating contacts...');
  let contactsCreated = 0;
  let contactsSkipped = 0;

  for (const [key, c] of Object.entries(data.clients)) {
    const clientId = clientIdByName.get(key);
    if (!clientId) continue;

    for (const contact of c.contacts) {
      // Skip NaN / null / empty names
      const nameRaw = contact.name as unknown;
      if (!nameRaw || typeof nameRaw !== 'string' || nameRaw.toLowerCase() === 'nan') {
        contactsSkipped++;
        continue;
      }
      const name = nameRaw as string;

      // Split "First Last" → firstName / lastName
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] ?? name;
      const lastName = parts.slice(1).join(' ') || '';

      const existing = await prisma.contact.findFirst({
        where: { clientId, firstName, lastName },
      });
      if (!existing) {
        await prisma.contact.create({
          data: { clientId, firstName, lastName, isPrimary: false },
        });
        contactsCreated++;
      }
    }
  }
  console.log(`   ✅ ${contactsCreated} contacts created, ${contactsSkipped} NaN entries skipped\n`);

  // ── 3. Build service type lookup ────────────────────────────────────────────
  console.log('3️⃣  Building service type lookup...');
  const allServiceTypes = await prisma.serviceType.findMany();
  const serviceTypeIdByName = new Map<string, string>();
  for (const st of allServiceTypes) {
    serviceTypeIdByName.set(st.name, st.id);
  }

  // Upsert any service types referenced in the import that aren't seeded yet
  const importServiceTypeNames = new Set<string>();
  for (const p of data.projects) {
    for (const st of p.serviceTypes) {
      importServiceTypeNames.add(st);
    }
  }

  for (const stName of importServiceTypeNames) {
    if (!serviceTypeIdByName.has(stName)) {
      console.log(`   ➕ Creating missing service type: "${stName}"`);
      const created = await prisma.serviceType.upsert({
        where: { name: stName },
        update: {},
        create: { name: stName, isActive: true, sortOrder: 99 },
      });
      serviceTypeIdByName.set(stName, created.id);
    }
  }
  console.log(`   ✅ ${serviceTypeIdByName.size} service types available\n`);

  // ── 4. Create projects ──────────────────────────────────────────────────────
  console.log('4️⃣  Creating projects...');
  let created = 0;
  let skipped = 0;
  const seenJobNumbers = new Set<string>();

  for (const p of data.projects) {
    const clientId = clientIdByName.get(p.clientName);
    if (!clientId) {
      console.warn(`   ⚠️  Unknown client "${p.clientName}" for job ${p.jobNumber} — skipping`);
      skipped++;
      continue;
    }

    // Handle duplicate job number
    let jobNumber = p.jobNumber;
    if (seenJobNumbers.has(jobNumber)) {
      jobNumber = `${jobNumber}-B`;
      console.log(`   🔁 Duplicate job number — using ${jobNumber}`);
    }
    seenJobNumbers.add(jobNumber);

    // Check if project already exists (idempotent re-runs)
    const existing = await prisma.project.findUnique({
      where: { jobNumber },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Handle "CANCELLED" in project name
    let projectName = p.name;
    // Map "Active" → first surveying pipeline stage; keep Cancelled as-is
    let projectStatus = p.status === 'Active' ? 'Mobilization' : p.status;
    let extraDescription: string | undefined;

    if (projectName.includes('CANCELLED')) {
      projectName = projectName.replace(/\s*[-–]\s*CANCELLED/gi, '').replace(/CANCELLED/gi, '').trim();
      projectStatus = 'Cancelled';
    }

    // Handle note embedded in name (job 25100197)
    const noteMatch = projectName.match(/\s+DO NOT GIVE OUT[^-]*/i);
    if (noteMatch) {
      extraDescription = noteMatch[0].trim();
      projectName = projectName.replace(noteMatch[0], '').trim();
    }

    // Build service type IDs
    const serviceTypeIds: string[] = [];
    let primaryServiceTypeId: string | undefined;
    for (const stName of p.serviceTypes) {
      const id = serviceTypeIdByName.get(stName);
      if (id) {
        serviceTypeIds.push(id);
        if (!primaryServiceTypeId) primaryServiceTypeId = id;
      }
    }

    // Parse counties
    const county = parseCounties(p.county);

    // Description: combine original description + subdivision + any note
    const descriptionParts = [
      p.description,
      p.subdivision ? `Subdivision: ${p.subdivision}` : null,
      extraDescription,
    ].filter(Boolean);
    const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined;

    await prisma.project.create({
      data: {
        jobNumber,
        name: projectName,
        clientId,
        status: projectStatus,
        contractedValue: 0,
        county,
        serviceTypeId: primaryServiceTypeId ?? null,
        serviceTypeIds,
        startDate: p.startDate ? new Date(p.startDate) : null,
        description: description ?? null,
        riskStatus: 'On Track',
      },
    });
    created++;
  }

  console.log(`   ✅ ${created} projects created, ${skipped} skipped\n`);
  console.log('🎉 Apex import complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
