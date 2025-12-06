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
import { TransactionType } from '../enums/transaction-types.enum';

export class DirectPaymentRequestDto {
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
    description: 'Para birimi kodu (949 = TRY)',
    example: '949',
    enum: CurrencyCode,
    default: CurrencyCode.TRY,
  })
  @IsString()
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: string;

  @ApiPropertyOptional({
    description: 'İşlem tipi (sales, preauth, refund)',
    example: 'sales',
    enum: TransactionType,
    default: TransactionType.SALES,
  })
  @IsString()
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: string;

  @ApiProperty({
    description: 'Müşteri e-posta adresi',
    example: 'test@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Müşteri IP adresi',
    example: '192.168.0.1',
  })
  @IsIP()
  @IsNotEmpty()
  customerIp: string;

  @ApiPropertyOptional({
    description: 'Sipariş ID - Refund için zorunlu, Sales için opsiyonel (otomatik oluşturulur)',
    example: 'IB_DIRECT_1234567890_A12345',
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Kart bilgileri - Sales/Preauth için zorunlu, Refund için gerekmez',
    type: CardInfoDto,
  })
  @ValidateNested()
  @Type(() => CardInfoDto)
  @IsOptional()
  cardInfo?: CardInfoDto;
}
