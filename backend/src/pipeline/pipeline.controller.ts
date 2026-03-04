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
import { PipelineService } from './pipeline.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('stages')
  @Permissions('leads:view')
  findAll(@Query('type') type?: string) {
    return this.pipelineService.findAll(type);
  }

  @Post('stages')
  @Permissions('pipeline:manage')
  create(@Body() dto: CreateStageDto) {
    return this.pipelineService.create(dto);
  }

  @Patch('stages/reorder')
  @Permissions('pipeline:manage')
  reorder(@Body() dto: ReorderStagesDto) {
    return this.pipelineService.reorder(dto);
  }

  @Patch('stages/:id')
  @Permissions('pipeline:manage')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.pipelineService.update(id, dto);
  }

  @Delete('stages/:id')
  @Permissions('pipeline:manage')
  remove(@Param('id') id: string) {
    return this.pipelineService.remove(id);
  }
}
