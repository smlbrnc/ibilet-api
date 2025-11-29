import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetBalanceDto {
  @ApiProperty({
    description: 'stip: 1 = paket/kampanya, 2 = kredi, 3 = tüm varlık',
    example: 3,
    enum: [1, 2, 3],
  })
  @IsInt()
  @Min(1)
  @Max(3)
  stip: number;
}

