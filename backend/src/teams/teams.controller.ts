import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Permissions('teams:create')
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @Permissions('teams:view')
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @Permissions('teams:view')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('teams:edit')
  update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @Permissions('teams:delete')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Post(':id/members')
  @Permissions('teams:manage_members')
  addMember(@Param('id') id: string, @Body('userId') userId: string) {
    return this.teamsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Permissions('teams:manage_members')
  removeMember(@Param('userId') userId: string) {
    return this.teamsService.removeMember(userId);
  }
}
