import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { UpsertForecastTargetDto } from './dto/forecast.dto';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('summary')
  getSummary() {
    return this.forecastService.getSummary();
  }

  @Get('monthly')
  getMonthly(@Query('months') months?: string) {
    return this.forecastService.getMonthlyForecast(
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('targets')
  getTargets() {
    return this.forecastService.getTargets();
  }

  @Post('targets')
  upsertTarget(@Body() dto: UpsertForecastTargetDto) {
    return this.forecastService.upsertTarget(dto);
  }
}
