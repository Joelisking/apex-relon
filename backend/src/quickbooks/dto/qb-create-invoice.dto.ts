import { IsString, IsUUID } from 'class-validator';

export class QbCreateInvoiceDto {
  @IsUUID()
  quoteId: string;

  @IsString()
  clientId: string;
}
