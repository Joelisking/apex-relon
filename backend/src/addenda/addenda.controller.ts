import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { AddendaService } from './addenda.service';
import { CreateAddendumDto } from './dto/create-addendum.dto';
import { UpdateAddendumDto, UpsertAddendumLineDto } from './dto/update-addendum.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller()
@UseGuards(JwtAuthGuard)
export class AddendaController {
  constructor(private readonly addendaService: AddendaService) {}

  @Get('projects/:projectId/addenda')
  findAll(@Param('projectId') projectId: string) {
    return this.addendaService.findAllForProject(projectId);
  }

  @Post('projects/:projectId/addenda')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateAddendumDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addendaService.create(projectId, dto, user.id);
  }

  @Get('addenda/:id')
  findOne(@Param('id') id: string) {
    return this.addendaService.findOne(id);
  }

  @Patch('addenda/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAddendumDto) {
    return this.addendaService.update(id, dto);
  }

  @Patch('addenda/:id/lines')
  upsertLines(@Param('id') id: string, @Body() lines: UpsertAddendumLineDto[]) {
    return this.addendaService.upsertLines(id, lines);
  }

  @Delete('addenda/:id')
  @HttpCode(204)
  delete(@Param('id') id: string) {
    return this.addendaService.delete(id);
  }
}
