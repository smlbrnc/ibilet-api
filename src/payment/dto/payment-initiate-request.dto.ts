import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsEmail, IsIP, IsNotEmpty, IsOptional, Min, Max, MinLength, MaxLength, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CardInfoDto } from './card-info.dto';
import { CurrencyCode } from '../enums/currency-codes.enum';
import { TransactionType } from '../enums/transaction-types.enum';

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
    description: 'İşlem tipi',
    example: 'sales',
    enum: TransactionType,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(TransactionType)
  transactionType: string;

  @ApiPropertyOptional({
    description: 'Taksit sayısı (0 = Peşin)',
    example: 0,
    minimum: 0,
    maximum: 12,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(12)
  installmentCount?: number;

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
    description: 'Şirket adı',
    example: 'IBGROUP',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Şirket adı en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Şirket adı en fazla 100 karakter olmalıdır' })
  companyName: string;

  @ApiProperty({
    description: 'Kart bilgileri',
    type: CardInfoDto,
  })
  @ValidateNested()
  @Type(() => CardInfoDto)
  @IsNotEmpty()
  cardInfo: CardInfoDto;
}

