import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionStatusResponseDto {
  @ApiProperty({ description: 'Sipariş ID', example: 'IB_1758739748270_Z22460' })
  orderId: string;

  @ApiProperty({ description: 'İşlem durumu', example: 'success' })
  status: string;

  @ApiProperty({ description: 'İşlem tutarı (TL)', example: '100.00' })
  amount: string;

  @ApiProperty({ description: 'Para birimi kodu', example: '949' })
  currencyCode: string;

  @ApiProperty({ description: 'İşlem tipi', example: 'sales' })
  transactionType: string;

  @ApiProperty({ description: 'İşlem başarılı mı?', example: true })
  isSuccessful: boolean;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2025-09-24T18:49:08.270Z' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Güncellenme tarihi', example: '2025-09-24T18:49:15.123Z' })
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Banka yanıt bilgileri' })
  bankResponse?: {
    response: string;
    procreturncode: string;
    authcode?: string;
  };

  @ApiPropertyOptional({ description: 'Hata detayları' })
  errorDetails?: any;
}

