import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DigestService } from './digest.service';

@Module({
  providers: [EmailService, DigestService],
  exports: [EmailService],
})
export class EmailModule {}
