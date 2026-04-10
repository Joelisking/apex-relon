import { Module } from '@nestjs/common';
import { PtoService } from './pto.service';
import { PtoController } from './pto.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [PtoController],
  providers: [PtoService, PrismaService],
  exports: [PtoService],
})
export class PtoModule {}
