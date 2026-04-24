import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    if (createTeamDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createTeamDto.managerId },
      });
      if (!manager) {
        this.logger.warn(`create: manager not found id=${createTeamDto.managerId}`);
        throw new NotFoundException('Manager not found');
      }
    }

    try {
      const team = await this.prisma.team.create({
        data: {
          name: createTeamDto.name,
          description: createTeamDto.description,
          type: createTeamDto.type || 'SALES',
          managerId: createTeamDto.managerId,
        },
      });
      this.logger.log(`create: team created id=${team.id}`);
      return team;
    } catch (error) {
      handlePrismaError(error, this.logger, 'create');
    }
  }

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!team) {
      this.logger.warn(`findOne: team not found id=${id}`);
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    await this.findOne(id);

    if (updateTeamDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.managerId },
      });
      if (!manager) {
        this.logger.warn(`update: manager not found id=${updateTeamDto.managerId}`);
        throw new NotFoundException('Manager not found');
      }
    }

    try {
      const team = await this.prisma.team.update({
        where: { id },
        data: updateTeamDto,
      });
      this.logger.log(`update: team updated id=${id}`);
      return team;
    } catch (error) {
      handlePrismaError(error, this.logger, 'update');
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    const memberCount = await this.prisma.user.count({
      where: { teamId: id },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        'Cannot delete team with existing members. Please reassign them first.'
      );
    }

    try {
      const team = await this.prisma.team.delete({
        where: { id },
      });
      this.logger.log(`remove: team deleted id=${id}`);
      return team;
    } catch (error) {
      handlePrismaError(error, this.logger, 'remove');
    }
  }

  async addMember(teamId: string, userId: string) {
    await this.findOne(teamId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`addMember: user not found id=${userId}`);
      throw new NotFoundException('User not found');
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { teamId },
      });
      this.logger.log(`addMember: user ${userId} added to team ${teamId}`);
      return updated;
    } catch (error) {
      handlePrismaError(error, this.logger, 'addMember');
    }
  }

  async removeMember(userId: string) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { teamId: null },
      });
      this.logger.log(`removeMember: user ${userId} removed from team`);
      return updated;
    } catch (error) {
      handlePrismaError(error, this.logger, 'removeMember');
    }
  }
}
