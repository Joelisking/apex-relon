// Role-based access control
export enum Role {
  CEO = 'CEO',
  ADMIN = 'ADMIN',
  BDM = 'BDM',
  SALES = 'SALES',
  DESIGNER = 'DESIGNER',
  QS = 'QS',
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  serviceTypes?: ServiceType[];
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { leads: number; projects: number };
}

export interface TaskType {
  id: string;
  name: string;
  description?: string | null;
  serviceTypeId?: string | null;
  serviceType?: { id: string; name: string } | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { tasks: number };
}

export interface ServiceItemRoleEstimate {
  id: string;
  subtaskId: string;
  role: string;
  estimatedHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItemSubtask {
  id: string;
  serviceItemId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  roleEstimates: ServiceItemRoleEstimate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  serviceTypeId?: string | null;
  serviceType?: { id: string; name: string } | null;
  unit?: string | null;
  defaultPrice?: number | null;
  qbItemId?: string | null;
  isActive: boolean;
  sortOrder: number;
  subtasks: ServiceItemSubtask[];
  createdAt?: string;
  updatedAt?: string;
  _count?: { quoteLineItems: number; timeEntries: number };
}

export interface DropdownOption {
  id: string;
  category: string;
  value: string;
  label: string;
  metadata?: Record<string, unknown> | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Categories available in the dropdown options system */
export type DropdownCategory =
  | 'urgency'
  | 'activity_type'
  | 'meeting_type'
  | 'file_category'
  | 'cost_category'
  | 'client_segment'
  | 'client_industry'
  | 'county'
  | 'individual_type'
  | 'project_status'
  | 'project_risk_status'
  | 'lead_source';

export interface LeadRep {
  id: string;
  leadId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Pipeline stages for lead management
export enum PipelineStage {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  WON = 'Won',
  LOST = 'Lost',
}

// Lead risk levels
export enum LeadRisk {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  AT_RISK = 'At Risk',
}

// Activity types
export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'status_change';

export interface Activity {
  id: string;
  type: ActivityType;
  content: string;
  timestamp: string;
  user: string;
}

export interface FileUpload {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  trendUp: boolean;
}

// AI Response Types
export interface ExecutiveSummaryResponse {
  summary: string;
  flags: string[];
}

export interface LeadRiskAnalysis {
  riskLevel: string;
  summary: string;
  recommendations: string[];
}

export interface ClientHealthReport {
  healthScore: number;
  summary: string;
  recommendations: string[];
}

export interface UpsellStrategy {
  approach: string;
  timing?: string;
  opportunities: Array<{
    service: string;
    rationale: string;
    estimatedValue: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}

// Lead interface matching backend schema
export interface Lead {
  id: string;
  contactName: string;
  company: string;
  email?: string;
  phone?: string;
  expectedValue: number;
  contractedValue?: number | null;
  projectName?: string | null;
  stage: string;
  serviceTypeId?: string | null;
  serviceType?: ServiceType | null;
  categoryIds?: string[];
  serviceTypeIds?: string[];
  county?: string[];
  urgency: string;
  source: string;
  likelyStartDate?: string | Date | null;
  notes?: string | null;
  aiRiskLevel?: string | null;
  aiSummary?: string | null;
  aiRecommendations?: string | null;

  // Assignment
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  // Team members
  teamMembers?: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string; role: string };
  }>;

  // Client relationship (for repeat business)
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Conversion tracking
  convertedToClientId?: string | null;

  // Time tracking
  quoteSentAt?: string | Date | null;
  dealClosedAt?: string | Date | null;

  // Stage history
  stageHistory?: Array<{
    id: string;
    fromStage: string | null;
    toStage: string;
    createdAt: string;
    user: { name: string };
  }>;

  // Metrics and risk flags
  metrics?: {
    daysInPipeline: number;
    daysSinceLastContact: number;
    activityCount: number;
    fileCount: number;
    stageTimeline?: Array<{
      stage: string;
      enteredAt: string;
      daysSpent: number;
      changedBy?: string;
    }>;
  };
  riskFlags?: Array<{
    type:
      | 'NO_CONTACT'
      | 'LONG_PIPELINE'
      | 'HIGH_VALUE_STALE'
      | 'NO_ACTIVITY';
    severity: 'low' | 'medium' | 'high';
    message: string;
    icon: string;
  }>;
  suggestedActions?: string[];

