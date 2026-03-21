import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateLeadRepDto } from './dto/create-lead-rep.dto';
import { LeadsService } from './leads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Permissions('leads:view')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    return this.leadsService.findAll(user.id, user.role, year);
  }

  @Post('bulk-update')
  @Permissions('leads:edit')
  bulkUpdate(
    @Body() body: { ids: string[]; data: Record<string, unknown> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.bulkUpdate(body.ids, body.data, user?.id, user?.role);
  }

  @Post('bulk-delete')
  @Permissions('leads:delete')
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.bulkDelete(body.ids, user?.id, user?.role);
  }

  @Get(':id')
  @Permissions('leads:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findOne(id, user.id, user.role);
  }

  @Post()
  @Permissions('leads:create')
  create(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.leadsService.create(createLeadDto as unknown as Record<string, unknown>, user?.id);
  }

  @Patch(':id')
  @Permissions('leads:edit')
  update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.leadsService.update(id, updateLeadDto as unknown as Record<string, unknown>, user?.id);
  }

  @Delete(':id')
  @Permissions('leads:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.remove(id, user?.id);
  }

  @Post(':id/analyze')
  @Permissions('leads:analyze')
  analyzeRisk(
    @Param('id') id: string,
    @Body() body: { provider?: string }
  ) {
    return this.leadsService.analyzeRisk(id, body.provider);
  }

  @Post(':id/summary')
  @Permissions('leads:analyze')
  generateAISummary(
    @Param('id') id: string,
    @Body() body: { provider?: string }
  ) {
    return this.leadsService.generateAISummary(id, body.provider);
  }

  @Post(':id/draft-email')
  @Permissions('leads:analyze')
  draftEmail(
    @Param('id') id: string,
    @Body('emailType') emailType: string,
  ) {
    return this.leadsService.draftEmail(id, emailType || 'follow-up');
  }

  // --- Team member sub-routes ---

  @Post(':id/team-members')
  @Permissions('leads:edit')
  addTeamMember(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.leadsService.addTeamMember(id, userId);
  }

  @Delete(':id/team-members/:userId')
  @Permissions('leads:edit')
  removeTeamMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.leadsService.removeTeamMember(id, userId);
  }

  // --- Rep sub-routes ---

  @Post(':id/reps')
  @Permissions('leads:edit')
  createRep(
    @Param('id') id: string,
    @Body() dto: CreateLeadRepDto,
  ) {
    return this.leadsService.createRep(id, dto);
  }

  @Patch(':id/reps/:repId')
  @Permissions('leads:edit')
  updateRep(
    @Param('id') id: string,
    @Param('repId') repId: string,
    @Body() dto: Partial<CreateLeadRepDto>,
  ) {
    return this.leadsService.updateRep(repId, dto);
  }

  @Delete(':id/reps/:repId')
  @Permissions('leads:edit')
  deleteRep(
    @Param('id') id: string,
    @Param('repId') repId: string,
  ) {
    return this.leadsService.deleteRep(repId);
  }
}
