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

@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('users:view') // Anyone managing users needs to see available roles
  getAll() {
    return this.rolesService.getAll();
  }

  @Post()
  @Permissions('permissions:edit')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':key')
  @Permissions('permissions:edit')
  update(@Param('key') key: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(key, dto);
  }

  @Delete(':key')
  @Permissions('permissions:edit')
  delete(@Param('key') key: string) {
    return this.rolesService.delete(key);
  }
}
