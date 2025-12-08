import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, IsEnum } from 'class-validator';
import { CurrencyCode } from '../enums/currency-codes.enum';

export class ValidatePromoCodeDto {
  @ApiProperty({
    description: 'Promosyon kodu',
    example: 'SUMMER2025',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'İşlem tutarı (kuruş cinsinden)',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
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

  @ApiPropertyOptional({
    description: 'Kullanıcı ID (üye olmayan kullanıcılar için boş bırakılabilir)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

