import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeadRepDto } from './dto/create-lead-rep.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class LeadRepsService {
  private readonly logger = new Logger(LeadRepsService.name);

  constructor(private prisma: PrismaService) {}

  async addTeamMember(leadId: string, userId: string) {
    try {
      const member = await this.prisma.leadTeamMember.upsert({
        where: { leadId_userId: { leadId, userId } },
        create: { leadId, userId },
        update: {},
        include: { user: { select: { id: true, name: true, role: true } } },
      });
      this.logger.log(`Team member added: lead=${leadId} user=${userId}`);
      return member;
    } catch (error) {
      handlePrismaError(error, this.logger, 'LeadRepsService.addTeamMember');
    }
  }

  async removeTeamMember(leadId: string, userId: string) {
    try {
      await this.prisma.leadTeamMember.deleteMany({ where: { leadId, userId } });
      this.logger.log(`Team member removed: lead=${leadId} user=${userId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'LeadRepsService.removeTeamMember');
    }
  }

  async createRep(leadId: string, data: CreateLeadRepDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn(`[LeadRepsService.createRep] Lead not found: ${leadId}`);
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    try {
      const rep = await this.prisma.leadRep.create({
        data: { leadId, ...data },
      });
      this.logger.log(`Rep created: ${rep.id} for lead=${leadId}`);
      return rep;
    } catch (error) {
      handlePrismaError(error, this.logger, 'LeadRepsService.createRep');
    }
  }

  async updateRep(repId: string, data: Partial<CreateLeadRepDto>) {
    const rep = await this.prisma.leadRep.findUnique({ where: { id: repId } });
    if (!rep) {
      this.logger.warn(`[LeadRepsService.updateRep] Rep not found: ${repId}`);
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    try {
      const updated = await this.prisma.leadRep.update({ where: { id: repId }, data });
      this.logger.log(`Rep updated: ${repId}`);
      return updated;
    } catch (error) {
      handlePrismaError(error, this.logger, 'LeadRepsService.updateRep');
    }
  }

  async deleteRep(repId: string) {
    const rep = await this.prisma.leadRep.findUnique({ where: { id: repId } });
    if (!rep) {
      this.logger.warn(`[LeadRepsService.deleteRep] Rep not found: ${repId}`);
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    try {
      const deleted = await this.prisma.leadRep.delete({ where: { id: repId } });
      this.logger.log(`Rep deleted: ${repId}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'LeadRepsService.deleteRep');
    }
  }
}
