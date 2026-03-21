import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateLeadFormDto } from './dto/create-lead-form.dto';
import { UpdateLeadFormDto } from './dto/update-lead-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Permissions } from '../permissions/permissions.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ============================================================
  // Public routes (no auth) — must come before /:id routes
  // ============================================================

  @Public()
  @Get('public/:apiKey')
  findPublic(@Param('apiKey') apiKey: string) {
    return this.formsService.findPublic(apiKey);
  }

  @Public()
  @Throttle({ default: { ttl: 900000, limit: 5 } })
  @Post('public/:apiKey/submit')
  submit(
    @Param('apiKey') apiKey: string,
    @Body() dto: SubmitFormDto,
    @Ip() ip: string,
  ) {
    return this.formsService.submit(apiKey, dto, ip);
  }

  // ============================================================
  // Authenticated routes — require settings:manage permission
  // ============================================================

  @Get()
  @Permissions('settings:manage')
  findAll() {
    return this.formsService.findAll();
  }

  @Post()
  @Permissions('settings:manage')
  create(@Body() dto: CreateLeadFormDto) {
    return this.formsService.create(dto);
  }

  @Get(':id')
  @Permissions('settings:manage')
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('settings:manage')
  update(@Param('id') id: string, @Body() dto: UpdateLeadFormDto) {
    return this.formsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings:manage')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id);
  }

  @Get(':id/analytics')
  @Permissions('settings:manage')
  getAnalytics(@Param('id') id: string) {
    return this.formsService.getAnalytics(id);
  }
}
