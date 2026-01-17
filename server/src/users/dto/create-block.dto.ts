import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlockDto {
  @ApiProperty({ description: '被屏蔽的用户/顾问ID' })
  @IsNotEmpty()
  @IsString()
  blockedId: string;

  @ApiPropertyOptional({ description: '屏蔽原因', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
