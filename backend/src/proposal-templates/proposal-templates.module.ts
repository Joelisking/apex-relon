import { Module } from '@nestjs/common';
import { ProposalTemplatesController } from './proposal-templates.controller';
import { ProposalTemplatesService } from './proposal-templates.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ProposalTemplatesController],
  providers: [ProposalTemplatesService],
})
export class ProposalTemplatesModule {}
