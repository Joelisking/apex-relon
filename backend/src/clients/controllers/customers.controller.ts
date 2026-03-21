import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomerCrudService } from '../services/customer-crud.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../permissions/permissions.decorator';

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
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.create(body, user?.id);
  }

  @Patch(':id')
  @Permissions('clients:edit')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.update(id, body, user?.id);
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
    return this.crudService.bulkUpdate(body.ids, body.data, user?.id);
  }

  @Post('bulk-delete')
  @Permissions('clients:delete')
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crudService.bulkDelete(body.ids, user?.id);
  }
}
