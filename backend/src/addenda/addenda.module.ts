import { Module } from '@nestjs/common';
import { AddendaService } from './addenda.service';
import { AddendaController } from './addenda.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [AddendaController],
  providers: [AddendaService, PrismaService],
  exports: [AddendaService],
})
export class AddendaModule {}
