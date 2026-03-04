import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions.constants';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);
  private cache = new Map<string, Set<string>>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
    await this.refreshCache();
  }

  async hasPermission(
    role: string,
    permission: string,
  ): Promise<boolean> {
    // CEO and SUPER_ADMIN always have all permissions
    if (role === 'CEO' || role === 'SUPER_ADMIN') return true;

    const rolePerms = this.cache.get(role);
    return rolePerms ? rolePerms.has(permission) : false;
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    if (role === 'CEO' || role === 'SUPER_ADMIN') {
      return ALL_PERMISSIONS.map((p) => p.key);
    }

    const rolePerms = this.cache.get(role);
    return rolePerms ? Array.from(rolePerms) : [];
  }

  async getMatrix() {
    const dbRoles = await this.prisma.role.findMany({
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
    });
    const roleKeys = dbRoles.map((r) => r.key);
    const matrix: Record<string, string[]> = {};

    for (const key of roleKeys) {
      matrix[key] = await this.getPermissionsForRole(key);
    }

    return {
      permissions: ALL_PERMISSIONS,
      roles: roleKeys,
      matrix,
    };
  }

  async isValidEditableRole(key: string): Promise<boolean> {
    if (key === 'CEO') return false;
    const role = await this.prisma.role.findUnique({
      where: { key },
    });
    return !!role;
  }

  async updateRolePermissions(
    role: string,
    permissions: string[],
  ): Promise<void> {
    // Validate permission keys
    const validKeys = new Set(ALL_PERMISSIONS.map((p) => p.key));
    const filtered = permissions.filter((p) => validKeys.has(p));

    // Delete existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: { role },
    });

    // Insert new permissions
    if (filtered.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: filtered.map((permission) => ({ role, permission })),
      });
    }

    // Refresh cache
    await this.refreshCache();
  }

  private async seedDefaults(): Promise<void> {
    // Fast-path: skip the full upsert loop when the table already has data.
    const existingCount = await this.prisma.rolePermission.count();
    if (existingCount > 0) {
      this.logger.log(
        `Role permissions already seeded (${existingCount} entries). Skipping.`,
      );
      return;
    }

    // Additive upsert: adds new permissions without wiping admin-customised ones.
    this.logger.log('Seeding / ensuring default role permissions...');
    let added = 0;

    for (const [role, permissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS,
    )) {
      // CEO is handled in-memory (always has everything); skip DB seeding for it.
      if (role === 'CEO') continue;

      for (const permission of permissions) {
        const existing = await this.prisma.rolePermission.findUnique({
          where: { role_permission: { role, permission } },
        });
        if (!existing) {
          await this.prisma.rolePermission.create({
            data: { role, permission },
          });
          added++;
        }
      }
    }

    this.logger.log(
      `Role permission seeding complete. ${added} new entries added.`,
    );
  }

  async refreshCachePublic(): Promise<void> {
    return this.refreshCache();
  }

  private async refreshCache(): Promise<void> {
    const allPerms = await this.prisma.rolePermission.findMany();
    this.cache.clear();

    for (const rp of allPerms) {
      if (!this.cache.has(rp.role)) {
        this.cache.set(rp.role, new Set());
      }
      this.cache.get(rp.role)!.add(rp.permission);
    }

    this.logger.log(
      `Permissions cache refreshed: ${allPerms.length} entries for ${this.cache.size} roles.`,
    );
  }
}
