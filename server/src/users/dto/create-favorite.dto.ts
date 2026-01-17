import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ description: '被收藏的用户/顾问ID' })
  @IsNotEmpty()
  @IsString()
  targetId: string;

  @ApiProperty({ description: '收藏类型：1普通收藏/2特别关注', minimum: 1, maximum: 2, default: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(2)
  favoriteType: number;

  @ApiPropertyOptional({ description: '备注名', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  remark?: string;
}