  // Legacy fields for backward compatibility
  name?: string;
  activities?: Activity[];
  uploads?: FileUpload[];
  aiRiskFlag?: LeadRisk;
}

// Client metrics and health flags
export interface ClientMetrics {
  daysSinceLastContact: number;
  totalActivityCount: number;
  recentActivityCount: number;
  totalProjectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  totalRevenue: number;
  recentRevenue: number;
  avgProjectValue: number;
  engagementScore: number;
}

export interface ClientHealthFlag {
  type:
    | 'NO_CONTACT'
    | 'DECLINING_ENGAGEMENT'
    | 'HIGH_VALUE_AT_RISK'
    | 'STRONG_RELATIONSHIP';
  severity: 'low' | 'medium' | 'high' | 'positive';
  message: string;
  icon: string;
}

export interface CostLog {
  id: string;
  projectId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  user?: { id: string; name: string };
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  jobNumber?: string | null;
  clientId?: string;
  client?: { id: string; name: string };
  leadId?: string;
  lead?: { id: string; contactName: string; company: string };
  status: string;
  contractedValue: number;
  endOfProjectValue?: number;
  startDate?: string;
  completedDate?: string;
  description?: string;
  estimatedDueDate?: string;
  closedDate?: string;
  riskStatus?: string;
  estimatedRevenue?: number;
  totalCost?: number;
  serviceTypeId?: string | null;
  serviceType?: { id: string; name: string } | null;
  county?: string[];
  projectManagerId?: string;
  projectManager?: {
    id: string;
    name: string;
    email: string;
  };
  designerId?: string | null;
  designer?: { id: string; name: string; email: string } | null;
  qsId?: string | null;
  qs?: { id: string; name: string; email: string } | null;
  costLogs?: CostLog[];
  createdAt?: string;
  updatedAt?: string;
}

// Client interface matching backend schema
export interface Client {
  id: string;
  name: string;

  // Contact Information
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;

  // Individual Contact
  individualName?: string | null;
  individualType?: string | null;

  // Classification
  segment: string;
  industry: string;
  county?: string | null;

  // Financial
  lifetimeRevenue: number;
  qbCustomerId?: string | null;

  // Health Status
  status: string;
  healthScore?: number | null;
  aiHealthSummary?: string | null;
  aiUpsellStrategy?: string | null;

  // Status Management
  statusOverride?: boolean;
  statusOverrideReason?: string | null;
  statusLastCalculated?: string | Date | null;

  // Engagement Metrics
  lastContactDate?: string | Date | null;
  totalProjectCount?: number;
  activeProjectCount?: number;

  // Assignment
  accountManagerId?: string | null;
  accountManager?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  // Relationships
  contacts?: Array<{ firstName: string; lastName: string; email?: string | null; phone?: string | null }>;
  projects?: Project[];
  convertedFromLead?: {
    id: string;
    contactName: string;
    company: string;
    value: number;
    stage: string;
  } | null;
  metrics?: ClientMetrics;
  healthFlags?: ClientHealthFlag[];
  suggestedActions?: string[];

  _count?: { activities: number };

  isDeleted?: boolean;
  deletedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Legacy fields for backward compatibility
  totalRevenue?: number;
  lastInteraction?: string;
  uploads?: FileUpload[];
}

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;

  // Team and hierarchy
  teamName?: string | null; // Deprecated
  teamId?: string | null;
  team?: {
    id: string;
    name: string;
  } | null;

  managerId?: string | null;
  manager?: {
    name: string;
    email: string;
  } | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  type: string;
  managerId?: string | null;
  manager?: User | null;
  members?: User[];
  _count?: {
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalRevenue: number;
  pipelineValue: number;
  activeClients: number;
  activeLeads: number;
  conversionRate: string;
  avgDealSize: number;
}

// AI Settings
export interface AISettings {
  id: string;
  defaultProvider: string;
  leadRiskProvider?: string | null;
  clientHealthProvider?: string | null;
  executiveSummaryProvider?: string | null;
  chatProvider?: string | null;

  // API Keys (encrypted/masked)
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
  anthropicKeyValid: boolean;
  openaiKeyValid: boolean;
  geminiKeyValid: boolean;

