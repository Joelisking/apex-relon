import { Injectable } from '@nestjs/common';
import { LeadsQueryService } from './leads-query.service';
import { LeadsMutationService } from './leads-mutation.service';
import { LeadsAiService } from './leads-ai.service';
import { LeadRepsService } from './lead-reps.service';
import { CreateLeadRepDto } from './dto/create-lead-rep.dto';

/**
 * Facade that coordinates sub-services. The controller injects only this class.
 */
@Injectable()
export class LeadsService {
  constructor(
    private queryService: LeadsQueryService,
    private mutationService: LeadsMutationService,
    private aiService: LeadsAiService,
    private repsService: LeadRepsService,
  ) {}

  // ── Query ────────────────────────────────────────────────────────────────

  findAll(userId?: string, userRole?: string, year?: string) {
    return this.queryService.findAll(userId, userRole, year);
  }

  findOne(id: string, userId?: string, userRole?: string) {
    return this.queryService.findOne(id, userId, userRole);
  }

  // ── Mutation ─────────────────────────────────────────────────────────────

  create(data: Record<string, unknown>, userId?: string) {
    return this.mutationService.create(data, userId);
  }

  update(id: string, data: Record<string, unknown>, userId?: string) {
    return this.mutationService.update(id, data, userId);
  }

  remove(id: string, userId?: string) {
    return this.mutationService.remove(id, userId);
  }

  bulkUpdate(ids: string[], data: Record<string, unknown>, userId?: string, userRole?: string) {
    return this.mutationService.bulkUpdate(ids, data, userId, userRole);
  }

  bulkDelete(ids: string[], userId?: string, userRole?: string) {
    return this.mutationService.bulkDelete(ids, userId, userRole);
  }

  // ── AI ───────────────────────────────────────────────────────────────────

  analyzeRisk(id: string, provider?: string) {
    return this.aiService.analyzeRisk(id, provider);
  }

  generateAISummary(id: string, provider?: string) {
    return this.aiService.generateAISummary(id, provider);
  }

  draftEmail(id: string, emailType: string) {
    return this.aiService.draftEmail(id, emailType);
  }

  // ── Reps & team members ──────────────────────────────────────────────────

  addTeamMember(leadId: string, userId: string) {
    return this.repsService.addTeamMember(leadId, userId);
  }

  removeTeamMember(leadId: string, userId: string) {
    return this.repsService.removeTeamMember(leadId, userId);
  }

  createRep(leadId: string, data: CreateLeadRepDto) {
    return this.repsService.createRep(leadId, data);
  }

  updateRep(repId: string, data: Partial<CreateLeadRepDto>) {
    return this.repsService.updateRep(repId, data);
  }

  deleteRep(repId: string) {
    return this.repsService.deleteRep(repId);
  }
}
