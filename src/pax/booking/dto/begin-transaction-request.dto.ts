import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class BeginTransactionRequestDto {
  @ApiProperty({
    description: 'Offer ID listesi',
    example: ['13$3$1~^006^~...'],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  offerIds: string[];

  @ApiProperty({
    description: 'Para birimi',
    example: 'TRY',
    default: 'TRY',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Dil/Kültür kodu',
    example: 'tr-TR',
    default: 'tr-TR',
  })
  @IsNotEmpty()
  @IsString()
  culture: string;
}
