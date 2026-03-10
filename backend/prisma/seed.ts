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

  // Remove old generic prospective_project stages before seeding surveying-specific ones
  await prisma.pipelineStage.deleteMany({
    where: {
      pipelineType: 'prospective_project',
      name: { in: ['New', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'] },
    },
  });

  // Surveying-specific pipeline stages
  const defaultStages = [
    // Prospective project (lead) pipeline — Apex surveying lifecycle
    { name: 'Inquiry', pipelineType: 'prospective_project', color: 'bg-gray-500', lightColor: 'bg-gray-50', border: 'border-gray-200', probability: 10, sortOrder: 0, isSystem: false },
    { name: 'Proposal Sent', pipelineType: 'prospective_project', color: 'bg-blue-400', lightColor: 'bg-blue-50', border: 'border-blue-200', probability: 30, sortOrder: 1, isSystem: false },
    { name: 'Site Visit Scheduled', pipelineType: 'prospective_project', color: 'bg-cyan-500', lightColor: 'bg-cyan-50', border: 'border-cyan-200', probability: 45, sortOrder: 2, isSystem: false },
    { name: 'Contract Signed', pipelineType: 'prospective_project', color: 'bg-purple-500', lightColor: 'bg-purple-50', border: 'border-purple-200', probability: 75, sortOrder: 3, isSystem: false },
    { name: 'Closed Won', pipelineType: 'prospective_project', color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', probability: 100, sortOrder: 4, isSystem: true },
    { name: 'Closed Lost', pipelineType: 'prospective_project', color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', probability: 0, sortOrder: 5, isSystem: true },
    // Project execution pipeline — surveying workflow
    { name: 'Mobilization', pipelineType: 'project', color: 'bg-blue-500', lightColor: 'bg-blue-50', border: 'border-blue-200', probability: 0, sortOrder: 0, isSystem: false },
    { name: 'Field Work', pipelineType: 'project', color: 'bg-orange-500', lightColor: 'bg-orange-50', border: 'border-orange-200', probability: 25, sortOrder: 1, isSystem: false },
    { name: 'Office Processing', pipelineType: 'project', color: 'bg-yellow-500', lightColor: 'bg-yellow-50', border: 'border-yellow-200', probability: 50, sortOrder: 2, isSystem: false },
    { name: 'QC Review', pipelineType: 'project', color: 'bg-indigo-500', lightColor: 'bg-indigo-50', border: 'border-indigo-200', probability: 70, sortOrder: 3, isSystem: false },
    { name: 'Deliverable Prep', pipelineType: 'project', color: 'bg-violet-500', lightColor: 'bg-violet-50', border: 'border-violet-200', probability: 85, sortOrder: 4, isSystem: false },
    { name: 'Client Review', pipelineType: 'project', color: 'bg-teal-500', lightColor: 'bg-teal-50', border: 'border-teal-200', probability: 95, sortOrder: 5, isSystem: false },
    { name: 'Completed', pipelineType: 'project', color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', probability: 100, sortOrder: 6, isSystem: true },
    { name: 'On Hold', pipelineType: 'project', color: 'bg-amber-500', lightColor: 'bg-amber-50', border: 'border-amber-200', probability: 0, sortOrder: 7, isSystem: false },
    { name: 'Cancelled', pipelineType: 'project', color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', probability: 0, sortOrder: 8, isSystem: false },
  ];

  for (const stage of defaultStages) {
    await prisma.pipelineStage.upsert({
      where: { name_pipelineType: { name: stage.name, pipelineType: stage.pipelineType } },
      update: { color: stage.color, lightColor: stage.lightColor, border: stage.border, probability: stage.probability, sortOrder: stage.sortOrder },
      create: stage,
    });
  }
  console.log('✅ Seeded 15 surveying pipeline stages (6 prospective_project + 9 project)');

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

  // ─── Service Types (Apex surveying catalog) ───────────────────────────────
  const serviceTypes = [
    'Topographic Survey',
    'Boundary Survey',
    'ROW Engineering Survey',
    'Construction Staking',
    'ALTA/NSPS Land Title Survey',
    'Cell Tower Survey',
    'Subdivision Plat',
    'Environmental Survey',
    'Control Survey',
    'As-Built Survey',
  ];

  for (const name of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Seeded ${serviceTypes.length} service types`);

  // ─── Custom Field Definitions (surveying-specific) ────────────────────────
  const customFields = [
    {
      entityType: 'lead',
      label: 'Parcel Number',
      fieldKey: 'parcel_number',
      fieldType: 'text',
      required: false,
      sortOrder: 0,
    },
    {
      entityType: 'project',
      label: 'Parcel Number',
      fieldKey: 'parcel_number',
      fieldType: 'text',
      required: false,
      sortOrder: 0,
    },
    {
      entityType: 'lead',
      label: 'County',
      fieldKey: 'county',
      fieldType: 'select',
      options: ['Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams', 'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other'],
      required: false,
      sortOrder: 1,
    },
    {
      entityType: 'project',
      label: 'County',
      fieldKey: 'county',
      fieldType: 'select',
      options: ['Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams', 'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other'],
      required: false,
      sortOrder: 1,
    },
    {
      entityType: 'lead',
      label: 'Township / Section / Range',
      fieldKey: 'township_section_range',
      fieldType: 'text',
      required: false,
      sortOrder: 2,
    },
    {
      entityType: 'project',
      label: 'Township / Section / Range',
      fieldKey: 'township_section_range',
      fieldType: 'text',
      required: false,
      sortOrder: 2,
    },
    {
      entityType: 'project',
      label: 'INDOT Des Number',
      fieldKey: 'indot_des_number',
      fieldType: 'text',
      required: false,
      sortOrder: 3,
    },
    {
      entityType: 'project',
      label: 'Crew Lead',
      fieldKey: 'crew_lead',
      fieldType: 'user',
      required: false,
      sortOrder: 4,
    },
    {
      entityType: 'project',
      label: 'Equipment Type',
      fieldKey: 'equipment_type',
      fieldType: 'multiselect',
      options: ['Total Station', 'GPS/GNSS', 'Drone/UAV', 'Level', 'Robotic Total Station'],
      required: false,
      sortOrder: 5,
    },
    {
      entityType: 'project',
      label: 'Permit Number',
      fieldKey: 'permit_number',
      fieldType: 'text',
      required: false,
      sortOrder: 6,
    },
    {
      entityType: 'project',
      label: 'GIS Layer File',
      fieldKey: 'gis_layer_file',
      fieldType: 'file',
      required: false,
      sortOrder: 7,
    },
  ];

  for (const field of customFields) {
    await prisma.customFieldDefinition.upsert({
      where: { entityType_fieldKey: { entityType: field.entityType, fieldKey: field.fieldKey } },
      update: { label: field.label, options: field.options ?? null },
      create: {
        entityType: field.entityType,
        label: field.label,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        options: field.options ?? null,
        required: field.required,
        sortOrder: field.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${customFields.length} custom field definitions`);

  // ─── Roles (surveying-specific) ───────────────────────────────────────────
  const surveyRoles = [
    { key: 'OWNER', label: 'Owner', description: 'Business owner with full access', isBuiltIn: true, color: '#7c3aed' },
    { key: 'PROJECT_MANAGER', label: 'Project Manager', description: 'Manages survey projects, budgets, and crew assignments', isBuiltIn: false, color: '#2563eb' },
    { key: 'PARTY_CHIEF', label: 'Party Chief', description: 'Leads field crew, responsible for field measurements', isBuiltIn: false, color: '#0891b2' },
    { key: 'SURVEY_TECHNICIAN', label: 'Survey Technician', description: 'Performs office processing, drafting, and calculations', isBuiltIn: false, color: '#059669' },
    { key: 'FIELD_CREW', label: 'Field Crew', description: 'Field data collection and construction staking', isBuiltIn: false, color: '#d97706' },
    { key: 'OFFICE_ADMIN', label: 'Office Admin', description: 'Administrative tasks, scheduling, and client communication', isBuiltIn: false, color: '#6b7280' },
    { key: 'DRAFTING_CAD_TECH', label: 'Drafting/CAD Tech', description: 'CAD drafting, plat preparation, and GIS work', isBuiltIn: false, color: '#dc2626' },
    { key: 'BILLING_ADMIN', label: 'Billing Admin', description: 'Invoicing, billing, and accounts receivable', isBuiltIn: false, color: '#9333ea' },
  ];

  for (const role of surveyRoles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { label: role.label, description: role.description, color: role.color },
      create: role,
    });
  }
  console.log(`✅ Seeded ${surveyRoles.length} surveying roles`);

  // ─── Quote Settings (Apex company defaults) ───────────────────────────────
  const quoteSettingsCount = await prisma.quoteSettings.count();
  if (quoteSettingsCount === 0) {
    await prisma.quoteSettings.create({
      data: {
        companyName: 'Apex Consulting & Surveying, Inc.',
        companyAddress: 'Fort Wayne, IN',
        companyPhone: '',
        companyEmail: '',
        companyWebsite: '',
        quoteNumberPrefix: 'ACS-',
        defaultTaxRate: 0,
        defaultValidityDays: 30,
        defaultCurrency: 'USD',
        defaultNotes: 'Thank you for choosing Apex Consulting & Surveying, Inc. We look forward to serving your surveying needs.',
        defaultTerms: 'Payment due within 30 days of invoice date. A 1.5% monthly service charge will be applied to overdue balances.',
        accentColor: '#1d4ed8',
        showTaxLine: true,
        showDiscountLine: false,
        showSignatureBlock: true,
        enableLeadIntegration: true,
      },
    });
    console.log('✅ Seeded Apex quote settings');
  } else {
    await prisma.quoteSettings.updateMany({
      data: {
        companyName: 'Apex Consulting & Surveying, Inc.',
        quoteNumberPrefix: 'ACS-',
        accentColor: '#1d4ed8',
      },
    });
    console.log('✅ Updated Apex quote settings (company name + prefix + color)');
  }

  // ─── Lead Form Template (Apex Project Inquiry) ────────────────────────────
  const inquiryFormApiKey = 'apex-project-inquiry-form';
  await prisma.leadForm.upsert({
    where: { apiKey: inquiryFormApiKey },
    update: {},
    create: {
      name: 'Apex Project Inquiry',
      description: 'Default lead capture form for new project inquiries. Collects client info, project type, location, and county.',
      apiKey: inquiryFormApiKey,
      targetStage: 'Inquiry',
      isActive: true,
      fields: [
        { key: 'contactName', label: 'Full Name', type: 'text', required: true, placeholder: 'Jane Smith' },
        { key: 'company', label: 'Company / Organization', type: 'text', required: false, placeholder: 'Acme Corp (leave blank if individual)' },
        { key: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'jane@example.com' },
        { key: 'phone', label: 'Phone Number', type: 'tel', required: false, placeholder: '(260) 555-1234' },
        { key: 'serviceType', label: 'Project Type', type: 'select', required: true, options: [
          'Topographic Survey',
          'Boundary Survey',
          'ROW Engineering Survey',
          'Construction Staking',
          'ALTA/NSPS Land Title Survey',
          'Cell Tower Survey',
          'Subdivision Plat',
          'Environmental Survey',
          'Control Survey',
          'As-Built Survey',
          'Other',
        ]},
        { key: 'projectLocation', label: 'Project Location / Address', type: 'text', required: false, placeholder: '123 Main St, Fort Wayne, IN' },
        { key: 'county', label: 'County', type: 'select', required: false, options: [
          'Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams',
          'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other',
        ]},
        { key: 'notes', label: 'Project Description', type: 'textarea', required: false, placeholder: 'Briefly describe the scope of work, parcel details, or any special requirements.' },
      ],
    },
  });
  console.log('✅ Seeded Apex Project Inquiry lead form');

  // ── File categories (document type dropdown) ──────────────────────────────
  const fileCategories = [
    { value: 'proposal', label: 'Proposal', sortOrder: 0 },
    { value: 'contract', label: 'Contract', sortOrder: 1 },
    { value: 'survey_drawing', label: 'Survey Drawing', sortOrder: 2 },
    { value: 'field_notes', label: 'Field Notes', sortOrder: 3 },
    { value: 'report', label: 'Report', sortOrder: 4 },
    { value: 'invoice', label: 'Invoice', sortOrder: 5 },
    { value: 'photo', label: 'Photo', sortOrder: 6 },
    { value: 'correspondence', label: 'Correspondence', sortOrder: 7 },
    { value: 'other', label: 'Other', sortOrder: 8 },
  ];
  for (const cat of fileCategories) {
    await prisma.dropdownOption.upsert({
      where: { category_value: { category: 'file_category', value: cat.value } },
      update: { label: cat.label, sortOrder: cat.sortOrder },
      create: { category: 'file_category', ...cat, isSystem: true },
    });
  }
  console.log('✅ Seeded file categories');

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
