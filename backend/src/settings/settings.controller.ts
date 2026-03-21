import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateServiceTypeDto, CreateServiceCategoryDto } from './dto/create-service-type.dto';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { CreateDropdownOptionDto, UpdateDropdownOptionDto } from './dto/dropdown-option.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Service Categories ─────────────────────────────────────────────────────

  @Get('service-categories')
  @Permissions('leads:view')
  findAllServiceCategories() {
    return this.settingsService.findAllServiceCategories();
  }

  @Post('service-categories')
  @Permissions('settings:manage')
  createServiceCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.settingsService.createServiceCategory(dto);
  }

  @Patch('service-categories/:id')
  @Permissions('settings:manage')
  updateServiceCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateServiceCategoryDto>,
  ) {
    return this.settingsService.updateServiceCategory(id, dto);
  }

  @Delete('service-categories/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteServiceCategory(@Param('id') id: string) {
    return this.settingsService.deleteServiceCategory(id);
  }

  // ── Service Types ──────────────────────────────────────────────────────────

  @Get('service-types')
  @Permissions('leads:view')
  findAllServiceTypes() {
    return this.settingsService.findAllServiceTypes();
  }

  @Post('service-types')
  @Permissions('settings:manage')
  createServiceType(@Body() dto: CreateServiceTypeDto) {
    return this.settingsService.createServiceType(dto);
  }

  @Patch('service-types/:id')
  @Permissions('settings:manage')
  updateServiceType(
    @Param('id') id: string,
    @Body() dto: Partial<CreateServiceTypeDto>,
  ) {
    return this.settingsService.updateServiceType(id, dto);
  }

  @Delete('service-types/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteServiceType(@Param('id') id: string) {
    return this.settingsService.deleteServiceType(id);
  }

  // ── Task Types ─────────────────────────────────────────────────────────────

  @Get('task-types')
  @Permissions('leads:view')
  findAllTaskTypes(@Query('serviceTypeId') serviceTypeId?: string) {
    return this.settingsService.findAllTaskTypes(serviceTypeId);
  }

  @Post('task-types')
  @Permissions('settings:manage')
  createTaskType(@Body() dto: CreateTaskTypeDto) {
    return this.settingsService.createTaskType(dto);
  }

  @Patch('task-types/:id')
  @Permissions('settings:manage')
  updateTaskType(@Param('id') id: string, @Body() dto: Partial<CreateTaskTypeDto>) {
    return this.settingsService.updateTaskType(id, dto);
  }

  @Delete('task-types/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTaskType(@Param('id') id: string) {
    return this.settingsService.deleteTaskType(id);
  }

  // ── Dropdown Options ───────────────────────────────────────────────────────

  @Get('dropdown-options')
  @Permissions('leads:view')
  findDropdownOptions(@Query('category') category?: string) {
    return this.settingsService.findDropdownOptions(category);
  }

  @Get('dropdown-options/all')
  @Permissions('settings:manage')
  findAllDropdownOptions() {
    return this.settingsService.findAllDropdownOptions();
  }

  @Post('dropdown-options')
  @Permissions('settings:manage')
  createDropdownOption(@Body() dto: CreateDropdownOptionDto) {
    return this.settingsService.createDropdownOption(dto);
  }

  @Patch('dropdown-options/:id')
  @Permissions('settings:manage')
  updateDropdownOption(
    @Param('id') id: string,
    @Body() dto: UpdateDropdownOptionDto,
  ) {
    return this.settingsService.updateDropdownOption(id, dto);
  }

  @Delete('dropdown-options/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDropdownOption(@Param('id') id: string) {
    return this.settingsService.deleteDropdownOption(id);
  }

  @Post('dropdown-options/reorder')
  @Permissions('settings:manage')
  reorderDropdownOptions(
    @Body() body: { category: string; orderedIds: string[] },
  ) {
    return this.settingsService.reorderDropdownOptions(body.category, body.orderedIds);
  }
}
