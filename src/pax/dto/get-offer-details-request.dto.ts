import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ArrayNotEmpty } from 'class-validator';

/**
 * GetOfferDetails Request DTO
 * Teklif ID'leri ile detaylı teklif ve ürün bilgisi almak için kullanılır
 */
export class GetOfferDetailsRequestDto {
  @ApiProperty({
    description: 'Offer ID listesi',
    example: ['1$2$202202170837$TR$0|1528$1$167$15073$$$0$0$2'],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  offerIds: string[];

  @ApiProperty({
    description: 'Para birimi',
    example: 'EUR',
    default: 'EUR',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;
}
