import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
} from './dto/custom-fields.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Definitions ───────────────────────────────

  async getDefinitions(entityType?: string) {
    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;

    return this.prisma.customFieldDefinition.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getDefinition(id: string) {
    const def = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
    });
    if (!def) {
      this.logger.warn(`getDefinition: custom field definition ${id} not found`);
      throw new NotFoundException('Custom field definition not found');
    }
    return def;
  }

  async createDefinition(dto: CreateCustomFieldDefinitionDto) {
    const exists = await this.prisma.customFieldDefinition.findUnique({
      where: {
        entityType_fieldKey: {
          entityType: dto.entityType,
          fieldKey: dto.fieldKey,
        },
      },
    });
    if (exists)
      throw new BadRequestException(
        `Field key "${dto.fieldKey}" already exists for ${dto.entityType}`,
      );

    try {
      const def = await this.prisma.customFieldDefinition.create({
        data: {
          entityType: dto.entityType,
          label: dto.label,
          fieldKey: dto.fieldKey,
          fieldType: dto.fieldType,
          options: dto.options || undefined,
          required: dto.required ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      this.logger.log(`Custom field definition created: ${dto.fieldKey} for ${dto.entityType}`);
      return def;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createDefinition.create');
    }
  }

  async updateDefinition(
    id: string,
    dto: UpdateCustomFieldDefinitionDto,
  ) {
    await this.getDefinition(id);

    try {
      const def = await this.prisma.customFieldDefinition.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Custom field definition ${id} updated`);
      return def;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateDefinition.update');
    }
  }

  async deleteDefinition(id: string) {
    await this.getDefinition(id);

    try {
      const def = await this.prisma.customFieldDefinition.delete({
        where: { id },
      });
      this.logger.log(`Custom field definition ${id} deleted`);
      return def;
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteDefinition.delete');
    }
  }

  async reorderDefinitions(entityType: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.customFieldDefinition.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    try {
      await this.prisma.$transaction(updates);
      this.logger.log(`Reordered ${orderedIds.length} custom field definitions for ${entityType}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'reorderDefinitions.$transaction');
    }

    return this.getDefinitions(entityType);
  }

  // ─── Values ────────────────────────────────────

  async getValuesForEntity(entityType: string, entityId: string) {
    const values = await this.prisma.customFieldValue.findMany({
      where: { entityType, entityId },
      include: { definition: true },
    });

    const result: Record<string, unknown> = {};
    for (const v of values) {
      result[v.definition.fieldKey] = {
        definitionId: v.definitionId,
        fieldKey: v.definition.fieldKey,
        label: v.definition.label,
        fieldType: v.definition.fieldType,
        value: v.value,
      };
    }
    return result;
  }

  async setValuesForEntity(
    entityType: string,
    entityId: string,
    fields: Array<{ definitionId: string; value: unknown }>,
  ) {
    const results = [];

    for (const field of fields) {
      const def = await this.getDefinition(field.definitionId);
      if (def.entityType !== entityType) {
        throw new BadRequestException(
          `Field ${def.label} is for ${def.entityType}, not ${entityType}`,
        );
      }

      if (
        def.required &&
        (field.value === null ||
          field.value === undefined ||
          field.value === '')
      ) {
        throw new BadRequestException(`Field "${def.label}" is required`);
      }

      try {
        const result = await this.prisma.customFieldValue.upsert({
          where: {
            definitionId_entityType_entityId: {
              definitionId: field.definitionId,
              entityType,
              entityId,
            },
          },
          update: { value: field.value as Prisma.InputJsonValue },
          create: {
            definitionId: field.definitionId,
            entityType,
            entityId,
            value: field.value as Prisma.InputJsonValue,
          },
        });
        results.push(result);
      } catch (error) {
        handlePrismaError(error, this.logger, 'setValuesForEntity.upsert');
      }
    }

    this.logger.log(`Set ${results.length} custom field values for ${entityType} ${entityId}`);
    return results;
  }

  async deleteValuesForEntity(entityType: string, entityId: string) {
    try {
      const result = await this.prisma.customFieldValue.deleteMany({
        where: { entityType, entityId },
      });
      this.logger.log(`Deleted custom field values for ${entityType} ${entityId}`);
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteValuesForEntity.deleteMany');
    }
  }
}
