import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReservationDetailRequestDto {
  @ApiProperty({
    description: 'Rezervasyon numarası (PNR)',
    example: 'PX041340',
  })
  @IsNotEmpty()
  @IsString()
  ReservationNumber: string;
}

