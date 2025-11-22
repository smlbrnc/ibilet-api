import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CancelReservationRequestDto {
  @ApiProperty({
    description: 'Rezervasyon numarası',
    example: 'SB003073',
  })
  @IsNotEmpty()
  @IsString()
  reservationNumber: string;

  @ApiProperty({
    description: 'İptal nedeni kodu',
    example: '6',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'İptal edilecek servis ID\'leri (opsiyonel - boş bırakılırsa tüm rezervasyon iptal olur)',
    example: ['1', '2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
}

