import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Hash password for all test users
  const password = 'Pass123$1';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create or update CEO user
  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@relon.com' },
    update: {},
    create: {
      email: 'ceo@relon.com',
      password: hashedPassword,
      name: 'CEO User',
      role: 'CEO',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created CEO:', ceo.email);

  // Create or update Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@relon.com' },
    update: {},
    create: {
      email: 'admin@relon.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created Admin:', admin.email);

  // Create or update BDM user (formerly Manager)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@relon.com' },
    update: {},
    create: {
      email: 'manager@relon.com',
      password: hashedPassword,
      name: 'BDM User',
      role: 'BDM',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created BDM:', manager.email);

  // Create or update BDM 2 (Team B)
  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@relon.com' },
    update: {},
    create: {
      email: 'manager2@relon.com',
      password: hashedPassword,
      name: 'BDM 2',
      role: 'BDM',
      status: 'Active',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created Manager 2:', manager2.email);

  // Create Teams
  const teamA = await prisma.team.upsert({
    where: { id: 'seed-team-a' },
    update: { managerId: manager.id },
    create: {
      id: 'seed-team-a',
      name: 'Sales Team A',
      description: 'Primary sales team',
      type: 'SALES',
      managerId: manager.id,
    },
  });
  console.log('✅ Created Team:', teamA.name);

  const teamB = await prisma.team.upsert({
    where: { id: 'seed-team-b' },
    update: { managerId: manager2.id },
    create: {
      id: 'seed-team-b',
      name: 'Sales Team B',
      description: 'Secondary sales team',
      type: 'SALES',
      managerId: manager2.id,
    },
  });
  console.log('✅ Created Team:', teamB.name);

  // Assign managers to their teams
  await prisma.user.update({
    where: { id: manager.id },
    data: { teamId: teamA.id, teamName: 'Sales Team A' },
  });
  await prisma.user.update({
    where: { id: manager2.id },
    data: { teamId: teamB.id, teamName: 'Sales Team B' },
  });

  // Create or update Sales user (Team A)
  const sales1 = await prisma.user.upsert({
    where: { email: 'sales@relon.com' },
    update: { teamId: teamA.id, teamName: 'Sales Team A', managerId: manager.id },
    create: {
      email: 'sales@relon.com',
      password: hashedPassword,
      name: 'Sales Executive 1',
      role: 'SALES',
      status: 'Active',
      isEmailVerified: true,
      teamName: 'Sales Team A',
      teamId: teamA.id,
      managerId: manager.id,
    },
  });
  console.log('✅ Created Sales 1 (Team A):', sales1.email);

  // Create or update Sales 2 (Team B)
  const sales2 = await prisma.user.upsert({
    where: { email: 'sales2@relon.com' },
    update: { teamId: teamB.id, teamName: 'Sales Team B', managerId: manager2.id },
    create: {
      email: 'sales2@relon.com',
      password: hashedPassword,
      name: 'Sales Executive 2',
      role: 'SALES',
      status: 'Active',
      isEmailVerified: true,
      teamName: 'Sales Team B',
      teamId: teamB.id,
      managerId: manager2.id,
    },
  });
  console.log('✅ Created Sales 2 (Team B):', sales2.email);

  // Create or update Sales 3 (Team B)
  const sales3 = await prisma.user.upsert({
    where: { email: 'sales3@relon.com' },
    update: { teamId: teamB.id, teamName: 'Sales Team B', managerId: manager2.id },
    create: {
      email: 'sales3@relon.com',
      password: hashedPassword,
      name: 'Sales Executive 3',
      role: 'SALES',
      status: 'Active',
      isEmailVerified: true,
      teamName: 'Sales Team B',
      teamId: teamB.id,
      managerId: manager2.id,
    },
  });
  console.log('✅ Created Sales 3 (Team B):', sales3.email);

  // Seed default pipeline stages
  const defaultStages = [
    { name: 'New', pipelineType: 'prospective_project', color: 'bg-gray-500', lightColor: 'bg-gray-50', border: 'border-gray-200', probability: 10, sortOrder: 0, isSystem: false },
    { name: 'Contacted', pipelineType: 'prospective_project', color: 'bg-blue-500', lightColor: 'bg-blue-50', border: 'border-blue-200', probability: 30, sortOrder: 1, isSystem: false },
    { name: 'Quoted', pipelineType: 'prospective_project', color: 'bg-purple-500', lightColor: 'bg-purple-50', border: 'border-purple-200', probability: 50, sortOrder: 2, isSystem: false },
    { name: 'Negotiation', pipelineType: 'prospective_project', color: 'bg-orange-500', lightColor: 'bg-orange-50', border: 'border-orange-200', probability: 80, sortOrder: 3, isSystem: false },
    { name: 'Won', pipelineType: 'prospective_project', color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', probability: 100, sortOrder: 4, isSystem: true },
    { name: 'Lost', pipelineType: 'prospective_project', color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', probability: 0, sortOrder: 5, isSystem: true },
    // Project pipeline stages
    { name: 'Planning', pipelineType: 'project', color: 'bg-blue-500', lightColor: 'bg-blue-50', border: 'border-blue-200', probability: 0, sortOrder: 0, isSystem: true },
    { name: 'Active', pipelineType: 'project', color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', probability: 50, sortOrder: 1, isSystem: true },
    { name: 'On Hold', pipelineType: 'project', color: 'bg-yellow-500', lightColor: 'bg-yellow-50', border: 'border-yellow-200', probability: 0, sortOrder: 2, isSystem: false },
    { name: 'Completed', pipelineType: 'project', color: 'bg-gray-400', lightColor: 'bg-gray-50', border: 'border-gray-200', probability: 100, sortOrder: 3, isSystem: true },
    { name: 'Cancelled', pipelineType: 'project', color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', probability: 0, sortOrder: 4, isSystem: false },
  ];

  for (const stage of defaultStages) {
    await prisma.pipelineStage.upsert({
      where: { name_pipelineType: { name: stage.name, pipelineType: stage.pipelineType } },
      update: {},
      create: stage,
    });
  }
  console.log('✅ Seeded 11 default pipeline stages (6 prospective_project + 5 project)');

  // Seed role permissions for reports
  const reportPermissions = [
    // CEO - full access
    { role: 'CEO', permission: 'reports:view' },
    { role: 'CEO', permission: 'reports:export' },
    // ADMIN - full access
    { role: 'ADMIN', permission: 'reports:view' },
    { role: 'ADMIN', permission: 'reports:export' },
    // BDM - full access (team-filtered)
    { role: 'BDM', permission: 'reports:view' },
    { role: 'BDM', permission: 'reports:export' },
    // SALES - view only (own data)
    { role: 'SALES', permission: 'reports:view' },
  ];

  for (const perm of reportPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: perm.role,
          permission: perm.permission,
        },
      },
      update: {},
      create: perm,
    });
  }
  console.log('✅ Seeded 7 report permissions');

  console.log('\n📊 Seed Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 7 test users created with the following credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔐 All users have password: Pass123$1\n');
  console.log('1️⃣  CEO:');
  console.log('   Email: ceo@relon.com');
  console.log('   Role: CEO (Full system access)\n');

  console.log('2️⃣  Admin:');
  console.log('   Email: admin@relon.com');
  console.log('   Role: ADMIN (User management & system settings)\n');

  console.log('3️⃣  BDM (Team A):');
  console.log('   Email: manager@relon.com');
  console.log('   Role: BDM (Team: Sales Team A)\n');

  console.log('4️⃣  Sales Executive 1 (Team A):');
  console.log('   Email: sales@relon.com');
  console.log('   Role: SALES (Reports to BDM, Team: Sales Team A)\n');

  console.log('5️⃣  BDM 2 (Team B):');
  console.log('   Email: manager2@relon.com');
  console.log('   Role: BDM (Team: Sales Team B)\n');

  console.log('6️⃣  Sales Executive 2 (Team B):');
  console.log('   Email: sales2@relon.com');
  console.log('   Role: SALES (Reports to BDM 2, Team: Sales Team B)\n');

  console.log('7️⃣  Sales Executive 3 (Team B):');
  console.log('   Email: sales3@relon.com');
  console.log('   Role: SALES (Reports to BDM 2, Team: Sales Team B)\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
