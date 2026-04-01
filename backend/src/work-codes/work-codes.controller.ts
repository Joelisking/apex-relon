import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WorkCodesService } from './work-codes.service';
import { UpdateWorkCodeDto } from './dto/update-work-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('work-codes')
@UseGuards(JwtAuthGuard)
export class WorkCodesController {
  constructor(private readonly workCodesService: WorkCodesService) {}

  @Get()
  @Permissions('time_tracking:view')
  findAll(@Query('division') division?: string) {
    return this.workCodesService.findAll(division ? parseInt(division, 10) : undefined);
  }

  @Get('admin')
  @Permissions('settings:manage')
  findAllForAdmin(@Query('division') division?: string) {
    return this.workCodesService.findAllForAdmin(division ? parseInt(division, 10) : undefined);
  }

  @Patch(':id')
  @Permissions('settings:manage')
  update(@Param('id') id: string, @Body() dto: UpdateWorkCodeDto) {
    return this.workCodesService.update(id, dto);
  }
}
