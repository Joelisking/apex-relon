import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permissions } from '../permissions/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:view')
  getAll() {
    return this.rolesService.getAll();
  }

  @Get('assignable')
  @Permissions('users:list_basic')
  getAssignable(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.getAssignable(user.role);
  }

  @Post()
  @Permissions('roles:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':key')
  @Permissions('roles:edit')
  update(@Param('key') key: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(key, dto);
  }

  @Delete(':key')
  @Permissions('roles:delete')
  delete(@Param('key') key: string) {
    return this.rolesService.delete(key);
  }
}
