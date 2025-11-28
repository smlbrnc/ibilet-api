import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsEmail, IsIP, IsNotEmpty, IsOptional, Min, Max, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CardInfoDto } from './card-info.dto';
import { CurrencyCode } from '../enums/currency-codes.enum';

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
    maximum: 999999999,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(999999999)
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
}

