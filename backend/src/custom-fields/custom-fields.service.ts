import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
} from './dto/custom-fields.dto';

@Injectable()
export class CustomFieldsService {
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
    if (!def)
      throw new NotFoundException(
        'Custom field definition not found',
      );
    return def;
  }

  async createDefinition(dto: CreateCustomFieldDefinitionDto) {
    // Validate fieldKey uniqueness per entityType
    const exists = await this.prisma.customFieldDefinition.findUnique(
      {
        where: {
          entityType_fieldKey: {
            entityType: dto.entityType,
            fieldKey: dto.fieldKey,
          },
        },
      },
    );
    if (exists)
      throw new BadRequestException(
        `Field key "${dto.fieldKey}" already exists for ${dto.entityType}`,
      );

    return this.prisma.customFieldDefinition.create({
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
  }

  async updateDefinition(
    id: string,
    dto: UpdateCustomFieldDefinitionDto,
  ) {
    await this.getDefinition(id);
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDefinition(id: string) {
    await this.getDefinition(id);
    // Cascade deletes values automatically
    return this.prisma.customFieldDefinition.delete({
      where: { id },
    });
  }

  async reorderDefinitions(entityType: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.customFieldDefinition.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.getDefinitions(entityType);
  }

  // ─── Values ────────────────────────────────────

  async getValuesForEntity(entityType: string, entityId: string) {
    const values = await this.prisma.customFieldValue.findMany({
      where: { entityType, entityId },
      include: { definition: true },
    });

    // Return as a map: fieldKey → value
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

      // Validate required
      if (
        def.required &&
        (field.value === null ||
          field.value === undefined ||
          field.value === '')
      ) {
        throw new BadRequestException(
          `Field "${def.label}" is required`,
        );
      }

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
    }

    return results;
  }

  async deleteValuesForEntity(entityType: string, entityId: string) {
    return this.prisma.customFieldValue.deleteMany({
      where: { entityType, entityId },
    });
  }
}
