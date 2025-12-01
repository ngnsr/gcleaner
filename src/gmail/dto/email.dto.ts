import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class EmailDto {
  @ApiProperty({
    example: '178f6a2d3b',
    description: 'Unique Gmail message ID',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    example: 'alice@example.com',
    description: 'Email sender address',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'Meeting reminder', description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: 'Mon, 30 Nov 2025 14:23:00 +0000',
    description: 'Email date',
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}
