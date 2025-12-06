import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEmail,
  IsIP,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CurrencyCode } from '../enums/currency-codes.enum';

export class RefundRequestDto {
  @ApiProperty({
    description: "İade edilecek işlemin sipariş ID'si",
    example: 'IB_DIRECT_1760712302481_I93189',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'İade tutarı (kuruş cinsinden)',
    example: 5000,
    minimum: 1,
    maximum: 999999999,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(999999999)
  refundAmount: number;

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

  @ApiPropertyOptional({
    description: 'İade sebebi',
    example: 'Müşteri talebi',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(5, { message: 'İade sebebi en az 5 karakter olmalıdır' })
  @MaxLength(200, { message: 'İade sebebi en fazla 200 karakter olmalıdır' })
  refundReason?: string;
}
