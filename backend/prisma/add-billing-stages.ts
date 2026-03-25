/**
 * One-off script: inserts billing stages and shifts existing terminal stages.
 * Run once after the add_pipeline_service_type migration:
 *   ! cd backend && npx ts-node prisma/add-billing-stages.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Adding billing stages to project pipeline...\n');

  // Shift Completed → 9, On Hold → 10, Cancelled → 11
  const shifts = [
    { name: 'Completed', sortOrder: 9 },
    { name: 'On Hold', sortOrder: 10 },
    { name: 'Cancelled', sortOrder: 11 },
  ];

  for (const { name, sortOrder } of shifts) {
    const updated = await prisma.pipelineStage.updateMany({
      where: { name, pipelineType: 'project', serviceType: '__all__' },
      data: { sortOrder },
    });
    console.log(`  ↳ "${name}" → sortOrder ${sortOrder} (${updated.count} row)`);
  }

  // Upsert the three billing stages
  const billingStages = [
    {
      name: 'Needs Invoiced',
      pipelineType: 'project',
      serviceType: '__all__',
      color: 'bg-cyan-500',
      lightColor: 'bg-cyan-50',
      border: 'border-cyan-200',
      probability: 97,
      sortOrder: 6,
      isSystem: true,
    },
    {
      name: 'Invoiced',
      pipelineType: 'project',
      serviceType: '__all__',
      color: 'bg-blue-400',
      lightColor: 'bg-blue-50',
      border: 'border-blue-200',
      probability: 98,
      sortOrder: 7,
      isSystem: true,
    },
    {
      name: 'Paid',
      pipelineType: 'project',
      serviceType: '__all__',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      border: 'border-emerald-200',
      probability: 99,
      sortOrder: 8,
      isSystem: true,
    },
  ];

  for (const stage of billingStages) {
    await prisma.pipelineStage.upsert({
      where: {
        name_pipelineType_serviceType: {
          name: stage.name,
          pipelineType: stage.pipelineType,
          serviceType: stage.serviceType,
        },
      },
      update: { sortOrder: stage.sortOrder, probability: stage.probability, isSystem: stage.isSystem },
      create: stage,
    });
    console.log(`  ✅ "${stage.name}" at sortOrder ${stage.sortOrder}`);
  }

  console.log('\n✨ Done! Project pipeline now has:');
  const all = await prisma.pipelineStage.findMany({
    where: { pipelineType: 'project', serviceType: '__all__' },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, sortOrder: true, probability: true, isSystem: true },
  });
  all.forEach((s) =>
    console.log(
      `  ${s.sortOrder.toString().padStart(2)}. ${s.name.padEnd(20)} ${s.probability}%${s.isSystem ? ' [system]' : ''}`,
    ),
  );
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
