import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
} from './dto/products.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;

    return this.prisma.product.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      this.logger.warn(`Product ${id} not found`);
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          defaultPrice: dto.defaultPrice ?? 0,
          unit: dto.unit,
          category: dto.category,
        },
      });
      this.logger.log(`Product created: ${product.id} "${product.name}"`);
      return product;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ProductsService.create');
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Product updated: ${id}`);
      return product;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ProductsService.update');
    }
  }

  async delete(id: string) {
    await this.findOne(id);
    try {
      const deleted = await this.prisma.product.delete({ where: { id } });
      this.logger.log(`Product deleted: ${id}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ProductsService.delete');
    }
  }
}
