import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Permissions } from '@/permissions/permissions.decorator';

@Controller()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // --- Client-scoped contact endpoints ---

  @Get('clients/:clientId/contacts')
  @Permissions('clients:view')
  findByClient(@Param('clientId') clientId: string) {
    return this.contactsService.findByClient(clientId);
  }

  @Post('clients/:clientId/contacts')
  @Permissions('clients:edit')
  createForClient(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(clientId, dto);
  }

  // --- Lead-scoped contact endpoints ---

  @Get('leads/:leadId/contacts')
  @Permissions('leads:view')
  findByLead(@Param('leadId') leadId: string) {
    return this.contactsService.findByLead(leadId);
  }

  @Post('leads/:leadId/contacts/:contactId')
  @Permissions('leads:edit')
  @HttpCode(HttpStatus.OK)
  linkToLead(
    @Param('leadId') leadId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.linkToLead(leadId, contactId);
  }

  @Delete('leads/:leadId/contacts/:contactId')
  @Permissions('leads:edit')
  @HttpCode(HttpStatus.OK)
  unlinkFromLead(
    @Param('leadId') leadId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.unlinkFromLead(leadId, contactId);
  }

  // --- Individual contact endpoints ---

  @Get('contacts/:id')
  @Permissions('clients:view')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch('contacts/:id')
  @Permissions('clients:edit')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete('contacts/:id')
  @Permissions('clients:edit')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
