import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * OfferDetails Request DTO
 * GetOffers sonucunda dönen offer ID'leri ile daha detaylı teklif bilgisi almak için kullanılır
 */
export class OfferDetailsRequestDto {
  @ApiProperty({
    description:
      'Tekil offer ID - string veya array kabul eder (offerId veya offerIds\'den biri zorunlu)',
    example:
      '2$2$AE~^005^~23675~^005^~57456.964840~^005^~~^005^~0~^005^~452a7060-d02e-4a6b-a585-4117fcf8c01b',
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
      '2$2$AE~^005^~23675~^005^~57456.964840~^005^~~^005^~0~^005^~452a7060-d02e-4a6b-a585-4117fcf8c01b',
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
    description: 'Ürün bilgilerini de getir (productInfo)',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  getProductInfo?: boolean;
}

