export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Leads
  { key: 'leads:view', label: 'View Leads', module: 'Leads' },
  { key: 'leads:view_all', label: 'View All Leads (not just assigned)', module: 'Leads' },
  { key: 'leads:create', label: 'Create Leads', module: 'Leads' },
  { key: 'leads:edit', label: 'Edit Leads', module: 'Leads' },
  { key: 'leads:move_stage', label: 'Move Lead Stage', module: 'Leads' },
  { key: 'leads:delete', label: 'Delete Leads', module: 'Leads' },
  {
    key: 'leads:analyze',
    label: 'Analyze Leads (AI)',
    module: 'Leads',
  },

  // Clients
  { key: 'clients:view', label: 'View Clients', module: 'Clients' },
  { key: 'clients:view_all', label: 'View All Clients (not just assigned)', module: 'Clients' },
  {
    key: 'clients:create',
    label: 'Create Clients',
    module: 'Clients',
  },
  { key: 'clients:edit', label: 'Edit Clients', module: 'Clients' },
  {
    key: 'clients:delete',
    label: 'Delete Clients',
    module: 'Clients',
  },
  {
    key: 'clients:health',
    label: 'Health Reports (AI)',
    module: 'Clients',
  },
  {
    key: 'clients:upsell',
    label: 'Upsell Strategy (AI)',
    module: 'Clients',
  },
  {
    key: 'clients:convert',
    label: 'Convert Leads to Clients',
    module: 'Clients',
  },

  // Projects
  {
    key: 'projects:view',
    label: 'View Projects',
    module: 'Projects',
  },
  {
    key: 'projects:view_all',
    label: 'View All Projects (not just assigned)',
    module: 'Projects',
  },
  {
    key: 'projects:create',
    label: 'Create Projects',
    module: 'Projects',
  },
  {
    key: 'projects:edit',
    label: 'Edit Projects',
    module: 'Projects',
  },
  {
    key: 'projects:move_stage',
    label: 'Move Project Status',
    module: 'Projects',
  },
  {
    key: 'projects:delete',
    label: 'Delete Projects',
    module: 'Projects',
  },
  {
    key: 'projects:view_financials',
    label: 'View Project Financials (cost, margin, profit)',
    module: 'Projects',
  },

  // Costs
  { key: 'costs:view', label: 'View Cost Logs', module: 'Costs' },
  { key: 'costs:create', label: 'Create Cost Logs', module: 'Costs' },
  { key: 'costs:delete', label: 'Delete Cost Logs', module: 'Costs' },

  // Time Tracking
  { key: 'time_tracking:view', label: 'View Time Entries', module: 'Time Tracking' },
  { key: 'time_tracking:create', label: 'Create Time Entries', module: 'Time Tracking' },
  { key: 'time_tracking:edit', label: 'Edit Time Entries', module: 'Time Tracking' },
  { key: 'time_tracking:manage_all', label: 'Manage All Users\' Time Entries', module: 'Time Tracking' },
  { key: 'time_tracking:enter_for_others', label: 'Enter Time on Behalf of Another User', module: 'Time Tracking' },

  // Bottleneck Analytics
  { key: 'bottleneck:view', label: 'View Bottleneck Analytics', module: 'Bottleneck Analytics' },

  // Teams
  { key: 'teams:view', label: 'View Teams', module: 'Teams' },
  { key: 'teams:create', label: 'Create Teams', module: 'Teams' },
  { key: 'teams:edit', label: 'Edit Teams', module: 'Teams' },
  { key: 'teams:delete', label: 'Delete Teams', module: 'Teams' },
  {
    key: 'teams:manage_members',
    label: 'Manage Team Members',
    module: 'Teams',
  },
  {
    key: 'teams:be_manager',
    label: 'Can Be Assigned as Team Manager',
    module: 'Teams',
  },

  // Users
  { key: 'users:list_basic', label: 'View User Directory (for dropdowns/assignment)', module: 'Users' },
  { key: 'users:view', label: 'View Users (Admin Panel)', module: 'Users' },
  { key: 'users:create', label: 'Create Users', module: 'Users' },
  { key: 'users:edit', label: 'Edit Users', module: 'Users' },
  { key: 'users:delete', label: 'Delete Users', module: 'Users' },

  // Roles
  { key: 'roles:view', label: 'View Roles', module: 'Roles' },
  { key: 'roles:create', label: 'Create Roles', module: 'Roles' },
  { key: 'roles:edit', label: 'Edit Roles', module: 'Roles' },
  { key: 'roles:delete', label: 'Delete Roles', module: 'Roles' },

  // AI Settings
  {
    key: 'ai_settings:view',
    label: 'View AI Settings',
    module: 'AI Settings',
  },
  {
    key: 'ai_settings:edit',
    label: 'Edit AI Settings',
    module: 'AI Settings',
  },

  // Audit Logs
  {
    key: 'audit_logs:view',
    label: 'View Audit Logs',
    module: 'Audit Logs',
  },

  // Permissions
  {
    key: 'permissions:view',
    label: 'View Permissions',
    module: 'Permissions',
  },
  {
    key: 'permissions:edit',
    label: 'Edit Permissions',
    module: 'Permissions',
  },

  // Pipeline
  {
    key: 'pipeline:manage',
    label: 'Manage Pipeline Stages',
    module: 'Pipeline',
  },

  // Reports
  { key: 'reports:view', label: 'View Reports', module: 'Reports' },
  {
    key: 'reports:export',
    label: 'Export Reports',
    module: 'Reports',
  },
  {
    key: 'reports:view_all',
    label: 'View All Reps in Reports (not just own team)',
    module: 'Reports',
  },

  // Pay Grades
  { key: 'pay_grades:view', label: 'View Pay Grades', module: 'Pay Grades' },
  { key: 'pay_grades:manage', label: 'Manage Pay Grades (create/edit/delete)', module: 'Pay Grades' },

  // Pay Rates
  { key: 'pay_rates:view', label: 'View Pay Rates', module: 'Pay Rates' },
  { key: 'pay_rates:manage', label: 'Manage Pay Rates (set/edit/delete)', module: 'Pay Rates' },

  // INDOT Pay Zones
  { key: 'indot_zones:view', label: 'View INDOT Pay Zones', module: 'INDOT Pay Zones' },
  { key: 'indot_zones:manage', label: 'Manage INDOT Pay Zones (create/edit/delete)', module: 'INDOT Pay Zones' },

  // Settings
  {
    key: 'settings:manage',
    label: 'Manage Settings (Service Types etc.)',
    module: 'Settings',
  },
  {
    key: 'settings:view',
    label: 'View Tenant Settings',
    module: 'Settings',
  },
  {
    key: 'settings:edit',
    label: 'Edit Tenant Settings',
    module: 'Settings',
  },

  // Tasks
  { key: 'tasks:view', label: 'View Tasks', module: 'Tasks' },
  { key: 'tasks:create', label: 'Create Tasks', module: 'Tasks' },
  { key: 'tasks:edit', label: 'Edit Tasks', module: 'Tasks' },
  { key: 'tasks:edit_all', label: 'Edit All Tasks (not just own)', module: 'Tasks' },
  { key: 'tasks:delete', label: 'Delete Tasks', module: 'Tasks' },
  {
    key: 'tasks:view_all',
    label: 'View All Tasks (not just own)',
    module: 'Tasks',
  },
  {
    key: 'tasks:assign',
    label: 'Assign Tasks to Other Users',
    module: 'Tasks',
  },

  // Notifications
  { key: 'notifications:view', label: 'View Notifications', module: 'Notifications' },

  // Quotes
  { key: 'quotes:view', label: 'View Quotes', module: 'Quotes' },
  { key: 'quotes:create', label: 'Create Quotes', module: 'Quotes' },
  { key: 'quotes:edit', label: 'Edit Quotes', module: 'Quotes' },
  { key: 'quotes:delete', label: 'Delete Quotes', module: 'Quotes' },

  // QuickBooks
  {
    key: 'quickbooks:manage',
    label: 'Manage QuickBooks Connection',
    module: 'QuickBooks',
  },
  {
    key: 'quickbooks:sync',
    label: 'Trigger QuickBooks Sync',
    module: 'QuickBooks',
  },
  {
    key: 'quickbooks:invoices',
    label: 'Create QuickBooks Invoices',
    module: 'QuickBooks',
  },

  // Workflows
  {
    key: 'workflows:view',
    label: 'View Workflows',
    module: 'Workflows',
  },
  {
    key: 'workflows:create',
    label: 'Create Workflows',
    module: 'Workflows',
  },
  {
    key: 'workflows:edit',
    label: 'Edit Workflows',
    module: 'Workflows',
  },
  {
    key: 'workflows:delete',
    label: 'Delete Workflows',
    module: 'Workflows',
  },

  // Calendar
  {
    key: 'calendar:advanced_filters',
    label: 'Filter Calendar by Project & Assignee',
    module: 'Calendar',
  },
];

