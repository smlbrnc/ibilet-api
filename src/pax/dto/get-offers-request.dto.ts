import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * GetOffers Request DTO
 * Price search sonucunda dönen offerIds ile detaylı teklif bilgisi almak için kullanılır
 * 
 * Uçak (productType: 3) için offerIds (array) kullanılır
 * Otel (productType: 2) için offerId (string) kullanılır
 */
export class GetOffersRequestDto {
  @ApiProperty({
    description: 'Ürün tipi (2: Otel, 3: Uçak)',
    example: 3,
    enum: [2, 3],
  })
  @IsNotEmpty()
  @IsNumber()
  productType: number;

  @ApiProperty({
    description: 'Price search sonucunda dönen search ID',
    example: '52143f58-1fa2-4689-a8c6-59ffc1ff04e8',
  })
  @IsNotEmpty()
  @IsString()
  searchId: string;

  @ApiProperty({
    description: 'Tekil offer ID (Otel için - productType: 2)',
    example: '2$2$05ba9a42-24a8-41ce-bc61-40e6c443f9e5',
    required: false,
  })
  @IsOptional()
  @IsString()
  offerId?: string;

  @ApiProperty({
    description: 'Offer ID listesi (Uçak için - productType: 3)',
    example: [
      'F0BQUFwNnZvTUZkNV96VDdER19hcFdaTXh3PT0',
      'F1BQUFwNnZvTUZkNV96VDdER19hcFdaTXh3PT1',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offerIds?: string[];

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
    example: 'en-US',
    default: 'tr-TR',
  })
  @IsNotEmpty()
  @IsString()
  culture: string;

  @ApiProperty({
    description: 'Oda bilgilerini getir (Otel için - productType: 2)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  getRoomInfo?: boolean;

  @ApiProperty({
    description: 'Ürün ID (Otel için - productType: 2)',
    example: '105841',
    required: false,
  })
  @IsOptional()
  @IsString()
  productId?: string;
}
