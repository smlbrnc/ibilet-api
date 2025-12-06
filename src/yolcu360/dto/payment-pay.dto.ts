import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PaymentPayDto {
  @ApiProperty({
    description: 'Transaction ID (orderID)',
    example: 'order_123456789',
  })
  @IsString()
  @IsNotEmpty()
  orderID: string;

  @ApiProperty({
    description: 'Ödeme tipi (sabit değer: limit)',
    example: 'limit',
    default: 'limit',
  })
  @IsString()
  @IsNotEmpty()
  paymentType: string;
}
