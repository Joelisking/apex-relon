import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { Permissions } from '../permissions/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface AuthRequest {
  user: { id: string; role: string; email: string };
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  @Get('users/directory')
  @Permissions('users:list_basic')
  async getUsersDirectory(
    @Query('hasPermission') hasPermission?: string,
  ) {
    return this.adminService.getUsersDirectory(hasPermission);
  }

  @Get('users')
  @Permissions('users:view')
  async getAllUsers(
    @Request() req: AuthRequest,
    @Query('hasPermission') hasPermission?: string,
  ) {
    return this.adminService.getAllUsers(
      req.user.id,
      req.user.role,
      hasPermission,
    );
  }

  @Post('users')
  @Permissions('users:create')
  async createUser(
    @Request() req: AuthRequest,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.adminService.createUser(req.user.id, createUserDto);
  }

  @Patch('users/:id')
  @Permissions('users:edit')
  async updateUser(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(
      req.user.id,
      id,
      updateUserDto,
    );
  }

  @Delete('users/:id')
  @Permissions('users:delete')
  async deleteUser(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(req.user.id, id);
  }

  @Get('ai-settings')
  @Permissions('ai_settings:view')
  getAISettings() {
    return this.adminService.getAISettings();
  }

  @Patch('ai-settings')
  @Permissions('ai_settings:edit')
  updateAISettings(
    @Body() updateSettingsDto: Record<string, unknown>,
  ) {
    return this.adminService.updateAISettings(updateSettingsDto);
  }

  @Get('api-keys/status')
  @Permissions('ai_settings:view')
  checkAPIKeys() {
    return this.adminService.checkAPIKeys();
  }

  @Get('tenant-settings')
  @Permissions('settings:view')
  getTenantSettings() {
    return this.adminService.getTenantSettings();
  }

  @Patch('tenant-settings')
  @Permissions('settings:edit')
  updateTenantSettings(@Body() dto: { clientDisplayMode?: string }) {
    return this.adminService.updateTenantSettings(dto);
  }

  @Get('audit-logs')
  @Permissions('audit_logs:view')
  async getAllAuditLogs(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit: string = '100',
  ) {
    if (action) {
      return this.auditService.getLogsByAction(
        action,
        parseInt(limit),
      );
    }
    if (userId) {
      return this.auditService.getLogsForUser(
        userId,
        parseInt(limit),
      );
    }
    return this.auditService.getAllLogs(parseInt(limit));
  }

  @Get('audit-logs/user/:userId')
  @Permissions('audit_logs:view')
  async getAuditLogsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit: string = '100',
  ) {
    return this.auditService.getLogsForUser(userId, parseInt(limit));
  }

  @Get('audit-logs/action/:action')
  @Permissions('audit_logs:view')
  async getAuditLogsByAction(
    @Param('action') action: string,
    @Query('limit') limit: string = '100',
  ) {
    return this.auditService.getLogsByAction(action, parseInt(limit));
  }
}