// Default permissions for seeded Apex roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  CEO: ALL_PERMISSIONS.map((p) => p.key), // CEO gets everything
  ADMIN: [
    'leads:view',
    'leads:view_all',
    'leads:create',
    'leads:edit',
    'leads:move_stage',
    'leads:delete',
    'leads:analyze',
    'clients:view',
    'clients:view_all',
    'clients:create',
    'clients:edit',
    'clients:delete',
    'clients:health',
    'reports:view_all',
    'tasks:view_all',
    'tasks:assign',
    'clients:upsell',
    'clients:convert',
    'projects:view',
    'projects:view_all',
    'projects:create',
    'projects:edit',
    'projects:move_stage',
    'projects:delete',
    'projects:view_financials',
    'costs:view',
    'costs:create',
    'costs:delete',
    'time_tracking:view',
    'time_tracking:create',
    'time_tracking:edit',
    'time_tracking:manage_all',
    'time_tracking:enter_for_others',
    'bottleneck:view',
    'teams:view',
    'teams:create',
    'teams:edit',
    'teams:delete',
    'teams:manage_members',
    'teams:be_manager',
    'users:list_basic',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'roles:view',
    'roles:create',
    'roles:edit',
    'roles:delete',
    'ai_settings:view',
    'ai_settings:edit',
    'audit_logs:view',
    'permissions:view',
    'permissions:edit',
    'pipeline:manage',
    'reports:view',
    'reports:export',
    'pay_grades:view',
    'pay_grades:manage',
    'pay_rates:view',
    'pay_rates:manage',
    'indot_zones:view',
    'indot_zones:manage',
    'settings:manage',
    'settings:view',
    'settings:edit',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:edit_all',
    'tasks:delete',
    'notifications:view',
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'workflows:view',
    'workflows:create',
    'workflows:edit',
    'workflows:delete',
    'quickbooks:manage',
    'quickbooks:sync',
    'quickbooks:invoices',
    'calendar:advanced_filters',
  ],
  PROJECT_MANAGER: [
    'leads:view',
    'leads:view_all',
    'leads:create',
    'leads:edit',
    'leads:move_stage',
    'leads:delete',
    'leads:analyze',
    'clients:view',
    'clients:view_all',
    'clients:create',
    'clients:edit',
    'clients:delete',
    'clients:health',
    'clients:upsell',
    'clients:convert',
    'projects:view',
    'projects:view_all',
    'projects:create',
    'projects:edit',
    'projects:move_stage',
    'projects:delete',
    'projects:view_financials',
    'costs:view',
    'costs:create',
    'costs:delete',
    'time_tracking:view',
    'time_tracking:create',
    'time_tracking:edit',
    'time_tracking:manage_all',
    'time_tracking:enter_for_others',
    'bottleneck:view',
    'tasks:view',
    'tasks:view_all',
    'tasks:create',
    'tasks:edit',
    'tasks:edit_all',
    'tasks:delete',
    'tasks:assign',
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'reports:view',
    'reports:export',
    'reports:view_all',
    'workflows:view',
    'pay_grades:view',
    'pay_rates:view',
    'indot_zones:view',
    'settings:view',
    'notifications:view',
    'users:list_basic',
    'users:view',
    'roles:view',
    'teams:view',
    'teams:manage_members',
    'teams:be_manager',
    'calendar:advanced_filters',
  ],
  SURVEY_CREW_CHIEF: [
    'projects:view',
    'tasks:view',
    'tasks:create',
    'tasks:edit',
    'tasks:assign',
    'users:list_basic',
    'time_tracking:view',
    'time_tracking:create',
    'notifications:view',
  ],
};

// Permissions that unlock access to at least one admin panel section.
// Used by the admin layout to gate the entire admin area.
export const ADMIN_PANEL_PERMISSIONS = [
  'users:view',
  'roles:view',
  'settings:view',
  'settings:manage',
  'pay_grades:view',
  'pay_rates:view',
  'indot_zones:view',
  'permissions:view',
  'audit_logs:view',
  'ai_settings:view',
] as const;
