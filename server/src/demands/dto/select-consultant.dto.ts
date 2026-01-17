import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectConsultantDto {
  @ApiProperty({ description: '申请ID' })
  @IsString()
  applicationId: string;
}
