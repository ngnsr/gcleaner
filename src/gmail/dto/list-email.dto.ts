import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListEmailsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max?: number;
}
