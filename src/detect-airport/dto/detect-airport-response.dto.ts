import { ApiProperty } from '@nestjs/swagger';

export class DetectAirportResponseDto {
  @ApiProperty({
    description: 'Havalimanı IATA kodu',
    example: 'IST',
  })
  iata: string;

  @ApiProperty({
    description: 'Şehir adı',
    example: 'Istanbul',
  })
  city: string;

  @ApiProperty({
    description: 'Havalimanı adı',
    example: 'Istanbul Airport',
  })
  airport_name: string;
}
