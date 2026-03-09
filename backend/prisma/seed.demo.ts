import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Apex demo seed...\n');

  const hashedPassword = await bcrypt.hash('ApexDemo2026!', 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ─── Remove old @relon.com users and seed teams ───────────────────────────

  // Detach users from seed teams first
  await prisma.user.updateMany({
    where: { teamId: { in: ['seed-team-a', 'seed-team-b'] } },
    data: { teamId: null, teamName: null },
  });

  const relonUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@relon.com' } },
    select: { id: true },
  });
  const relonIds = relonUsers.map((u) => u.id);

  if (relonIds.length > 0) {
    // Remove FK references from other users
    await prisma.user.updateMany({
      where: { managerId: { in: relonIds } },
      data: { managerId: null },
    });
    await prisma.team.updateMany({
      where: { managerId: { in: relonIds } },
      data: { managerId: null },
    });

    // Delete non-cascade dependent records
    await prisma.stageHistory.deleteMany({ where: { changedBy: { in: relonIds } } });
    await prisma.projectStatusHistory.deleteMany({ where: { changedBy: { in: relonIds } } });
    await prisma.activity.deleteMany({ where: { userId: { in: relonIds } } });
    await prisma.costLog.deleteMany({ where: { createdBy: { in: relonIds } } });
  }

  await prisma.team.deleteMany({
    where: { id: { in: ['seed-team-a', 'seed-team-b'] } },
  });

  await prisma.user.deleteMany({
    where: { email: { endsWith: '@relon.com' } },
  });
  console.log('✅ Removed old @relon.com users and seed teams');

  // ─── Apex team users ──────────────────────────────────────────────────────

  const nana = await prisma.user.upsert({
    where: { email: 'nana@apexsurveying.net' },
    update: { password: hashedPassword, name: 'Nana Opoku', role: 'CEO', status: 'Active', isEmailVerified: true },
    create: {
      email: 'nana@apexsurveying.net',
      password: hashedPassword,
      name: 'Nana Opoku',
      role: 'CEO',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ User:', nana.email);

  await prisma.user.upsert({
    where: { email: 'andrew@apexsurveying.net' },
    update: { password: hashedPassword, name: 'Andrew Scheribel', role: 'ADMIN', status: 'Active', isEmailVerified: true },
    create: {
      email: 'andrew@apexsurveying.net',
      password: hashedPassword,
      name: 'Andrew Scheribel',
      role: 'ADMIN',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ User: andrew@apexsurveying.net');

  const parker = await prisma.user.upsert({
    where: { email: 'pzurbuch@apexsurveying.net' },
    update: { password: hashedPassword, name: 'Parker Zurbuch', role: 'CEO', status: 'Active', isEmailVerified: true },
    create: {
      email: 'pzurbuch@apexsurveying.net',
      password: hashedPassword,
      name: 'Parker Zurbuch',
      role: 'CEO',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ User:', parker.email);

  await prisma.user.upsert({
    where: { email: 'clipp@apexsurveying.net' },
    update: { password: hashedPassword, name: 'Conner Lipp', role: 'ADMIN', status: 'Active', isEmailVerified: true },
    create: {
      email: 'clipp@apexsurveying.net',
      password: hashedPassword,
      name: 'Conner Lipp',
      role: 'ADMIN',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ User: clipp@apexsurveying.net');

  // ─── Full permissions for CEO and ADMIN ──────────────────────────────────

  const allPermissionKeys = [
    'leads:view', 'leads:create', 'leads:edit', 'leads:delete', 'leads:analyze',
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
    'clients:health', 'clients:upsell', 'clients:convert',
    'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
    'costs:view', 'costs:create', 'costs:delete',
    'teams:view', 'teams:create', 'teams:edit', 'teams:delete',
    'teams:manage_members', 'teams:be_manager',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'dashboard:view', 'dashboard:edit',
    'ai_settings:view', 'ai_settings:edit',
    'audit_logs:view',
    'permissions:view', 'permissions:edit',
    'pipeline:manage',
    'reports:view', 'reports:export', 'reports:view_all',
    'settings:manage', 'settings:view', 'settings:edit',
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete',
    'tasks:view_all', 'tasks:assign',
    'notifications:view',
    'quotes:view', 'quotes:create', 'quotes:edit', 'quotes:delete',
    'workflows:view', 'workflows:create', 'workflows:edit', 'workflows:delete',
  ];

  for (const role of ['CEO', 'ADMIN']) {
    for (const permission of allPermissionKeys) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: {},
        create: { role, permission },
      });
    }
  }
  console.log('✅ Full permissions granted to CEO and ADMIN');

  // ─── Client: City of Fort Wayne ───────────────────────────────────────────

  const client = await prisma.client.upsert({
    where: { id: 'demo-cfw-001' },
    update: {},
    create: {
      id: 'demo-cfw-001',
      name: 'City of Fort Wayne — Engineering Dept',
      segment: 'Municipal',
      industry: 'Government',
      status: 'Active',
      lifetimeRevenue: 0,
      accountManagerId: parker.id,
    },
  });
  console.log('✅ Client:', client.name);

  await prisma.contact.upsert({
    where: { id: 'demo-contact-001' },
    update: {},
    create: {
      id: 'demo-contact-001',
      clientId: client.id,
      firstName: 'David',
      lastName: 'Morales',
      jobTitle: 'Senior Engineer',
      email: 'dmorales@cityoffortwayne.org',
      isPrimary: true,
    },
  });
  console.log('✅ Contact: David Morales');

  // ─── Look up ROW Engineering Survey service type ──────────────────────────

  const rowServiceType = await prisma.serviceType.findFirst({
    where: { name: 'ROW Engineering Survey' },
  });

  // ─── Lead ─────────────────────────────────────────────────────────────────

  const lead = await prisma.lead.upsert({
    where: { id: 'demo-lead-001' },
    update: {},
    create: {
      id: 'demo-lead-001',
      projectName: 'Downtown Utility Corridor Survey',
      contactName: 'David Morales',
      company: 'City of Fort Wayne — Engineering Dept',
      stage: 'Proposal Sent',
      urgency: 'Medium',
      expectedValue: 18500,
      source: 'Repeat Client',
      serviceTypeId: rowServiceType?.id,
      assignedToId: parker.id,
      clientId: client.id,
    },
  });
  console.log('✅ Lead:', lead.projectName);

  await prisma.stageHistory.upsert({
    where: { id: 'demo-stage-hist-001' },
    update: {},
    create: {
      id: 'demo-stage-hist-001',
      leadId: lead.id,
      fromStage: 'Inquiry',
      toStage: 'Proposal Sent',
      changedBy: parker.id,
    },
  });
  console.log('✅ Stage history: Inquiry → Proposal Sent');

  // ─── Project ──────────────────────────────────────────────────────────────

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 10);
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 30);

  const project = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      name: 'INDOT US-24 ROW Control Survey',
      clientId: client.id,
      status: 'Field Work',
      riskStatus: 'On Track',
      contractedValue: 42000,
      estimatedRevenue: 46200,
      totalCost: 0,
      projectManagerId: parker.id,
      serviceTypeId: rowServiceType?.id,
      startDate,
      estimatedDueDate: dueDate,
    },
  });
  console.log('✅ Project:', project.name);

  await prisma.projectBudget.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      budgetedHours: 120,
      budgetedCost: 38000,
    },
  });
  console.log('✅ Project budget: 120h / $38,000');

  // Custom field values
  const parcelDef = await prisma.customFieldDefinition.findFirst({
    where: { entityType: 'project', fieldKey: 'parcel_number' },
  });
  const countyDef = await prisma.customFieldDefinition.findFirst({
    where: { entityType: 'project', fieldKey: 'county' },
  });

  if (parcelDef) {
    await prisma.customFieldValue.upsert({
      where: {
        definitionId_entityType_entityId: {
          definitionId: parcelDef.id,
          entityType: 'project',
          entityId: project.id,
        },
      },
      update: { value: '02-14-127-003.000-003' },
      create: {
        definitionId: parcelDef.id,
        entityType: 'project',
        entityId: project.id,
        value: '02-14-127-003.000-003',
      },
    });
    console.log('✅ Custom field: Parcel Number = 02-14-127-003.000-003');
  }

  if (countyDef) {
    await prisma.customFieldValue.upsert({
      where: {
        definitionId_entityType_entityId: {
          definitionId: countyDef.id,
          entityType: 'project',
          entityId: project.id,
        },
      },
      update: { value: 'Allen' },
      create: {
        definitionId: countyDef.id,
        entityType: 'project',
        entityId: project.id,
        value: 'Allen',
      },
    });
    console.log('✅ Custom field: County = Allen');
  }

  // ─── Quote ────────────────────────────────────────────────────────────────

  const quote = await prisma.quote.upsert({
    where: { id: 'demo-quote-001' },
    update: {},
    create: {
      id: 'demo-quote-001',
      status: 'DRAFT',
      clientId: client.id,
      subtotal: 18500,
      total: 18500,
      createdById: parker.id,
    },
  });
  console.log('✅ Quote created (DRAFT, $18,500)');

  const lineItems = [
    {
      id: 'demo-li-001',
      description: 'Field Survey Crew — 3 days',
      quantity: 3,
      unitPrice: 1800,
      lineTotal: 5400,
      sortOrder: 0,
    },
    {
      id: 'demo-li-002',
      description: 'GPS/GNSS Equipment & Vehicle',
      quantity: 1,
      unitPrice: 2100,
      lineTotal: 2100,
      sortOrder: 1,
    },
    {
      id: 'demo-li-003',
      description: 'Office Processing, CAD Drafting & Report',
      quantity: 1,
      unitPrice: 11000,
      lineTotal: 11000,
      sortOrder: 2,
    },
  ];

  for (const item of lineItems) {
    await prisma.quoteLineItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        quoteId: quote.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        sortOrder: item.sortOrder,
      },
    });
  }
  console.log('✅ Quote line items (3 items)');

  // ─── Tasks ────────────────────────────────────────────────────────────────

  const task1Due = new Date(today);
  task1Due.setDate(today.getDate() + 3);
  const task2Due = new Date(today);
  task2Due.setDate(today.getDate() + 14);

  await prisma.task.upsert({
    where: { id: 'demo-task-001' },
    update: {},
    create: {
      id: 'demo-task-001',
      title: 'Mobilize field crew and equipment',
      status: 'OPEN',
      priority: 'HIGH',
      dueDate: task1Due,
      entityType: 'project',
      entityId: project.id,
      assignedToId: parker.id,
      createdById: parker.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 'demo-task-002' },
    update: {},
    create: {
      id: 'demo-task-002',
      title: 'Complete control point processing',
      status: 'OPEN',
      priority: 'MEDIUM',
      dueDate: task2Due,
      entityType: 'project',
      entityId: project.id,
      assignedToId: parker.id,
      createdById: parker.id,
    },
  });
  console.log('✅ Tasks seeded (2 open tasks)');

  // ─── Forecast Targets (2026) ──────────────────────────────────────────────

  const forecastTargets = [
    { month: 1, amount: 65000 },
    { month: 2, amount: 70000 },
    { month: 3, amount: 85000 },
    { month: 4, amount: 110000 },
    { month: 5, amount: 140000 },
    { month: 6, amount: 165000 },
    { month: 7, amount: 175000 },
    { month: 8, amount: 165000 },
    { month: 9, amount: 140000 },
    { month: 10, amount: 110000 },
    { month: 11, amount: 80000 },
    { month: 12, amount: 60000 },
  ];

  for (const { month, amount } of forecastTargets) {
    await prisma.forecastTarget.upsert({
      where: { month_year: { month, year: 2026 } },
      update: { targetAmount: amount },
      create: { month, year: 2026, targetAmount: amount, currency: 'USD' },
    });
  }
  console.log('✅ Forecast targets seeded (Jan–Dec 2026)');

  // ─── AI Analytics Report ──────────────────────────────────────────────────

  await prisma.aIAnalyticsReport.upsert({
    where: { id: 'demo-analytics-001' },
    update: {},
    create: {
      id: 'demo-analytics-001',
      reportType: 'bottleneck',
      content: `# Apex CRM — System Ready

Welcome to Apex CRM Analytics. Your system is fully configured and ready for real data.

## What's Already Set Up

- **6 Lead Pipeline Stages**: Inquiry → Proposal Sent → Site Visit Scheduled → Contract Signed → Closed Won → Closed Lost
- **Custom Fields**: Parcel Number, County, Township/Section/Range, INDOT Des Number, Crew Lead, Equipment Type, Permit Number
- **10 Service Types**: ROW Engineering, Boundary, Topographic, Construction Staking, ALTA/NSPS, Cell Tower, Subdivision Plat, Environmental, Control, As-Built
- **4 Team Accounts**: Nana (CEO), Parker (CEO), Andrew (Admin), Conner (Admin)

## As Real Data Flows In, This Page Will Surface

- **Stage Bottlenecks**: Which pipeline stage is stalling the most leads, and for how long on average
- **Task Velocity**: Average task completion time per team member
- **Stuck Projects**: Projects overdue relative to their estimated completion date
- **Revenue Forecasting**: Actual vs. target by month, with AI-generated variance explanations
- **AI Reports**: Weekly summaries identifying highest-risk leads, dormant clients, and recommended follow-up actions

## Getting Started

1. Enter your active leads in the Leads Kanban
2. Create your current open projects
3. Log time against the demo project to test the time tracking module
4. Invite additional team members from the Admin → Users panel

The analytics engine will begin generating insights as patterns emerge in your data.`,
      generatedAt: new Date(),
    },
  });
  console.log('✅ AI Analytics report seeded');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Demo seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔐 All accounts — password: ApexDemo2026!\n');
  console.log('  pzurbuch@apexsurveying.net  — CEO (Parker, primary demo account)');
  console.log('  nana@apexsurveying.net      — CEO (Nana)');
  console.log('  andrew@apexsurveying.net    — ADMIN (Andrew)');
  console.log('  clipp@apexsurveying.net     — ADMIN (Conner)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
