import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByClient(clientId: string) {
    return this.prisma.contact.findMany({
      where: { clientId },
      include: {
        leads: {
          include: {
            lead: { select: { id: true, company: true, contactName: true, stage: true } },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
    });
  }

  async findByLead(leadId: string) {
    const leadContacts = await this.prisma.leadContact.findMany({
      where: { leadId },
      include: {
        contact: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ contact: { isPrimary: 'desc' } }, { contact: { lastName: 'asc' } }],
    });
    return leadContacts.map((lc) => lc.contact);
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        leads: {
          include: {
            lead: { select: { id: true, company: true, contactName: true, stage: true } },
          },
        },
      },
    });
    if (!contact) {
      this.logger.warn(`Contact ${id} not found`);
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async create(clientId: string, dto: CreateContactDto) {
    try {
      const contact = await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.contact.updateMany({
            where: { clientId, isPrimary: true },
            data: { isPrimary: false },
          });
        }
        return tx.contact.create({
          data: { ...dto, clientId },
          include: { client: { select: { id: true, name: true } } },
        });
      });
      this.logger.log(`Contact created: ${contact.id} for client ${clientId}`);
      return contact;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ContactsService.create');
    }
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Contact ${id} not found for update`);
      throw new NotFoundException('Contact not found');
    }

    try {
      const contact = await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.contact.updateMany({
            where: { clientId: existing.clientId, isPrimary: true, id: { not: id } },
            data: { isPrimary: false },
          });
        }
        return tx.contact.update({
          where: { id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            jobTitle: dto.jobTitle,
            department: dto.department,
            linkedInUrl: dto.linkedInUrl,
            isPrimary: dto.isPrimary,
            isDecisionMaker: dto.isDecisionMaker,
            notes: dto.notes,
          },
          include: {
            client: { select: { id: true, name: true } },
          },
        });
      });
      this.logger.log(`Contact updated: ${id}`);
      return contact;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ContactsService.update');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      const deleted = await this.prisma.contact.delete({ where: { id } });
      this.logger.log(`Contact deleted: ${id}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ContactsService.remove');
    }
  }

  async linkToLead(leadId: string, contactId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId }, select: { id: true, clientId: true } });
    if (!contact) {
      this.logger.warn(`Contact ${contactId} not found for lead link`);
      throw new NotFoundException('Contact not found');
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, clientId: true } });
    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found for contact link`);
      throw new NotFoundException('Lead not found');
    }

    if (contact.clientId !== lead.clientId) {
      throw new BadRequestException('Contact does not belong to this lead\'s client');
    }

    try {
      const link = await this.prisma.leadContact.upsert({
        where: { leadId_contactId: { leadId, contactId } },
        create: { leadId, contactId },
        update: {},
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, company: true, contactName: true } },
        },
      });
      this.logger.log(`Contact ${contactId} linked to lead ${leadId}`);
      return link;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ContactsService.linkToLead');
    }
  }

  async unlinkFromLead(leadId: string, contactId: string) {
    const record = await this.prisma.leadContact.findUnique({
      where: { leadId_contactId: { leadId, contactId } },
    });
    if (!record) {
      this.logger.warn(`LeadContact link not found: lead=${leadId} contact=${contactId}`);
      throw new NotFoundException('Link between lead and contact not found');
    }

    try {
      const deleted = await this.prisma.leadContact.delete({
        where: { leadId_contactId: { leadId, contactId } },
      });
      this.logger.log(`Contact ${contactId} unlinked from lead ${leadId}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ContactsService.unlinkFromLead');
    }
  }
}
