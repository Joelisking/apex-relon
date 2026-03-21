import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Permissions } from './permissions.decorator';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('matrix')
  @Permissions('permissions:view')
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Put('role/:role')
  @Permissions('permissions:edit')
  async updateRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Request() req: { user: { id: string; role: string; email: string } },
  ) {
    const isValid = await this.permissionsService.isValidEditableRole(role);
    if (!isValid) {
      throw new ForbiddenException(
        role === 'CEO'
          ? 'Cannot modify CEO permissions'
          : `Invalid role: ${role}`,
      );
    }

    await this.permissionsService.updateRolePermissions(
      role,
      dto.permissions,
    );

    await this.auditService.log({
      userId: req.user.id,
      action: 'UPDATE_PERMISSIONS',
      details: {
        role,
        permissions: dto.permissions,
      },
    });

    // Notify all currently-connected users of that role so their permissions refresh instantly
    await this.notificationsService.pushPermissionsUpdatedToRole(role);

    return { message: `Permissions updated for role ${role}` };
  }
}