  // Customizable AI Prompts
  leadRiskPrompt?: string | null;
  clientHealthPrompt?: string | null;
  executiveSummaryPrompt?: string | null;
  upsellPrompt?: string | null;
  chatPrompt?: string | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Storage info (returned by backend)
  storageInfo?: {
    apiKeys: string;
    prompts: string;
    encryptionMethod: string;
  };
}

export interface APIKeyStatus {
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
}

export interface TenantSettings {
  id: string;
  clientDisplayMode: 'COMPANY' | 'CONTACT';
  bottleneckStuckDays: number;
  bottleneckCriticalStageDays: number;
  createdAt?: string;
  updatedAt?: string;
}

// Permissions
export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export interface PermissionMatrix {
  permissions: PermissionDefinition[];
  roles: string[];
  matrix: Record<string, string[]>;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

// ────────────────────────────────────────────
// P1 Feature Types
// ────────────────────────────────────────────

// Task Management
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: string;
  status: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdById: string;
  createdBy?: { id: string; name: string; email: string } | null;
  completedAt?: string | null;
  reminderAt?: string | null;
  taskTypeId?: string | null;
  taskType?: { id: string; name: string } | null;
  completionNote?: string | null;
  uncompleteReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  total: number;
}

export interface MemberTaskSummary extends TaskSummary {
  id: string;
  name: string;
  role: string;
  teamName?: string | null;
}

export interface TeamTaskSummary {
  team: TaskSummary;
  members: MemberTaskSummary[];
}

// Notification System
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: {
    actorId?: string;
    actorName?: string;
    parentName?: string;
  } | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}
export interface NotificationPreference {
  id: string;
  userId: string;
  taskAssigned: boolean;
  taskDue: boolean;
  taskOverdue: boolean;
  leadStale: boolean;
  leadStageChanged: boolean;
  projectAtRisk: boolean;
  clientDormant: boolean;
  emailDigest: boolean;
}

// Custom Fields
export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  URL = 'URL',
}

export interface CustomFieldDefinition {
  id: string;
  entityType: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  options?: string[] | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  definitionId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  value: string | number | boolean | string[] | null;
}

// Quote & Proposal Builder
export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface QuoteLineItem {
  id?: string;
  quoteId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  lineTotal: number;
  sortOrder: number;
  serviceItemId?: string | null;
}

export interface Quote {
  id: string;
  quoteNumber: number;
  leadId?: string | null;
  lead?: {
    id: string;
    contactName: string;
    company: string;
    email?: string;
    stage?: string;
  } | null;
  clientId?: string | null;
  client?: { id: string; name: string; email?: string } | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  status: string;
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string; email: string } | null;
  lineItems: QuoteLineItem[];
  qbInvoiceId?: string | null;
  qbPaymentStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  defaultPrice: number;
  unit?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteSettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  logoUrl?: string;
  quoteNumberPrefix: string;
  defaultTaxRate: number;
  defaultValidityDays: number;
  defaultCurrency: string;
  defaultNotes: string;
  defaultTerms: string;
  accentColor: string;
  showTaxLine: boolean;
  showDiscountLine: boolean;
  showSignatureBlock: boolean;
  enableLeadIntegration: boolean;
}

// ────────────────────────────────────────────
// Web-to-Lead Capture Forms
// ────────────────────────────────────────────

export interface FormFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface LeadForm {
  id: string;
  name: string;
  description?: string | null;
  fields: FormFieldDefinition[];
  targetStage: string;
  assignToUserId?: string | null;
  assignTo?: { id: string; name: string; email: string } | null;
  apiKey: string;
  isActive: boolean;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { submissions: number };
}

export interface LeadFormAnalytics {
  totalSubmissions: number;
  wonLeads: number;
  conversionRate: number;
  dailySubmissions: Array<{ date: string; count: number }>;
}

export interface CreateLeadFormDto {
  name: string;
  description?: string;
  fields: FormFieldDefinition[];
  targetStage: string;
  assignToUserId?: string;
  isActive?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateLeadFormDto extends Partial<CreateLeadFormDto> {}

// Contact Management
export interface Contact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  linkedInUrl?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  client?: { id: string; name: string };
  leads?: Array<{ leadId: string; lead?: { id: string; contactName: string; company: string } }>;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  linkedInUrl?: string;
  isPrimary?: boolean;
  isDecisionMaker?: boolean;
  notes?: string;
}

export type UpdateContactDto = Partial<CreateContactDto>;

// Workflow Automation
export interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  isActive: boolean;
  createdById: string;
  createdBy?: { id: string; name: string; email: string } | null;
  executions?: WorkflowExecution[];
  _count?: { executions: number };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  entityType: string;
  entityId: string;
  result: string;
  details?: Record<string, unknown> | null;
  executedAt: string;
}
