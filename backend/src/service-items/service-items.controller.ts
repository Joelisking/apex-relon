import {
  Controller, Get, Post, Patch, Delete, Put,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { CreateRoleEstimateDto } from './dto/create-role-estimate.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Get()
  @Permissions('projects:view')
  findAll(@Query('serviceTypeId') serviceTypeId?: string) {
    return this.serviceItemsService.findAll(serviceTypeId);
  }

  @Get(':id')
  @Permissions('projects:view')
  findOne(@Param('id') id: string) {
    return this.serviceItemsService.findOne(id);
  }

  @Post()
  @Permissions('settings:manage')
  create(@Body() dto: CreateServiceItemDto) {
    return this.serviceItemsService.create(dto);
  }

  @Patch(':id')
  @Permissions('settings:manage')
  update(@Param('id') id: string, @Body() dto: UpdateServiceItemDto) {
    return this.serviceItemsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.serviceItemsService.remove(id);
  }

  // ── Subtasks ──────────────────────────────────────────────────────────────

  @Get(':id/subtasks')
  @Permissions('projects:view')
  getSubtasks(@Param('id') id: string) {
    return this.serviceItemsService.getSubtasks(id);
  }

  @Post(':id/subtasks')
  @Permissions('settings:manage')
  createSubtask(@Param('id') id: string, @Body() dto: CreateSubtaskDto) {
    return this.serviceItemsService.createSubtask(id, dto);
  }

  @Patch(':id/subtasks/:subtaskId')
  @Permissions('settings:manage')
  updateSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: Partial<CreateSubtaskDto>,
  ) {
    return this.serviceItemsService.updateSubtask(id, subtaskId, dto);
  }

  @Delete(':id/subtasks/:subtaskId')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSubtask(@Param('id') id: string, @Param('subtaskId') subtaskId: string) {
    return this.serviceItemsService.deleteSubtask(id, subtaskId);
  }

  @Post(':id/subtasks/reorder')
  @Permissions('settings:manage')
  reorderSubtasks(@Param('id') id: string, @Body() body: { orderedIds: string[] }) {
    return this.serviceItemsService.reorderSubtasks(id, body.orderedIds);
  }

  // ── Role Estimates ────────────────────────────────────────────────────────

  @Put(':id/subtasks/:subtaskId/roles/:role')
  @Permissions('settings:manage')
  upsertRoleEstimate(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Param('role') role: string,
    @Body() dto: CreateRoleEstimateDto,
  ) {
    return this.serviceItemsService.upsertRoleEstimate(id, subtaskId, role, dto.estimatedHours);
  }

  @Delete(':id/subtasks/:subtaskId/roles/:role')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoleEstimate(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Param('role') role: string,
  ) {
    return this.serviceItemsService.deleteRoleEstimate(id, subtaskId, role);
  }
}
