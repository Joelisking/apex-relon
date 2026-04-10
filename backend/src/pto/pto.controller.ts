import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { PtoService } from './pto.service';
import {
  CreatePtoPolicyDto,
  UpdatePtoPolicyDto,
  CreatePtoRequestDto,
  ReviewPtoRequestDto,
} from './dto/pto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('pto')
@UseGuards(JwtAuthGuard)
export class PtoController {
  constructor(private readonly ptoService: PtoService) {}

  // ─── Policies ─────────────────────────────────────────────────────────────

  @Get('policies')
  getAllPolicies() {
    return this.ptoService.getAllPolicies();
  }

  @Post('policies')
  createPolicy(@Body() dto: CreatePtoPolicyDto) {
    return this.ptoService.createPolicy(dto);
  }

  @Patch('policies/:id')
  updatePolicy(@Param('id') id: string, @Body() dto: UpdatePtoPolicyDto) {
    return this.ptoService.updatePolicy(id, dto);
  }

  @Delete('policies/:id')
  @HttpCode(204)
  deletePolicy(@Param('id') id: string) {
    return this.ptoService.deletePolicy(id);
  }

  // ─── Requests ─────────────────────────────────────────────────────────────

  @Get('requests/me')
  getMyRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.ptoService.getRequestsForUser(user.id);
  }

  @Get('requests/pending')
  getPendingRequests() {
    return this.ptoService.getPendingRequests();
  }

  @Get('requests')
  getAllRequests(@Query('status') status?: string) {
    return this.ptoService.getAllRequests(status);
  }

  @Get('requests/calendar')
  getCalendarRequests(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ptoService.getApprovedForDateRange(startDate, endDate);
  }

  @Post('requests')
  createRequest(@Body() dto: CreatePtoRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ptoService.createRequest(user.id, dto);
  }

  @Patch('requests/:id/review')
  reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewPtoRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ptoService.reviewRequest(id, user.id, dto);
  }

  @Patch('requests/:id/cancel')
  cancelRequest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ptoService.cancelRequest(id, user.id);
  }
}
