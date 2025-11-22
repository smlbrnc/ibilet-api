import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * GetOffers Request DTO
 * Price search sonucunda dönen offerIds ile detaylı teklif bilgisi almak için kullanılır
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
    example: '8aadce01-cc29-4c3a-be50-24d5dc7f9080',
  })
  @IsNotEmpty()
  @IsString()
  searchId: string;

  @ApiProperty({
    description:
      'Tekil offer ID - string veya array kabul eder (offerId veya offerIds\'den biri zorunlu)',
    example:
      '2$2$GB~^005^~18265~^005^~1.088780~^005^~~^005^~0~^005^~8021eef5-3828-451e-8d49-b51e6af73bda',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Eğer array gelirse ilk elemanı al, string gelirse aynen kullan
    if (Array.isArray(value)) {
      return value.length > 0 ? value[0] : undefined;
    }
    return value;
  })
  @IsString()
  offerId?: string;

  @ApiProperty({
    description: 'Offer ID listesi (offerId veya offerIds\'den biri zorunlu)',
    example: [
      '13$3$0~^006^~~^006^~1~^006^~653.27~^006^~~^006^~653.27~^006^~rO0ABXNyADhjb20uc2FudHNnLmVuZ2luZS5mbGlnaHQubW9kZWwuaW5uZXIuRW5jb2RlZE9mZmVySWRNb2RlbF/kYZQ3KR-CAgAESQANc2VnbWVudE51bWJlckwAC2l0aW5lcmFyeUlkdAASTGphdmEvbGFuZy9TdHJpbmc7TAAHb2ZmZXJJZHEAfgABTAAIc2VhcmNoSWRxAH4AAXhwAAAAAXQAI2l0OmJlOjU1Om1ndzJrb2d4OkY6T0dQbGk5VDl0eDpveDoydAAjb2Y6YmU6NTU6bWd3MmtvZ3g6RjpsMjdDRWFMazl5Om94OjJ0AChBQUFCbWZhZzViQUFBQUFBbjJYbE5WQkJPekpfS0g5MTBJNVB2UT09',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ obj }) => {
    // offerId varsa ve offerIds yoksa, offerId'yi array'e çevir
    if (obj.offerId && (!obj.offerIds || obj.offerIds.length === 0)) {
      return [obj.offerId];
    }
    // offerId de offerIds de yoksa hata vermek için undefined dön
    if (!obj.offerId && (!obj.offerIds || obj.offerIds.length === 0)) {
      return undefined;
    }
    return obj.offerIds;
  })
  @ValidateIf((o) => {
    // Validasyon: offerId de offerIds de yoksa çalışsın
    const hasOfferId = o.offerId && o.offerId.length > 0;
    const hasOfferIds = o.offerIds && o.offerIds.length > 0;
    return !hasOfferId && !hasOfferIds;
  })
  @ArrayNotEmpty({ message: 'offerId veya offerIds alanlarından en az biri dolu olmalı' })
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
    example: 'tr-TR',
    default: 'tr-TR',
  })
  @IsNotEmpty()
  @IsString()
  culture: string;

  @ApiProperty({
    description: 'Oda bilgilerini getir (Otel için)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  getRoomInfo?: boolean;

  @ApiProperty({
    description: 'Ürün ID (Otel için)',
    example: '326323',
    required: false,
  })
  @IsOptional()
  @IsString()
  productId?: string;
}

