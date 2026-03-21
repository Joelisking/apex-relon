import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Prisma } from '@prisma/client';

const BUILT_IN_ROLES = [
  {
    key: 'CEO',
    label: 'Chief Executive Officer',
    color: 'violet',
    isBuiltIn: true,
  },
  {
    key: 'ADMIN',
    label: 'Administrator',
    color: 'blue',
    isBuiltIn: true,
  },
];

const SEEDED_ROLES = [
  {
    key: 'OWNER',
    label: 'Owner',
    color: 'violet',
    isBuiltIn: false,
  },
  {
    key: 'PROJECT_MANAGER',
    label: 'Project Manager',
    color: 'blue',
    isBuiltIn: false,
  },
  {
    key: 'SURVEY_CREW_CHIEF',
    label: 'Survey Crew Chief',
    color: 'emerald',
    isBuiltIn: false,
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
  ) {}

  async onModuleInit() {
    await this.seedBuiltInRoles();
  }

  private async seedBuiltInRoles() {
    // Fast-path: skip the upsert loop when all expected roles are already present.
    const allExpectedKeys = [
      ...BUILT_IN_ROLES.map((r) => r.key),
      ...SEEDED_ROLES.map((r) => r.key),
    ];
    const existingCount = await this.prisma.role.count({
      where: { key: { in: allExpectedKeys } },
    });
    if (existingCount >= allExpectedKeys.length) {
      this.logger.log('Roles already seeded. Skipping.');
      return;
    }

    // Upsert built-in roles, enforcing isBuiltIn: true
    for (const role of BUILT_IN_ROLES) {
      await this.prisma.role.upsert({
        where: { key: role.key },
        update: { isBuiltIn: true },
        create: role,
      });
    }

    // Seed non-built-in default roles (only create if missing, never set isBuiltIn)
    for (const role of SEEDED_ROLES) {
      await this.prisma.role.upsert({
        where: { key: role.key },
        update: { isBuiltIn: false },
        create: role,
      });
    }

    this.logger.log('Roles seeded.');
  }

  async getAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
    });

    const userCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const countMap = userCounts.reduce<Record<string, number>>(
      (acc, cur) => {
        acc[cur.role] = cur._count.id;
        return acc;
      },
      {},
    );

    return roles.map((r) => ({ ...r, userCount: countMap[r.key] ?? 0 }));
  }

  async findByKey(key: string) {
    return this.prisma.role.findUnique({ where: { key } });
  }

  private generateKey(label: string): string {
    return label
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  }

  private async uniqueKey(base: string): Promise<string> {
    const existing = await this.prisma.role.findUnique({ where: { key: base } });
    if (!existing) return base;

    let suffix = 2;
    while (true) {
      const candidate = `${base}_${suffix}`;
      const clash = await this.prisma.role.findUnique({ where: { key: candidate } });
      if (!clash) return candidate;
      suffix++;
    }
  }

  async create(dto: CreateRoleDto) {
    const { mimicRoleKey, ...roleData } = dto;

    const baseKey = this.generateKey(roleData.label);
    if (!baseKey) {
      throw new BadRequestException('Label must contain at least one letter or number');
    }
    const key = await this.uniqueKey(baseKey);

    let role: Awaited<ReturnType<typeof this.prisma.role.create>>;
    try {
      role = await this.prisma.role.create({ data: { ...roleData, key } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(`A role with this name already exists`);
      }
      throw err;
    }

    if (mimicRoleKey) {
      const sourcePerms = await this.prisma.rolePermission.findMany({
        where: { role: mimicRoleKey },
      });
      if (sourcePerms.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: sourcePerms.map((p) => ({ role: key, permission: p.permission })),
        });
        await this.permissionsService.refreshCachePublic();
      }
    }

    return role;
  }

  async update(key: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { key } });
    if (!role) throw new NotFoundException(`Role "${key}" not found`);

    return this.prisma.role.update({ where: { key }, data: dto });
  }

  async delete(key: string) {
    const role = await this.prisma.role.findUnique({ where: { key } });
    if (!role) throw new NotFoundException(`Role "${key}" not found`);

    if (role.isBuiltIn) {
      throw new ForbiddenException('Cannot delete built-in roles');
    }

    const userCount = await this.prisma.user.count({ where: { role: key } });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${key}" — ${userCount} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.rolePermission.deleteMany({ where: { role: key } });
    await this.prisma.role.delete({ where: { key } });

    return { message: `Role "${key}" deleted successfully` };
  }
}
