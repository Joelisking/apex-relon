import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Maps Prisma runtime errors to appropriate NestJS HTTP exceptions and logs them.
 * Call this inside a catch block — it always throws, so TypeScript flow analysis
 * knows control never returns from this function.
 *
 * Usage:
 *   try {
 *     return await this.prisma.project.create({ ... });
 *   } catch (error) {
 *     handlePrismaError(error, this.logger, 'create');
 *   }
 */
export function handlePrismaError(
  error: unknown,
  logger: Logger,
  operation: string,
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = error.meta?.target;
    const targetStr = Array.isArray(target)
      ? target.join(', ')
      : typeof target === 'string'
        ? target
        : 'unknown field';

    switch (error.code) {
      case 'P2002':
        logger.warn(`[${operation}] Unique constraint violation on: ${targetStr}`);
        throw new ConflictException(
          `A record with this ${targetStr} already exists`,
        );

      case 'P2003':
        logger.warn(`[${operation}] Foreign key constraint on: ${targetStr}`);
        throw new BadRequestException(
          `Referenced record does not exist (${targetStr})`,
        );

      case 'P2025': {
        const cause = (error.meta?.cause as string | undefined) ?? 'Record not found';
        logger.warn(`[${operation}] Record not found: ${cause}`);
        throw new NotFoundException(cause);
      }

      case 'P2014':
        logger.warn(`[${operation}] Relation constraint: ${error.meta?.relation_name}`);
        throw new BadRequestException(
          `Relation constraint failed: ${error.meta?.relation_name}`,
        );

      case 'P2016':
        logger.warn(`[${operation}] Query interpretation error: ${error.message}`);
        throw new BadRequestException('Invalid query — check provided IDs and filters');

      default:
        logger.error(
          `[${operation}] Prisma error ${error.code}: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException('Database operation failed');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error(`[${operation}] Prisma validation error: ${error.message}`, error.stack);
    throw new BadRequestException('Invalid data — check all required fields and types');
  }

  // Re-throw NestJS HTTP exceptions as-is (already correctly typed)
  if (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof NotFoundException ||
    error instanceof InternalServerErrorException
  ) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(`[${operation}] Unexpected error: ${message}`, stack);
  throw new InternalServerErrorException('An unexpected error occurred');
}
