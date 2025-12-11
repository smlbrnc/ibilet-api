import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEmail,
  IsIP,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardInfoDto } from './card-info.dto';
import { CurrencyCode } from '../enums/currency-codes.enum';
import { ProductType } from '../enums/product-type.enum';

export class PaymentInitiateRequestDto {
  @ApiProperty({
    description: 'PAX API transaction ID (booking tanımlayıcı)',
    example: 'abc123-def456-ghi789',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Tekrar eden istekleri engellemek için unique key',
    example: 'abc123-def456-ghi789-pay-001',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({
    description: 'İşlem tutarı (kuruş cinsinden)',
    example: 10000,
    minimum: 1,
    maximum: 99999999999,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(99999999999)
  amount: number;

  @ApiPropertyOptional({
    description: 'Para birimi kodu (949 = TRY, 840 = USD, 978 = EUR, 826 = GBP, 392 = JPY)',
    example: '949',
    enum: CurrencyCode,
    default: CurrencyCode.TRY,
  })
  @IsString()
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: string;

  @ApiProperty({
    description: 'Müşteri e-posta adresi',
    example: 'test@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Müşteri IP adresi',
    example: '192.168.1.1',
  })
  @IsIP()
  @IsNotEmpty()
  customerIp: string;

  @ApiProperty({
    description: 'Kart bilgileri',
    type: CardInfoDto,
  })
  @ValidateNested()
  @Type(() => CardInfoDto)
  @IsNotEmpty()
  cardInfo: CardInfoDto;

  @ApiProperty({
    description: 'Ürün tipi',
    enum: ProductType,
    example: ProductType.FLIGHT,
    default: ProductType.FLIGHT,
  })
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @ApiPropertyOptional({
    description: 'Promosyon kodu',
    example: 'SUMMER2025',
  })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'İndirim öncesi orijinal tutar (kuruş cinsinden) - promosyon kodu kullanılıyorsa gönderilmeli',
    example: 10000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  originalAmount?: number;
}
