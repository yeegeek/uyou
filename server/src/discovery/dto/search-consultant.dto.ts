import { IsString, IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchConsultantDto {
  @ApiProperty({ description: '城市ID' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({ description: '服务类目ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '性别：1男/2女', minimum: 1, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  gender?: number;

  @ApiPropertyOptional({ description: '最小年龄', minimum: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  ageMin?: number;

  @ApiPropertyOptional({ description: '最大年龄', maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  ageMax?: number;

  @ApiPropertyOptional({ description: '最低价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional({ description: '最高价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({ description: '排序方式：rating/distance/orders', default: 'rating' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '下一页游标' })
  @IsOptional()
  @IsString()
  nextPage?: string;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
