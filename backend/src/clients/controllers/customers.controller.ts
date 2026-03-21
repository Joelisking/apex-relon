import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomerCrudService } from '../services/customer-crud.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../permissions/permissions.decorator';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
}

@Controller('clients')
export class CustomersController {
  constructor(private readonly crudService: CustomerCrudService) {}

  @Get()
  @Permissions('clients:view')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.crudService.findAll(user.id, user.role);
  }

  @Get(':id')
  @Permissions('clients:view')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crudService.findOne(id, user.id, user.role);
  }

  @Post()
  @Permissions('clients:create')
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.create(dto as unknown as Record<string, unknown>, user?.id);
  }

  @Patch(':id')
  @Permissions('clients:edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.update(id, dto as Record<string, unknown>, user?.id);
  }

  @Delete(':id')
  @Permissions('clients:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crudService.remove(id, user?.id);
  }

  @Post('bulk-update')
  @Permissions('clients:edit')
  bulkUpdate(
    @Body() body: { ids: string[]; data: Record<string, unknown> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.bulkUpdate(body.ids, body.data, user?.id, user?.role);
  }

  @Post('bulk-delete')
  @Permissions('clients:delete')
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.bulkDelete(body.ids, user?.id, user?.role);
  }
}
