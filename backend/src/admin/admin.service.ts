import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailService: EmailService,
    private auditService: AuditService,
    private permissionsService: PermissionsService,
  ) {}

  // ==================== Permission Validation Methods ====================

  /**
   * Check if current user can manage a user with the target role.
   * Permission-based: users with users:edit can manage any non-admin role.
   * CEO/SUPER_ADMIN bypass applies unconditionally.
   */
  private async canManageUser(
    currentUserRole: string,
    targetUserRole: string,
  ): Promise<boolean> {
    if (currentUserRole === 'CEO' || currentUserRole === 'SUPER_ADMIN') return true;
    if (targetUserRole === 'CEO' || targetUserRole === 'SUPER_ADMIN') return false;

    const currentHasUsersEdit = await this.permissionsService.hasPermission(currentUserRole, 'users:edit');
    if (!currentHasUsersEdit) return false;

    // Can manage users who don't themselves have users:edit (i.e., non-admin roles)
    const targetHasUsersEdit = await this.permissionsService.hasPermission(targetUserRole, 'users:edit');
    return !targetHasUsersEdit;
  }

  /**
   * Validate user creation permissions and requirements
   */
  private async validateUserCreation(
    _currentUserId: string,
    currentUserRole: string,
    createDto: CreateUserDto,
  ): Promise<void> {
    // Check if user can create this role
    if (!(await this.canManageUser(currentUserRole, createDto.role))) {
      throw new ForbiddenException(
        `You do not have permission to create users with the ${createDto.role} role`,
      );
    }

    // Check if email is already taken
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // If managerId is provided, validate the manager exists
    if (createDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createDto.managerId },
      });
      if (!manager) {
        throw new BadRequestException('Invalid manager ID');
      }
    }

    // If teamId is provided, validate it exists
    if (createDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: createDto.teamId },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }
  }

  /**
   * Validate user update permissions
   */
  private async validateUserUpdate(
    currentUserId: string,
    currentUserRole: string,
    targetUserId: string,
    updateDto: UpdateUserDto,
  ): Promise<{ id: string; role: string; managerId: string | null }> {
    // Fetch target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Users cannot modify themselves through this endpoint
    if (currentUserId === targetUserId) {
      throw new ForbiddenException(
        'Use profile settings to update your own account',
      );
    }

    // Check permission to modify this user
    if (!(await this.canManageUser(currentUserRole, targetUser.role))) {
      throw new ForbiddenException(
        `You don't have permission to modify ${targetUser.role} users`,
      );
    }

    // If role is being changed, validate new role
    if (updateDto.role && updateDto.role !== targetUser.role) {
      if (!(await this.canManageUser(currentUserRole, updateDto.role))) {
        throw new ForbiddenException(
          `You don't have permission to change users to ${updateDto.role} role`,
        );
      }
    }

    // If teamId is being updated, validate it
    if (updateDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: updateDto.teamId },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    return targetUser;
  }

  /**
   * Generate secure temporary password
   */
  private generateTempPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(
        Math.floor(Math.random() * chars.length),
      );
    }
    return password;
  }

  // ==================== User Management Methods ====================

  /**
   * Get all users (filtered by role hierarchy)
   */
  async getAllUsers(
    currentUserId: string,
    currentUserRole: string,
    hasPermissionFilter?: string,
  ) {
    // SUPER_ADMIN accounts are never visible in any user list
    const where: Record<string, unknown> = {
      role: { not: 'SUPER_ADMIN' },
    };

    const canViewAll = await this.permissionsService.hasPermission(currentUserRole, 'users:view');
    if (!canViewAll) {
      // Users without users:view only see themselves
      where.id = currentUserId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        teamName: true,
        managerId: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: { name: true, email: true },
        },
        teamMembers: {
          select: { id: true, name: true, email: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform result to include team name from relation if available, fallback to legacy teamName
    // This ensures frontend compatibility
    let usersWithTeam = users.map((user) => ({
      ...user,
      teamName: user.team?.name || user.teamName,
    }));

    // If a permission filter is specified, only return users whose role has that permission
    if (hasPermissionFilter) {
      const rolePerms = await this.prisma.rolePermission.findMany({
        where: { permission: hasPermissionFilter },
        select: { role: true },
      });
      const eligibleRoles = new Set(rolePerms.map((rp) => rp.role));
      usersWithTeam = usersWithTeam.filter((u) =>
        eligibleRoles.has(u.role),
      );
    }

    return { users: usersWithTeam };
  }

  /**
   * Create a new user with hierarchical validation
   */
  async createUser(
    currentUserId: string,
    createUserDto: CreateUserDto,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Validate permissions
    await this.validateUserCreation(
      currentUserId,
      currentUser.role,
      createUserDto,
    );

    // Generate secure temporary password
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role,
        teamName: createUserDto.teamName, // Keep for backward compatibility if provided
        teamId: createUserDto.teamId || null,
        managerId: createUserDto.managerId || null,
        status: 'Active',
        isEmailVerified: false,
        mustCompleteProfile: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        teamName: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        managerId: true,
        manager: {
          select: { name: true, email: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send welcome email with temp password (non-blocking)
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.name,
        tempPassword,
      );
    } catch (error) {
      // Email failure should not block user creation
      console.error('Failed to send welcome email:', error);
    }

    // Log audit trail
    try {
      await this.auditService.log({
        userId: currentUserId,
        action: 'CREATE_USER',
        targetUserId: user.id,
        details: {
          role: user.role,
          email: user.email,
          teamName: user.teamName,
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }

    return {
      user,
      tempPassword, // Return for display
    };
  }

  /**
   * Update a user with hierarchical validation
   */
  async updateUser(
    currentUserId: string,
    targetUserId: string,
    updateUserDto: UpdateUserDto,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Validate permissions
    await this.validateUserUpdate(
      currentUserId,
      currentUser.role,
      targetUserId,
      updateUserDto,
    );

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        teamName: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        managerId: true,
        manager: {
          select: { name: true, email: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit trail
    try {
      await this.auditService.log({
        userId: currentUserId,
        action: 'UPDATE_USER',
        targetUserId: updatedUser.id,
        details: {
          updates: updateUserDto as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }

    return { user: updatedUser };
  }

  /**
   * Delete a user (CEO and ADMIN only)
   */
  async deleteUser(currentUserId: string, targetUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Cannot delete yourself
    if (currentUserId === targetUserId) {
      throw new ForbiddenException(
        'You cannot delete your own account',
      );
    }

    if (targetUser.role === 'CEO' || targetUser.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('This user cannot be deleted');
    }

    // Only users with users:delete permission can delete; only CEO can delete users with users:edit
    if (!(await this.canManageUser(currentUser.role, targetUser.role))) {
      throw new ForbiddenException('You do not have permission to delete this user');
    }

    // Check if user has direct reports — prevent deletion regardless of role
    const teamMembers = await this.prisma.user.count({
      where: { managerId: targetUserId },
    });
    if (teamMembers > 0) {
      throw new BadRequestException(
        'Cannot delete a user with active direct reports. Please reassign them first.',
      );
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    // Log audit trail
    try {
      await this.auditService.log({
        userId: currentUserId,
        action: 'DELETE_USER',
        targetUserId: targetUserId,
        details: {
          deletedEmail: targetUser.email,
          deletedRole: targetUser.role,
          deletedName: targetUser.name,
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }

    return { message: 'User deleted successfully' };
  }

  // ==================== AI Settings Methods ====================

  // Encryption helpers for API keys
  private encryptApiKey(text: string): string {
    if (!text) return '';

    const encryptionKey = this.config.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required for API key encryption',
      );
    }
    const key = scryptSync(encryptionKey, 'salt', 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptApiKey(encrypted: string): string {
    if (!encrypted) return '';

    try {
      const encryptionKey = this.config.get('ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error(
          'ENCRYPTION_KEY environment variable is required for API key decryption',
        );
      }
      const key = scryptSync(encryptionKey, 'salt', 32);

      const [ivHex, encryptedText] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return '';
    }
  }

  private maskApiKey(key: string): string {
    if (!key || key.length < 8) return '';
    return (
      key.substring(0, 4) +
      '•'.repeat(20) +
      key.substring(key.length - 4)
    );
  }

  private getDefaultPrompts() {
    // These are the exact prompts from ai/prompts/index.ts converted to placeholder format
    // At runtime, the AI service will replace placeholders with actual data
    return {
      leadRiskPrompt: `Analyze this sales lead and provide a risk assessment in JSON format.

Lead Details:
- Contact: ${'{{contactName}}'}
- Company: ${'{{company}}'}
- Value: $${'{{value}}'}
- Stage: ${'{{stage}}'}
- Service Type: ${'{{serviceType}}'}
- Urgency: ${'{{urgency}}'}
- Source: ${'{{source}}'}
- Channel: ${'{{channel}}'}
- Likely Start: ${'{{likelyStartDate}}'}
- Notes: ${'{{notes}}'}

Please respond with a JSON object containing:
{
  "riskLevel": "Low" | "Medium" | "High",
  "summary": "Brief explanation of the risk assessment",
  "recommendations": ["Array of actionable recommendations"],
  "confidence": 0.0 to 1.0
}

Consider factors like deal size, timeline, engagement level, and any red flags.`,

      clientHealthPrompt: `Analyze this client's health status and provide a comprehensive assessment in JSON format.

Client Details:
- Name: ${'{{name}}'}
- Segment: ${'{{segment}}'}
- Industry: ${'{{industry}}'}
- Lifetime Revenue: $${'{{lifetimeRevenue}}'}
- Account Manager: ${'{{accountManager}}'}
- Current Status: ${'{{status}}'}

Engagement Metrics:
- Days Since Last Contact: ${'{{daysSinceLastContact}}'}
- Total Activities: ${'{{totalActivityCount}}'}
- Recent Activities (30 days): ${'{{recentActivityCount}}'}
- Engagement Score: ${'{{engagementScore}}'}/100

Project History:
- Total Projects: ${'{{totalProjectCount}}'}
- Active Projects: ${'{{activeProjectCount}}'}
- Completed Projects: ${'{{completedProjectCount}}'}
- Average Project Value: $${'{{avgProjectValue}}'}
- Recent Revenue (12 months): $${'{{recentRevenue}}'}

Contact Information:
- Email: ${'{{email}}'}
- Phone: ${'{{phone}}'}

Recent Activity Details:
${'{{recentActivities}}'}

Please respond with a JSON object containing:
{
  "healthScore": 0 to 100,
  "summary": "Brief overview of client health (2-3 sentences)",
  "riskFactors": ["Array of specific risk factors based on activity content"],
  "strengths": ["Array of positive indicators from interactions"],
  "recommendations": ["Array of actionable recommendations based on conversation context"]
}

Consider engagement frequency, revenue trends, repeat business, relationship depth, AND the actual content of recent interactions.`,

      executiveSummaryPrompt: `Generate an executive summary for this CRM dashboard data in JSON format.

REVENUE & GROWTH:
- Total Revenue: $${'{{totalRevenue}}'}
- Monthly Revenue: $${'{{monthlyRevenue}}'}
- Quarterly Revenue: $${'{{quarterlyRevenue}}'}
- Pipeline Value: $${'{{pipelineValue}}'}
- Average Deal Size: $${'{{avgDealSize}}'}

SALES PERFORMANCE:
- Total Leads: ${'{{totalLeads}}'}
- Won: ${'{{wonLeads}}'} | Lost: ${'{{lostLeads}}'}
- Win Rate: ${'{{winRate}}'}%
- Average Time to Quote: ${'{{avgTimeToQuote}}'} days
- Average Time to Close: ${'{{avgTimeToClose}}'} days

CLIENT & PROJECT HEALTH:
- Active Clients: ${'{{activeClients}}'}
- Total Projects: ${'{{totalProjects}}'}
- Active Projects: ${'{{activeProjects}}'}

TOP REVENUE CONTRIBUTORS:
${'{{topClients}}'}

REVENUE CONCENTRATION RISK:
- Top Client: ${'{{topClientPercentage}}'}% of revenue
- Top 5 Clients: ${'{{top5ClientsPercentage}}'}% of revenue
- Risk Level: ${'{{concentrationRiskLevel}}'}

STALLED LEADS (30+ days no activity):
${'{{stalledLeads}}'}

PROJECTS AT RISK:
${'{{projectsAtRisk}}'}

HIGH-VALUE DEALS IN PIPELINE:
${'{{highValueDeals}}'}

Please respond with a JSON object containing:
{
  "overview": "2-3 sentence executive summary answering: How are we performing? What changed? What's the overall trajectory?",
  "whatChanged": ["Array of 2-3 key changes from expected patterns or recent developments"],
  "whatIsAtRisk": ["Array of 2-3 specific risks that need attention (deals, clients, projects, revenue concentration)"],
  "whatNeedsAttention": ["Array of 2-3 immediate action items for leadership"],
  "keyInsights": ["Array of 2-3 strategic insights or opportunities"]
}

Focus on:
1. Actionable insights leadership can act on immediately
2. Specific risks with context (which deals, which clients)
3. Revenue concentration and diversification needs
4. Pipeline health and conversion efficiency
5. Time-based trends (are things speeding up or slowing down?)`,

      upsellPrompt: `Develop an upsell strategy for this client in JSON format.

Client Details:
- Name: ${'{{name}}'}
- Segment: ${'{{segment}}'}
- Industry: ${'{{industry}}'}
- Lifetime Revenue: $${'{{lifetimeRevenue}}'}

Engagement & Performance:
- Engagement Score: ${'{{engagementScore}}'}/100
- Active Projects: ${'{{activeProjectCount}}'}
- Completed Projects: ${'{{completedProjectCount}}'}
- Recent Revenue (12 months): $${'{{recentRevenue}}'}

Project History:
${'{{projects}}'}

Recent Conversations & Interactions:
${'{{recentActivities}}'}

Please respond with a JSON object containing:
{
  "opportunities": [
    {
      "service": "Service/product name",
      "rationale": "Why this makes sense based on their history AND recent conversations",
      "estimatedValue": "Estimated value range",
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "approach": "Recommended engagement approach based on recent interactions",
  "timing": "Best timing (immediate, 1-3 months, 3-6 months)",
  "talkingPoints": ["Key points to emphasize based on what they've mentioned"]
}

Consider industry-specific needs, project patterns, expansion opportunities, AND insights from recent conversations.`,

      chatPrompt: `You are an AI assistant for a CRM system. The user is asking: "${'{{message}}'}"

Context:
- Total Leads: ${'{{leadsCount}}'}
- Total Clients: ${'{{clientsCount}}'}
- User Role: ${'{{userRole}}'}

Provide a helpful, concise response focused on CRM tasks, insights, and recommendations. Be professional and action-oriented.`,
    };
  }

  async getAISettings() {
    let settings = await this.prisma.aISettings.findFirst();

    if (!settings) {
      // Create default settings with prompts
      const defaults = this.getDefaultPrompts();
      settings = await this.prisma.aISettings.create({
        data: {
          defaultProvider: 'openai',
          anthropicKeyValid: !!this.config.get('ANTHROPIC_API_KEY'),
          openaiKeyValid: !!this.config.get('OPENAI_API_KEY'),
          geminiKeyValid: !!this.config.get('GEMINI_API_KEY'),
          ...defaults,
        },
      });
    }

    // Decrypt and mask API keys for display
    const response: Record<string, unknown> = {
      ...settings,
      anthropicApiKey: settings.anthropicApiKey
        ? this.maskApiKey(
            this.decryptApiKey(settings.anthropicApiKey),
          )
        : '',
      openaiApiKey: settings.openaiApiKey
        ? this.maskApiKey(this.decryptApiKey(settings.openaiApiKey))
        : '',
      geminiApiKey: settings.geminiApiKey
        ? this.maskApiKey(this.decryptApiKey(settings.geminiApiKey))
        : '',
    };

    // Use default prompts if not set
    const defaults = this.getDefaultPrompts();
    response.leadRiskPrompt =
      settings.leadRiskPrompt || defaults.leadRiskPrompt;
    response.clientHealthPrompt =
      settings.clientHealthPrompt || defaults.clientHealthPrompt;
    response.executiveSummaryPrompt =
      settings.executiveSummaryPrompt ||
      defaults.executiveSummaryPrompt;
    response.upsellPrompt =
      settings.upsellPrompt || defaults.upsellPrompt;
    response.chatPrompt = settings.chatPrompt || defaults.chatPrompt;

    // Add storage location info
    response.storageInfo = {
      apiKeys: 'Encrypted in database (ai_settings table)',
      prompts: 'Stored in database (ai_settings table)',
      encryptionMethod: 'AES-256-CBC',
    };

    return response;
  }

  async updateAISettings(data: Record<string, unknown>) {
    const existing = await this.prisma.aISettings.findFirst();

    // Encrypt API keys if provided
    const updateData: Record<string, unknown> = { ...data };

    if (
      data.anthropicApiKey &&
      !(data.anthropicApiKey as string).includes('•')
    ) {
      updateData.anthropicApiKey = this.encryptApiKey(
        data.anthropicApiKey as string,
      );
      updateData.anthropicKeyValid = !!data.anthropicApiKey;
    }

    if (
      data.openaiApiKey &&
      !(data.openaiApiKey as string).includes('•')
    ) {
      updateData.openaiApiKey = this.encryptApiKey(
        data.openaiApiKey as string,
      );
      updateData.openaiKeyValid = !!data.openaiApiKey;
    }

    if (
      data.geminiApiKey &&
      !(data.geminiApiKey as string).includes('•')
    ) {
      updateData.geminiApiKey = this.encryptApiKey(
        data.geminiApiKey as string,
      );
      updateData.geminiKeyValid = !!data.geminiApiKey;
    }

    if (existing) {
      return this.prisma.aISettings.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      return this.prisma.aISettings.create({
        data: updateData,
      });
    }
  }

  async checkAPIKeys() {
    const settings = await this.prisma.aISettings.findFirst();

    return {
      anthropic:
        settings?.anthropicKeyValid ||
        !!this.config.get('ANTHROPIC_API_KEY'),
      openai:
        settings?.openaiKeyValid ||
        !!this.config.get('OPENAI_API_KEY'),
      gemini:
        settings?.geminiKeyValid ||
        !!this.config.get('GEMINI_API_KEY'),
    };
  }

  // ==================== Tenant Settings Methods ====================

  async getTenantSettings() {
    let settings = await this.prisma.tenantSettings.findUnique({
      where: { id: 'singleton' },
    });
    if (!settings) {
      settings = await this.prisma.tenantSettings.create({
        data: { id: 'singleton' },
      });
    }
    return settings;
  }

  async updateTenantSettings(dto: { clientDisplayMode?: string }) {
    return this.prisma.tenantSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...dto },
      update: dto,
    });
  }
}
