import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancellationPenaltyRequestDto {
  @ApiProperty({
    description: 'Rezervasyon numarası',
    example: 'SB003074',
  })
  @IsNotEmpty()
  @IsString()
  reservationNumber: string;
}

