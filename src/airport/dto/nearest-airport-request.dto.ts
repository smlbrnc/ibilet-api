import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsArray, IsString } from 'class-validator';

export class NearestAirportRequestDto {
  @ApiProperty({
    description: 'Enlem (Latitude)',
    example: 25.09848,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Boylam (Longitude)',
    example: 55.12373,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Havalimanı tipi filtresi (opsiyonel). Gönderilmezse tüm havalimanları kontrol eder.',
    example: ['large_airport', 'medium_airport'],
    required: false,
    isArray: true,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[];
}

