// Simplified for now - full implementation would include all traveller fields
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class SetReservationInfoRequestDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '1e42fb8c-f885-4e5d-9d91-72c40a4b56b2',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @ApiProperty({
    description: 'Yolcu bilgileri listesi',
    type: 'array',
  })
  @IsNotEmpty()
  @IsArray()
  travellers: any[]; // Simplified - ref kodda detailed structure var
}

