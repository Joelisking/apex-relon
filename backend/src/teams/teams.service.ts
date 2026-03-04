import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    // If manager is assigned, verify existence
    if (createTeamDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createTeamDto.managerId },
      });
      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
      // Optional: Check if user is actually a manager/admin/ceo?
      // For now, let's assume any user can technically be assigned as a manager of a team,
      // though the frontend will likely filter for MANAGER role.
    }

    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        description: createTeamDto.description,
        type: createTeamDto.type || 'SALES',
        managerId: createTeamDto.managerId,
      },
    });
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
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    // Check if team exists
    await this.findOne(id);

    if (updateTeamDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: updateTeamDto.managerId },
      });
      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if team has members
    // We can either block deletion or unset teamId for members.
    // Let's block for safety for now.
    const memberCount = await this.prisma.user.count({
      where: { teamId: id },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        'Cannot delete team with existing members. Please reassign them first.'
      );
    }

    return this.prisma.team.delete({
      where: { id },
    });
  }

  async addMember(teamId: string, userId: string) {
    await this.findOne(teamId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId },
    });
  }

  async removeMember(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
    });
  }
}
