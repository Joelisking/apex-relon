import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Permissions } from '../permissions/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  DashboardLayoutService,
  WidgetConfig,
} from './dashboard-layout.service';

export class WidgetPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class WidgetSizeDto {
  @IsNumber()
  w: number;

  @IsNumber()
  h: number;
}

export class WidgetConfigDto {
  @IsString()
  id: string;

  @IsIn([
    'MetricCard',
    'AreaChart',
    'BarChart',
    'FunnelChart',
    'TaskList',
    'LeadsList',
    'AIPanel',
  ])
  type: WidgetConfig['type'];

  @IsObject()
  @ValidateNested()
  @Type(() => WidgetPositionDto)
  position: WidgetPositionDto;

  @IsObject()
  @ValidateNested()
  @Type(() => WidgetSizeDto)
  size: WidgetSizeDto;

  @IsObject()
  config: Record<string, unknown>;
}

export class SaveLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetConfigDto)
  widgets: WidgetConfigDto[];
}

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
  name: string;
  status: string;
}

@Controller('dashboard/layout')
export class DashboardLayoutController {
  constructor(
    private readonly dashboardLayoutService: DashboardLayoutService,
  ) {}

  @Get()
  @Permissions('dashboard:view')
  async getLayout(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardLayoutService.getLayout(user.id, user.role);
  }

  @Put()
  @Permissions('dashboard:edit')
  async saveLayout(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveLayoutDto) {
    return this.dashboardLayoutService.saveLayout(
      user.id,
      dto.widgets,
    );
  }

  @Delete()
  @Permissions('dashboard:edit')
  async resetLayout(@CurrentUser() user: AuthenticatedUser) {
    await this.dashboardLayoutService.resetLayout(user.id);
    return this.dashboardLayoutService.getLayout(user.id, user.role);
  }

  @Get('defaults/:role')
  @Permissions('dashboard:view')
  async getRoleDefaults(@Param('role') role: string) {
    return {
      widgets: this.dashboardLayoutService.getRoleDefaults(role),
    };
  }
}
