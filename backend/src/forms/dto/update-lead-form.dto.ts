import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadFormDto } from './create-lead-form.dto';

export class UpdateLeadFormDto extends PartialType(CreateLeadFormDto) {}
