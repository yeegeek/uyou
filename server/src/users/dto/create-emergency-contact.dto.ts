import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmergencyContactDto {
  @ApiProperty({ description: '联系人姓名', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '联系人电话', maxLength: 20 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ description: '关系', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  relation?: string;

  @ApiPropertyOptional({ description: '是否为主要联系人', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
