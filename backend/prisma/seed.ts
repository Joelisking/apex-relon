import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  const hashedPassword = await bcrypt.hash('Pass123$1', 10);

  // ─── Pipeline Stages ──────────────────────────────────────────────────────
  await prisma.pipelineStage.deleteMany({
    where: {
      pipelineType: 'prospective_project',
      name: { in: ['New', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'] },
    },
  });

  const stages = [
    { name: 'Inquiry', pipelineType: 'prospective_project', color: 'bg-gray-500', lightColor: 'bg-gray-50', border: 'border-gray-200', probability: 10, sortOrder: 0, isSystem: false },
    { name: 'Proposal Sent', pipelineType: 'prospective_project', color: 'bg-blue-400', lightColor: 'bg-blue-50', border: 'border-blue-200', probability: 30, sortOrder: 1, isSystem: false },
    { name: 'Site Visit Scheduled', pipelineType: 'prospective_project', color: 'bg-cyan-500', lightColor: 'bg-cyan-50', border: 'border-cyan-200', probability: 45, sortOrder: 2, isSystem: false },
    { name: 'Contract Signed', pipelineType: 'prospective_project', color: 'bg-purple-500', lightColor: 'bg-purple-50', border: 'border-purple-200', probability: 75, sortOrder: 3, isSystem: false },
    { name: 'Closed Won', pipelineType: 'prospective_project', color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', probability: 100, sortOrder: 4, isSystem: true },
    { name: 'Closed Lost', pipelineType: 'prospective_project', color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', probability: 0, sortOrder: 5, isSystem: true },
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
  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: { name_pipelineType: { name: stage.name, pipelineType: stage.pipelineType } },
      update: { color: stage.color, lightColor: stage.lightColor, border: stage.border, probability: stage.probability, sortOrder: stage.sortOrder },
      create: stage,
    });
  }
  console.log('✅ Seeded pipeline stages');

  // ─── Roles ────────────────────────────────────────────────────────────────
  const roles = [
    { key: 'CEO', label: 'CEO / Owner', description: 'Business owner with full system access', isBuiltIn: true, color: '#7c3aed' },
    { key: 'PROJECT_MANAGER', label: 'Project Manager', description: 'Manages survey projects, budgets, and crew assignments', isBuiltIn: false, color: '#2563eb' },
    { key: 'SURVEY_CREW_CHIEF', label: 'Survey Crew Chief', description: 'Field crew leader and survey operations', isBuiltIn: false, color: '#d97706' },
    { key: 'PARTY_CHIEF', label: 'Party Chief', description: 'Leads field crew, responsible for field measurements', isBuiltIn: false, color: '#0891b2' },
    { key: 'SURVEY_TECHNICIAN', label: 'Survey Technician', description: 'Office processing, drafting, and calculations', isBuiltIn: false, color: '#059669' },
    { key: 'OFFICE_ADMIN', label: 'Office Admin', description: 'Administrative tasks, scheduling, and client communication', isBuiltIn: false, color: '#6b7280' },
    { key: 'DRAFTING_CAD_TECH', label: 'Drafting/CAD Tech', description: 'CAD drafting, plat preparation, and GIS work', isBuiltIn: false, color: '#dc2626' },
    { key: 'BILLING_ADMIN', label: 'Billing Admin', description: 'Invoicing, billing, and accounts receivable', isBuiltIn: false, color: '#9333ea' },
  ];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { label: role.label, description: role.description, color: role.color },
      create: role,
    });
  }
  console.log('✅ Seeded roles');

  // ─── Report Permissions ───────────────────────────────────────────────────
  const reportPermissions = [
    { role: 'CEO', permission: 'reports:view' },
    { role: 'CEO', permission: 'reports:export' },
    { role: 'ADMIN', permission: 'reports:view' },
    { role: 'ADMIN', permission: 'reports:export' },
    { role: 'OWNER', permission: 'reports:view' },
    { role: 'OWNER', permission: 'reports:export' },
    { role: 'PROJECT_MANAGER', permission: 'reports:view' },
    { role: 'PROJECT_MANAGER', permission: 'reports:export' },
    { role: 'SURVEY_CREW_CHIEF', permission: 'reports:view' },
  ];
  for (const perm of reportPermissions) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: perm.role, permission: perm.permission } },
      update: {},
      create: perm,
    });
  }
  console.log('✅ Seeded report permissions');

  // ─── Custom Field Definitions ─────────────────────────────────────────────
  const customFields = [
    { entityType: 'lead', label: 'Parcel Number', fieldKey: 'parcel_number', fieldType: 'text', required: false, sortOrder: 0 },
    { entityType: 'project', label: 'Parcel Number', fieldKey: 'parcel_number', fieldType: 'text', required: false, sortOrder: 0 },
    { entityType: 'lead', label: 'County', fieldKey: 'county', fieldType: 'select', options: ['Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams', 'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other'], required: false, sortOrder: 1 },
    { entityType: 'project', label: 'County', fieldKey: 'county', fieldType: 'select', options: ['Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams', 'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other'], required: false, sortOrder: 1 },
    { entityType: 'lead', label: 'Township / Section / Range', fieldKey: 'township_section_range', fieldType: 'text', required: false, sortOrder: 2 },
    { entityType: 'project', label: 'Township / Section / Range', fieldKey: 'township_section_range', fieldType: 'text', required: false, sortOrder: 2 },
    { entityType: 'project', label: 'INDOT Des Number', fieldKey: 'indot_des_number', fieldType: 'text', required: false, sortOrder: 3 },
    { entityType: 'project', label: 'Crew Lead', fieldKey: 'crew_lead', fieldType: 'user', required: false, sortOrder: 4 },
    { entityType: 'project', label: 'Equipment Type', fieldKey: 'equipment_type', fieldType: 'multiselect', options: ['Total Station', 'GPS/GNSS', 'Drone/UAV', 'Level', 'Robotic Total Station'], required: false, sortOrder: 5 },
    { entityType: 'project', label: 'Permit Number', fieldKey: 'permit_number', fieldType: 'text', required: false, sortOrder: 6 },
    { entityType: 'project', label: 'GIS Layer File', fieldKey: 'gis_layer_file', fieldType: 'file', required: false, sortOrder: 7 },
  ];
  for (const field of customFields) {
    await prisma.customFieldDefinition.upsert({
      where: { entityType_fieldKey: { entityType: field.entityType, fieldKey: field.fieldKey } },
      update: { label: field.label, options: field.options ?? null },
      create: { ...field, options: field.options ?? null, isActive: true },
    });
  }
  console.log('✅ Seeded custom field definitions');

  // ─── Quote Settings ───────────────────────────────────────────────────────
  const quoteCount = await prisma.quoteSettings.count();
  if (quoteCount === 0) {
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
        defaultNotes: 'Thank you for choosing Apex Consulting & Surveying, Inc.',
        defaultTerms: 'Payment due within 30 days of invoice date.',
        accentColor: '#1d4ed8',
        showTaxLine: true,
        showDiscountLine: false,
        showSignatureBlock: true,
        enableLeadIntegration: true,
      },
    });
  } else {
    await prisma.quoteSettings.updateMany({
      data: { companyName: 'Apex Consulting & Surveying, Inc.', quoteNumberPrefix: 'ACS-', accentColor: '#1d4ed8' },
    });
  }
  console.log('✅ Seeded quote settings');

  // ─── Lead Form ────────────────────────────────────────────────────────────
  await prisma.leadForm.upsert({
    where: { apiKey: 'apex-project-inquiry-form' },
    update: {},
    create: {
      name: 'Apex Project Inquiry',
      description: 'Default lead capture form for new project inquiries.',
      apiKey: 'apex-project-inquiry-form',
      targetStage: 'Inquiry',
      isActive: true,
      fields: [
        { key: 'contactName', label: 'Full Name', type: 'text', required: true, placeholder: 'Jane Smith' },
        { key: 'company', label: 'Company / Organization', type: 'text', required: false },
        { key: 'email', label: 'Email Address', type: 'email', required: true },
        { key: 'phone', label: 'Phone Number', type: 'tel', required: false },
        { key: 'serviceType', label: 'Project Type', type: 'select', required: true, options: ['Topographic Survey', 'Boundary Survey', 'Construction Engineering', 'Construction Staking', 'Engineering Services', 'Other'] },
        { key: 'county', label: 'County', type: 'select', required: false, options: ['Allen', 'Whitley', 'DeKalb', 'Wells', 'Adams', 'Huntington', 'Wabash', 'Kosciusko', 'Noble', 'Lagrange', 'Steuben', 'Other'] },
        { key: 'notes', label: 'Project Description', type: 'textarea', required: false },
      ],
    },
  });
  console.log('✅ Seeded lead form');

  // ─── File Categories ──────────────────────────────────────────────────────
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

  // ─── Users ────────────────────────────────────────────────────────────────
  const users = [
    { email: 'adujoel67+nana@gmail.com', name: 'Nana Opoku', role: 'CEO' },
    { email: 'adujoel67+parker@gmail.com', name: 'Parker Zurbuch', role: 'PROJECT_MANAGER' },
    { email: 'adujoel67+frank@gmail.com', name: 'Frank McCutcheon', role: 'PROJECT_MANAGER' },
    { email: 'adujoel67+cody@gmail.com', name: 'Cody Hepler', role: 'PROJECT_MANAGER' },
    { email: 'adujoel67+mo@gmail.com', name: 'Mo Idris', role: 'SURVEY_CREW_CHIEF' },
    { email: 'adujoel67+nelva@gmail.com', name: 'Nelva', role: 'SURVEY_CREW_CHIEF' },
    { email: 'adujoel67+conner@gmail.com', name: 'Conner Dodd', role: 'SURVEY_CREW_CHIEF' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, password: hashedPassword, name: u.name, role: u.role, status: 'Active', isEmailVerified: true },
    });
  }
  console.log('✅ Seeded 7 users');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Seed complete — all passwords: Pass123$1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  adujoel67+nana@gmail.com   CEO');
  console.log('  adujoel67+parker@gmail.com PROJECT_MANAGER');
  console.log('  adujoel67+frank@gmail.com  PROJECT_MANAGER');
  console.log('  adujoel67+cody@gmail.com   PROJECT_MANAGER');
  console.log('  adujoel67+mo@gmail.com     SURVEY_CREW_CHIEF');
  console.log('  adujoel67+nelva@gmail.com  SURVEY_CREW_CHIEF');
  console.log('  adujoel67+conner@gmail.com SURVEY_CREW_CHIEF');
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
