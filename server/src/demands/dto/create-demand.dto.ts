import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDemandDto {
  @ApiProperty({ description: '服务类目ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: '服务模式：1线下/2线上视频/3线上语音', minimum: 1, maximum: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  serviceMode: number;

  @ApiProperty({ description: '期望服务时间', example: '2026-01-15T14:00:00Z' })
  @IsDateString()
  serviceTime: string;

  @ApiProperty({ description: '期望服务时长（分钟）', minimum: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(30)
  duration: number;

  @ApiProperty({ description: '服务地址' })
  @IsString()
  @MinLength(1)
  location: string;

  @ApiPropertyOptional({ description: '服务地点纬度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional({ description: '服务地点经度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @ApiProperty({ description: '预算（元/小时）', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiPropertyOptional({ description: '期望顾问性别：0不限/1男/2女', minimum: 0, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2)
  genderPreference?: number;

  @ApiPropertyOptional({ description: '期望顾问最小年龄', minimum: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  ageMin?: number;

  @ApiPropertyOptional({ description: '期望顾问最大年龄', maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  ageMax?: number;

  @ApiPropertyOptional({ description: '需求描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
