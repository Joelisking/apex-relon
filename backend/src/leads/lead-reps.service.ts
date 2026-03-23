import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeadRepDto } from './dto/create-lead-rep.dto';

@Injectable()
export class LeadRepsService {
  constructor(private prisma: PrismaService) {}

  async addTeamMember(leadId: string, userId: string) {
    return this.prisma.leadTeamMember.upsert({
      where: { leadId_userId: { leadId, userId } },
      create: { leadId, userId },
      update: {},
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  async removeTeamMember(leadId: string, userId: string) {
    await this.prisma.leadTeamMember.deleteMany({ where: { leadId, userId } });
  }

  async createRep(leadId: string, data: CreateLeadRepDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    return this.prisma.leadRep.create({
      data: { leadId, ...data },
    });
  }

  async updateRep(repId: string, data: Partial<CreateLeadRepDto>) {
    const rep = await this.prisma.leadRep.findUnique({ where: { id: repId } });
    if (!rep) {
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    return this.prisma.leadRep.update({ where: { id: repId }, data });
  }

  async deleteRep(repId: string) {
    const rep = await this.prisma.leadRep.findUnique({ where: { id: repId } });
    if (!rep) {
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    return this.prisma.leadRep.delete({ where: { id: repId } });
  }
}
