import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateJobTypeDto, CreateDivisionDto } from './dto/create-service-type.dto';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import {
  CreateDropdownOptionDto,
  UpdateDropdownOptionDto,
} from './dto/dropdown-option.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await Promise.all([
      this.seedTeamTypes(),
      this.seedClientSegments(),
      this.seedIndividualTypes(),
      this.seedClientIndustries(),
      this.seedLeadSources(),
      this.seedUrgencyLevels(),
      this.seedProjectRiskStatus(),
      this.seedServiceCategories(),
      this.seedCounties(),
      this.seedPayGrades(),
    ]);
    // Run after categories/types are seeded (sequential, not parallel)
    await this.seedServiceItemPhases();
  }

  private async seedTeamTypes() {
    const TEAM_TYPES = [
      { value: 'SALES', label: 'Sales', sortOrder: 0 },
      { value: 'DESIGN', label: 'Design', sortOrder: 1 },
      { value: 'OPERATIONS', label: 'Operations', sortOrder: 2 },
      { value: 'SUPPORT', label: 'Support', sortOrder: 3 },
      { value: 'FINANCE', label: 'Finance', sortOrder: 4 },
      { value: 'MARKETING', label: 'Marketing', sortOrder: 5 },
      { value: 'OTHER', label: 'Other', sortOrder: 6 },
    ];

    // Fast-path: skip the upsert loop when all team type entries are already present.
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'team_type' },
    });
    if (existingCount >= TEAM_TYPES.length) {
      this.logger.log(
        `Team type dropdown options already seeded (${existingCount} entries). Skipping.`,
      );
      return;
    }

    let added = 0;
    for (const type of TEAM_TYPES) {
      await this.prisma.dropdownOption.upsert({
        where: {
          category_value: {
            category: 'team_type',
            value: type.value,
          },
        },
        update: {},
        create: {
          category: 'team_type',
          value: type.value,
          label: type.label,
          sortOrder: type.sortOrder,
          isSystem: true,
          isActive: true,
        },
      });
      added++;
    }
    this.logger.log(
      `Team type dropdown options ensured (${added} entries).`,
    );
  }

  private async seedClientSegments() {
    const OPTIONS = [
      { value: 'government_agency', label: 'Government Agency', sortOrder: 0 },
      { value: 'contractor', label: 'Contractor', sortOrder: 1 },
      { value: 'ae_firm', label: 'A/E Firm', sortOrder: 2 },
      { value: 'private_owner', label: 'Private Owner', sortOrder: 3 },
      { value: 'developer', label: 'Developer', sortOrder: 4 },
      { value: 'professional_services', label: 'Professional Services', sortOrder: 5 },
      { value: 'utility_services', label: 'Utility / Services', sortOrder: 6 },
    ];
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'client_segment', value: opt.value } },
        update: {},
        create: { category: 'client_segment', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Client segment dropdown options ensured.');
  }

  private async seedIndividualTypes() {
    const OPTIONS = [
      { value: 'owner', label: 'Owner', sortOrder: 0 },
      { value: 'director', label: 'Director', sortOrder: 1 },
      { value: 'project_manager', label: 'Project Manager', sortOrder: 2 },
      { value: 'engineer', label: 'Engineer', sortOrder: 3 },
      { value: 'architect', label: 'Architect', sortOrder: 4 },
      { value: 'contractor', label: 'Contractor', sortOrder: 5 },
      { value: 'other', label: 'Other', sortOrder: 6 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'individual_type' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'individual_type', value: opt.value } },
        update: {},
        create: { category: 'individual_type', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Individual type dropdown options ensured.');
  }

  private async seedClientIndustries() {
    const OPTIONS = [
      { value: 'government', label: 'Government', sortOrder: 0 },
      { value: 'construction', label: 'Construction', sortOrder: 1 },
      { value: 'real_estate', label: 'Real Estate', sortOrder: 2 },
      { value: 'utilities', label: 'Utilities', sortOrder: 3 },
      { value: 'transportation', label: 'Transportation / INDOT', sortOrder: 4 },
      { value: 'telecommunications', label: 'Telecommunications', sortOrder: 5 },
      { value: 'engineering', label: 'Engineering', sortOrder: 6 },
      { value: 'environmental', label: 'Environmental', sortOrder: 7 },
      { value: 'legal', label: 'Legal', sortOrder: 8 },
      { value: 'agriculture', label: 'Agriculture', sortOrder: 9 },
      { value: 'other', label: 'Other', sortOrder: 10 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'client_industry' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'client_industry', value: opt.value } },
        update: {},
        create: { category: 'client_industry', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Client industry dropdown options ensured.');
  }

  private async seedLeadSources() {
    const OPTIONS = [
      { value: 'referral', label: 'Referral', sortOrder: 0 },
      { value: 'repeat_client', label: 'Repeat Client', sortOrder: 1 },
      { value: 'indot', label: 'INDOT / Government', sortOrder: 2 },
      { value: 'website', label: 'Website / Online', sortOrder: 3 },
      { value: 'cold_call', label: 'Cold Call', sortOrder: 4 },
      { value: 'bid_board', label: 'Bid Board', sortOrder: 5 },
      { value: 'networking', label: 'Networking / Event', sortOrder: 6 },
      { value: 'other', label: 'Other', sortOrder: 7 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'lead_source' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'lead_source', value: opt.value } },
        update: {},
        create: { category: 'lead_source', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Lead source dropdown options ensured.');
  }

  private async seedUrgencyLevels() {
    const OPTIONS = [
      { value: 'low', label: 'Low', sortOrder: 0 },
      { value: 'medium', label: 'Medium', sortOrder: 1 },
      { value: 'high', label: 'High', sortOrder: 2 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'urgency' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'urgency', value: opt.value } },
        update: {},
        create: { category: 'urgency', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Urgency level dropdown options ensured.');
  }

  private async seedProjectRiskStatus() {
    const OPTIONS = [
      { value: 'On Track', label: 'On Track', sortOrder: 1 },
      { value: 'At Risk', label: 'At Risk', sortOrder: 2 },
      { value: 'Blocked', label: 'Blocked', sortOrder: 3 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'project_risk_status' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'project_risk_status', value: opt.value } },
        update: {},
        create: { category: 'project_risk_status', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Project risk status dropdown options ensured.');
  }

  // ── Service Categories ─────────────────────────────────────────────────────

  private async seedServiceCategories() {
    const CATEGORIES = [
      { name: 'Surveying', description: 'Land survey, boundary, topo, and related field work', sortOrder: 0 },
      { name: 'Engineering', description: 'Construction engineering, stormwater, design, and inspection services', sortOrder: 1 },
    ];

    const SERVICE_TYPES_BY_CATEGORY: Record<string, Array<{ name: string; description: string; sortOrder: number }>> = {
      Surveying: [
        { name: 'Topographic Survey', description: 'Topo maps, elevation data, CAD', sortOrder: 0 },
        { name: 'Boundary Survey', description: 'Property boundary determination and marking', sortOrder: 1 },
        { name: 'Lot Survey', description: 'Residential lot surveys, PP/HS/Final', sortOrder: 2 },
        { name: 'ALTA/NSPS Survey', description: 'Title survey for commercial transactions', sortOrder: 3 },
        { name: 'Construction Staking', description: 'Layout, staking for construction', sortOrder: 4 },
        { name: 'Plot Plan & House Stake', description: 'Plot plans, house stakes, finals', sortOrder: 5 },
        { name: 'As-Built Survey', description: 'Post-construction as-built documentation', sortOrder: 6 },
        { name: 'Subdivision Plat', description: 'Subdivision design and recorded plats', sortOrder: 7 },
        { name: 'Drone Survey', description: 'Aerial survey and mapping', sortOrder: 8 },
        { name: 'Right-of-Way Engineering', description: 'ROW plans, legal descriptions, staking', sortOrder: 9 },
        { name: 'LCRS', description: 'Location control route surveys', sortOrder: 10 },
        { name: 'Easement Preparation', description: 'Easement exhibits, legal descriptions', sortOrder: 11 },
      ],
      Engineering: [
        { name: 'Construction Engineering', description: 'CE, project oversight during construction', sortOrder: 0 },
        { name: 'Construction Inspection', description: 'On-site inspection services', sortOrder: 1 },
        { name: 'Stormwater / SWQCP', description: 'Stormwater quality control plans, monitoring', sortOrder: 2 },
        { name: 'Engineering / Design', description: 'Site design, engineering analysis, utility design', sortOrder: 3 },
      ],
    };

    const existingCount = await this.prisma.division.count();
    if (existingCount >= CATEGORIES.length) {
      this.logger.log(`Divisions already seeded (${existingCount} entries). Skipping.`);
      return;
    }

    for (const cat of CATEGORIES) {
      const division = await this.prisma.division.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
      });

      for (const st of SERVICE_TYPES_BY_CATEGORY[cat.name] ?? []) {
        await this.prisma.jobType.upsert({
          where: { name: st.name },
          update: { divisionId: division.id },
          create: { name: st.name, description: st.description, sortOrder: st.sortOrder, isActive: true, divisionId: division.id },
        });
      }
    }
    this.logger.log('Divisions and job types seeded.');
  }

  async findAllDivisions() {
    return this.prisma.division.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        jobTypes: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  async createDivision(dto: CreateDivisionDto) {
    return this.prisma.division.create({ data: dto });
  }

  async updateDivision(id: string, dto: Partial<CreateDivisionDto>) {
    const existing = await this.prisma.division.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Division with ID ${id} not found`);
    return this.prisma.division.update({ where: { id }, data: dto });
  }

  async deleteDivision(id: string) {
    const existing = await this.prisma.division.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Division with ID ${id} not found`);
    const typeCount = await this.prisma.jobType.count({ where: { divisionId: id } });
    if (typeCount > 0) {
      throw new BadRequestException(
        `Cannot delete division "${existing.name}" because it has ${typeCount} job type(s) assigned to it.`,
      );
    }
    return this.prisma.division.delete({ where: { id } });
  }

  // ── Job Types ──────────────────────────────────────────────────────────────

  async findAllJobTypes() {
    return this.prisma.jobType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        division: { select: { id: true, name: true } },
        _count: { select: { leads: true, projects: true } },
      },
    });
  }

  async createJobType(dto: CreateJobTypeDto) {
    return this.prisma.jobType.create({ data: dto });
  }

  async updateJobType(
    id: string,
    dto: Partial<CreateJobTypeDto>,
  ) {
    const existing = await this.prisma.jobType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Job type with ID ${id} not found`,
      );
    }
    return this.prisma.jobType.update({
      where: { id },
      data: dto,
    });
  }

  async deleteJobType(id: string) {
    const existing = await this.prisma.jobType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Job type with ID ${id} not found`,
      );
    }
    const [leadCount, projectCount] = await Promise.all([
      this.prisma.lead.count({ where: { jobTypeId: id } }),
      this.prisma.project.count({ where: { jobTypeId: id } }),
    ]);
    if (leadCount > 0 || projectCount > 0) {
      throw new BadRequestException(
        `Cannot delete job type "${existing.name}" because it is assigned to ${leadCount} lead(s) and ${projectCount} project(s).`,
      );
    }
    return this.prisma.jobType.delete({ where: { id } });
  }

  // ── Task Types ─────────────────────────────────────────────────────────────

  async findAllTaskTypes(jobTypeId?: string) {
    return this.prisma.taskType.findMany({
      where: jobTypeId ? { jobTypeId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        jobType: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async createTaskType(dto: CreateTaskTypeDto) {
    return this.prisma.taskType.create({ data: dto });
  }

  async updateTaskType(id: string, dto: Partial<CreateTaskTypeDto>) {
    const existing = await this.prisma.taskType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task type with ID ${id} not found`);
    }
    return this.prisma.taskType.update({ where: { id }, data: dto });
  }

  async deleteTaskType(id: string) {
    const existing = await this.prisma.taskType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task type with ID ${id} not found`);
    }
    const taskCount = await this.prisma.task.count({ where: { taskTypeId: id } });
    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete task type "${existing.name}" because it is assigned to ${taskCount} task(s).`,
      );
    }
    return this.prisma.taskType.delete({ where: { id } });
  }

  // ── Dropdown Options ───────────────────────────────────────────────────────

  async findDropdownOptions(category?: string) {
    return this.prisma.dropdownOption.findMany({
      where: {
        ...(category ? { category } : {}),
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findAllDropdownOptions() {
    return this.prisma.dropdownOption.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createDropdownOption(dto: CreateDropdownOptionDto) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: {
        category_value: { category: dto.category, value: dto.value },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `A dropdown option with value "${dto.value}" already exists in category "${dto.category}".`,
      );
    }
    return this.prisma.dropdownOption.create({
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateDropdownOption(
    id: string,
    dto: UpdateDropdownOptionDto,
  ) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Dropdown option with ID ${id} not found`,
      );
    }
    return this.prisma.dropdownOption.update({
      where: { id },
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteDropdownOption(id: string) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Dropdown option with ID ${id} not found`,
      );
    }
    if (existing.isSystem) {
      throw new BadRequestException(
        `Cannot delete system option "${existing.label}". You can disable it instead.`,
      );
    }
    return this.prisma.dropdownOption.delete({ where: { id } });
  }

  async reorderDropdownOptions(
    category: string,
    orderedIds: string[],
  ) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.dropdownOption.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  private async seedCounties() {
    const COUNTIES = [
      'Adams', 'Allen', 'Bartholomew', 'Benton', 'Blackford', 'Boone', 'Brown',
      'Carroll', 'Cass', 'Clark', 'Clay', 'Clinton', 'Crawford', 'Daviess',
      'DeKalb', 'Dearborn', 'Decatur', 'Delaware', 'Dubois', 'Elkhart',
      'Fayette', 'Floyd', 'Fountain', 'Franklin', 'Fulton', 'Gibson', 'Grant',
      'Greene', 'Hamilton', 'Hancock', 'Harrison', 'Hendricks', 'Henry',
      'Howard', 'Huntington', 'Jackson', 'Jasper', 'Jay', 'Jefferson',
      'Jennings', 'Johnson', 'Knox', 'Kosciusko', 'LaGrange', 'LaPorte',
      'Lake', 'Lawrence', 'Madison', 'Marion', 'Marshall', 'Martin', 'Miami',
      'Monroe', 'Montgomery', 'Morgan', 'Newton', 'Noble', 'Ohio', 'Orange',
      'Owen', 'Parke', 'Perry', 'Pike', 'Porter', 'Posey', 'Pulaski',
      'Putnam', 'Randolph', 'Ripley', 'Rush', 'Scott', 'Shelby', 'Spencer',
      'St. Joseph', 'Starke', 'Steuben', 'Sullivan', 'Switzerland', 'Tippecanoe',
      'Tipton', 'Union', 'Vanderburgh', 'Vermillion', 'Vigo', 'Wabash',
      'Warren', 'Warrick', 'Washington', 'Wayne', 'Wells', 'White', 'Whitley',
    ];

    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'county' },
    });
    if (existingCount >= COUNTIES.length) return;

    for (let i = 0; i < COUNTIES.length; i++) {
      const label = COUNTIES[i];
      const value = label.toLowerCase().replace(/[.\s]+/g, '_');
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'county', value } },
        update: {},
        create: { category: 'county', value, label, sortOrder: i, isSystem: false, isActive: true },
      });
    }
    this.logger.log(`County dropdown options seeded (${COUNTIES.length} entries).`);
  }

  // ── Service Item Phases (from Excel template data) ─────────────────────────

  private async seedServiceItemPhases() {
    const subtaskCount = await this.prisma.serviceItemSubtask.count();
    if (subtaskCount > 0) {
      this.logger.log(`Service item subtasks already seeded (${subtaskCount} subtasks). Skipping.`);
      return;
    }

    type PhaseTemplate = { name: string; officeField: string; sortOrder: number; tasks: string[] };
    const TEMPLATES: Array<{ serviceTypeName: string; phases: PhaseTemplate[] }> = [
      {
        serviceTypeName: 'ALTA/NSPS Survey',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'Building Dimensions', 'Site Features, Encroachments, & Possession', 'Find Monuments', 'Shoot Utilities', 'Set Monuments'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Legal Description', 'Titleblock', 'Drafting', 'Labeling', 'Layout', 'Review', 'Calc Points'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Legal Description', 'Surveyors Report'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['Legal Description', 'QA/QC Review', 'General Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Recordation', officeField: 'Office', sortOrder: 9, tasks: ['Plotting', 'Review', 'Recordation'] },
          { name: 'Training', officeField: 'Office', sortOrder: 10, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Boundary Survey',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'Building Dimensions', 'Site Features, Encroachments, & Possession', 'Find Monuments', 'Set Monuments'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Titleblock', 'Drafting', 'Labeling', 'Layout', 'Plotting', 'Review', 'Calc Points'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Legal Description', 'Surveyors Report'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['Legal Description', 'QA/QC Review', 'Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Recordation', officeField: 'Office', sortOrder: 9, tasks: ['Plotting', 'Review', 'Recordation'] },
          { name: 'Training', officeField: 'Office', sortOrder: 10, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'As-Built Survey',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Utility Locates Called In'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'TBM Setup', 'General Field Survey', 'Shoot Utilities', 'Structure Dips', 'Building Dimensions', 'Site Features, Encroachments, & Possession', 'Find Monuments', 'Set Monuments'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Processing', 'Labeling', 'Titleblock'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 4, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 5, tasks: ['Legal Description', 'QA/QC Review', 'Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 6, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 7, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Recordation', officeField: 'Office', sortOrder: 8, tasks: ['Plotting', 'Review', 'Recordation'] },
          { name: 'Training', officeField: 'Office', sortOrder: 9, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Construction Engineering',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'TBM Setup', 'Construction Staking'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 2, tasks: ['Field Book'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 3, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 4, tasks: ['QA/QC Review', 'Review'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 5, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 6, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Drone Survey',
        phases: [
          { name: 'Field', officeField: 'Field', sortOrder: 0, tasks: ['Drone Target Setup', 'Drone Flight'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 1, tasks: ['Importing Drone Data', 'Processing Drone Data', 'Breakline Drafting', 'Surface Creation'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 2, tasks: ['Survey Book'] },
        ],
      },
      {
        serviceTypeName: 'Easement Preparation',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Site Features, Encroachments, & Possession', 'Find Monuments', 'Staking'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Drafting', 'Labeling', 'Layout'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Legal Description'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['Legal Description', 'QA/QC Review', 'Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 9, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Plot Plan & House Stake',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Find Monuments / Control', 'Stake House', 'Establish FPG/TBM', 'Importing & Manipulating Points'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 2, tasks: ['Titleblock', 'Drafting', 'Labeling', 'Layout'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 3, tasks: ['Project Management - External', 'Project Management - Internal'] },
          { name: 'Review', officeField: 'Office', sortOrder: 4, tasks: ['QA/QC Review', 'General Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 5, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 6, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 7, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'LCRS',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'Find Monuments', 'Witnesses (CP, Alignment, Sec. Cor)'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Alignment, PL, & R/W Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Titleblock', 'Drafting', 'Labeling', 'Layout', 'Witnesses', 'Table', 'Plotting', 'Review', 'Calc Points'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Surveyors Report'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['QA/QC Review', 'Review', 'Deliverable Creation'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Recordation', officeField: 'Office', sortOrder: 9, tasks: ['Plotting', 'Review', 'Recordation'] },
          { name: 'Training', officeField: 'Office', sortOrder: 10, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Lot Survey',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Research'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'Building Dimensions', 'Site Features, Encroachments, & Possession', 'Find Monuments', 'Set Monuments'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Titleblock', 'Drafting', 'Labeling', 'Layout', 'Plotting', 'Review', 'Calc Points'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Legal Description', 'Surveyors Report', 'Legal Description of Record', 'Attach Deed to Deliverable'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['Legal Description', 'QA/QC Review', 'Review', 'Deliverable Creation'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Recordation', officeField: 'Office', sortOrder: 9, tasks: ['Plotting', 'Review', 'Recordation'] },
          { name: 'Training', officeField: 'Office', sortOrder: 10, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Right-of-Way Engineering',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'Find Monuments'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Alignment, PL, & R/W Resolution', 'R/W Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Importing Points', 'Exhibit', 'Table', 'Bearing & Distance Sheet', 'Calc Points'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Legal Description', 'Computation Sheet', 'Closure Sheet', 'Report', 'Survey Book'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['Legal Description', 'QA/QC Review', 'Review'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 9, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Topographic Survey',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Homeowner Letters Sent', 'Utility Locates Called In'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Site Photos & Notes', 'Find Monuments', 'Control Point Setup', 'TBM Setup', 'General Field Survey', 'Shoot Utilities', 'Witnessing Control', 'Structure Dips'] },
          { name: 'Resolution', officeField: 'Office', sortOrder: 2, tasks: ['Boundary Resolution'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 3, tasks: ['Boundary Resolution', 'Importing Points', 'Processing', 'Structure Analysis', 'Pipe Networks', 'Labeling', 'Boundary Labeling', 'Structure Data Sheets'] },
          { name: 'Documentation', officeField: 'Office', sortOrder: 4, tasks: ['Survey Book'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 5, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 6, tasks: ['QA/QC Review', 'Review', 'Deliverable Creation'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 7, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 8, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 9, tasks: ['Training'] },
        ],
      },
      {
        serviceTypeName: 'Construction Staking',
        phases: [
          { name: 'Administrative Services', officeField: 'Office', sortOrder: 0, tasks: ['Folder Setup', 'Utility Locates Called In'] },
          { name: 'Field', officeField: 'Field', sortOrder: 1, tasks: ['Control Point Setup', 'TBM Setup', 'General Field Survey', 'Shoot Utilities', 'Structure Dips', 'Structure Analysis', 'Pipe Networks', 'Structure Data Sheets', 'Punch List'] },
          { name: 'Drafting', officeField: 'Office', sortOrder: 2, tasks: ['Importing Points', 'Processing', 'Labeling', 'Titleblock', 'Punch List Creation'] },
          { name: 'Project Management', officeField: 'Office', sortOrder: 3, tasks: ['Project Management - External', 'Project Management - Internal', 'Sending Deliverables'] },
          { name: 'Review', officeField: 'Office', sortOrder: 4, tasks: ['QA/QC Review', 'General Review', 'Deliverable Creation'] },
          { name: 'Deliverable Creation', officeField: 'Office', sortOrder: 5, tasks: ['Email Deliverables to Client'] },
          { name: 'Finance', officeField: 'Office', sortOrder: 6, tasks: ['Invoice', 'Processing Payment'] },
          { name: 'Training', officeField: 'Office', sortOrder: 7, tasks: ['Training'] },
        ],
      },
    ];

    let itemsCreated = 0;

    for (const template of TEMPLATES) {
      const jobType = await this.prisma.jobType.findFirst({
        where: { name: template.serviceTypeName },
      });
      if (!jobType) {
        this.logger.warn(`JobType not found: "${template.serviceTypeName}" — skipping its phases.`);
        continue;
      }

      for (const phase of template.phases) {
        const existing = await this.prisma.serviceItem.findFirst({
          where: {
            name: phase.name,
            jobTypeIds: { has: jobType.id },
          },
        });

        let targetId: string;

        if (existing) {
          targetId = existing.id;
        } else {
          const item = await this.prisma.serviceItem.create({
            data: {
              name: phase.name,
              description: phase.officeField,
              jobTypeIds: [jobType.id],
              isActive: true,
              sortOrder: phase.sortOrder,
            },
          });
          targetId = item.id;
          itemsCreated++;
        }

        for (let i = 0; i < phase.tasks.length; i++) {
          await this.prisma.serviceItemSubtask.create({
            data: {
              serviceItemId: targetId,
              name: phase.tasks[i],
              sortOrder: i,
            },
          });
        }
      }
    }

    this.logger.log(`Service item phases seeded: ${itemsCreated} phases created.`);
  }

  // ── Pay Grades ─────────────────────────────────────────────────────────────

  async findAllPayGrades() {
    return this.prisma.payGrade.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPayGrade(dto: { name: string; code: string; description?: string; sortOrder?: number; isDefault?: boolean }) {
    return this.prisma.payGrade.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isDefault: dto.isDefault ?? false,
        isActive: true,
      },
    });
  }

  async updatePayGrade(id: string, dto: Partial<{ name: string; description: string; sortOrder: number; isDefault: boolean; isActive: boolean }>) {
    return this.prisma.payGrade.update({ where: { id }, data: dto });
  }

  async deletePayGrade(id: string) {
    await this.prisma.payGrade.delete({ where: { id } });
  }

  // ── INDOT Pay Zones ────────────────────────────────────────────────────────

  async findAllIndotPayZones() {
    return this.prisma.indotPayZone.findMany({
      orderBy: { name: 'asc' },
      include: { payGrade: { select: { id: true, name: true, code: true } } },
    });
  }

  async createIndotPayZone(dto: { name: string; payGradeId: string; counties?: string[] }) {
    return this.prisma.indotPayZone.create({
      data: { name: dto.name, payGradeId: dto.payGradeId, counties: dto.counties ?? [] },
      include: { payGrade: { select: { id: true, name: true, code: true } } },
    });
  }

  async updateIndotPayZone(id: string, dto: Partial<{ name: string; payGradeId: string; counties: string[] }>) {
    return this.prisma.indotPayZone.update({
      where: { id },
      data: dto,
      include: { payGrade: { select: { id: true, name: true, code: true } } },
    });
  }

  async deleteIndotPayZone(id: string) {
    await this.prisma.indotPayZone.delete({ where: { id } });
  }

  private async seedPayGrades() {
    const PAY_GRADES = [
      { code: 'base',    name: 'Base Rate',   description: 'Standard labor rate for all non-INDOT work', sortOrder: 0, isDefault: true },
      { code: 'billing', name: 'Billing',      description: 'Billable rate charged to clients',           sortOrder: 1, isDefault: false },
      { code: 'indot_1', name: 'INDOT Pay 1',  description: 'INDOT Pay Grade 1',                         sortOrder: 2, isDefault: false },
      { code: 'indot_2', name: 'INDOT Pay 2',  description: 'INDOT Pay Grade 2',                         sortOrder: 3, isDefault: false },
      { code: 'indot_3', name: 'INDOT Pay 3',  description: 'INDOT Pay Grade 3',                         sortOrder: 4, isDefault: false },
    ];

    const existingCount = await this.prisma.payGrade.count();
    if (existingCount >= PAY_GRADES.length) {
      this.logger.log(`Pay grades already seeded (${existingCount} entries). Skipping.`);
      return;
    }

    for (const grade of PAY_GRADES) {
      await this.prisma.payGrade.upsert({
        where: { code: grade.code },
        update: {},
        create: {
          name: grade.name,
          code: grade.code,
          description: grade.description,
          sortOrder: grade.sortOrder,
          isDefault: grade.isDefault,
          isActive: true,
        },
      });
    }
    this.logger.log(`Pay grades seeded (${PAY_GRADES.length} entries).`);
  }
}
