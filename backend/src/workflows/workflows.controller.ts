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
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
} from './dto/workflows.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Permissions('workflows:view')
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  @Permissions('workflows:view')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Post()
  @Permissions('workflows:create')
  create(
    @Body() dto: CreateWorkflowRuleDto,
    @CurrentUser() user: { id: string; role: string; email: string },
  ) {
    return this.workflowsService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('workflows:edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowRuleDto,
  ) {
    return this.workflowsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('workflows:delete')
  delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }

  @Get(':id/executions')
  @Permissions('workflows:view')
  getExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.getExecutions(
      id,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Post(':id/test')
  @Permissions('workflows:view')
  async testRule(
    @Param('id') id: string,
    @Body() body: { entityType?: string; entityId?: string },
  ) {
    return this.workflowsService.testRule(id, body.entityType || 'LEAD', body.entityId);
  }
}
