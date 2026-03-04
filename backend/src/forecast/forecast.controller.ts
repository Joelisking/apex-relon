import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { UpsertForecastTargetDto } from './dto/forecast.dto';
import { Permissions } from '@/permissions/permissions.decorator';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('summary')
  @Permissions('dashboard:view')
  getSummary() {
    return this.forecastService.getSummary();
  }

  @Get('monthly')
  @Permissions('dashboard:view')
  getMonthly(@Query('months') months?: string) {
    return this.forecastService.getMonthlyForecast(
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('targets')
  @Permissions('dashboard:view')
  getTargets() {
    return this.forecastService.getTargets();
  }

  @Post('targets')
  @Permissions('dashboard:view')
  upsertTarget(@Body() dto: UpsertForecastTargetDto) {
    return this.forecastService.upsertTarget(dto);
  }
}
