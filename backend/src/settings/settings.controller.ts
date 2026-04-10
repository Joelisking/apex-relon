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
import { CreateJobTypeDto, CreateDivisionDto } from './dto/create-service-type.dto';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { CreateDropdownOptionDto, UpdateDropdownOptionDto } from './dto/dropdown-option.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Divisions ──────────────────────────────────────────────────────────────

  @Get('divisions')
  @Permissions('leads:view')
  findAllDivisions() {
    return this.settingsService.findAllDivisions();
  }

  @Post('divisions')
  @Permissions('settings:manage')
  createDivision(@Body() dto: CreateDivisionDto) {
    return this.settingsService.createDivision(dto);
  }

  @Patch('divisions/:id')
  @Permissions('settings:manage')
  updateDivision(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDivisionDto>,
  ) {
    return this.settingsService.updateDivision(id, dto);
  }

  @Delete('divisions/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDivision(@Param('id') id: string) {
    return this.settingsService.deleteDivision(id);
  }

  // ── Job Types ──────────────────────────────────────────────────────────────

  @Get('job-types')
  @Permissions('leads:view')
  findAllJobTypes() {
    return this.settingsService.findAllJobTypes();
  }

  @Post('job-types')
  @Permissions('settings:manage')
  createJobType(@Body() dto: CreateJobTypeDto) {
    return this.settingsService.createJobType(dto);
  }

  @Patch('job-types/:id')
  @Permissions('settings:manage')
  updateJobType(
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobTypeDto>,
  ) {
    return this.settingsService.updateJobType(id, dto);
  }

  @Delete('job-types/:id')
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteJobType(@Param('id') id: string) {
    return this.settingsService.deleteJobType(id);
  }

  // ── Task Types ─────────────────────────────────────────────────────────────

  @Get('task-types')
  @Permissions('leads:view')
  findAllTaskTypes(@Query('jobTypeId') jobTypeId?: string) {
    return this.settingsService.findAllTaskTypes(jobTypeId);
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
