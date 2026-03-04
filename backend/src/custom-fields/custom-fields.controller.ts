import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  BulkSetCustomFieldValuesDto,
} from './dto/custom-fields.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('custom-fields')
export class CustomFieldsController {
  constructor(
    private readonly customFieldsService: CustomFieldsService,
  ) {}

  // ─── Definitions (Admin) ─────────────────────────

  @Get('definitions')
  @Permissions('settings:manage')
  getDefinitions(@Query('entityType') entityType?: string) {
    return this.customFieldsService.getDefinitions(entityType);
  }

  @Get('definitions/:id')
  @Permissions('settings:manage')
  getDefinition(@Param('id') id: string) {
    return this.customFieldsService.getDefinition(id);
  }

  @Post('definitions')
  @Permissions('settings:manage')
  createDefinition(@Body() dto: CreateCustomFieldDefinitionDto) {
    return this.customFieldsService.createDefinition(dto);
  }

  @Patch('definitions/:id')
  @Permissions('settings:manage')
  updateDefinition(
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
  ) {
    return this.customFieldsService.updateDefinition(id, dto);
  }

  @Delete('definitions/:id')
  @Permissions('settings:manage')
  deleteDefinition(@Param('id') id: string) {
    return this.customFieldsService.deleteDefinition(id);
  }

  @Post('definitions/reorder')
  @Permissions('settings:manage')
  reorderDefinitions(
    @Body() body: { entityType: string; orderedIds: string[] },
  ) {
    return this.customFieldsService.reorderDefinitions(
      body.entityType,
      body.orderedIds,
    );
  }

  // ─── Values ──────────────────────────────────────

  @Get('values/:entityType/:entityId')
  @Permissions('leads:view')
  getValues(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.customFieldsService.getValuesForEntity(
      entityType,
      entityId,
    );
  }

  @Post('values/:entityType/:entityId')
  @Permissions('leads:edit')
  setValues(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: BulkSetCustomFieldValuesDto,
  ) {
    return this.customFieldsService.setValuesForEntity(
      entityType,
      entityId,
      dto.fields,
    );
  }
}
