import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVerificationDto {
  @ApiProperty({ description: '真实姓名', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  realName: string;

  @ApiProperty({ description: '身份证号', maxLength: 18 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(18)
  idCardNo: string;

  @ApiProperty({ description: '身份证正面照片URL', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  idCardFront: string;

  @ApiProperty({ description: '身份证反面照片URL', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  idCardBack: string;

  @ApiProperty({ description: '人脸照片URL', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  facePhoto: string;
}
