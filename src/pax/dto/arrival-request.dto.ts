import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class DepartureLocation {
  @ApiProperty({ example: 'IST' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  type: number;
}

export class ArrivalRequestDto {
  @ApiProperty({
    example: 3,
    description: 'Ürün tipi: 2=Otel, 3=Uçuş',
    enum: [2, 3],
  })
  @IsNumber()
  @IsNotEmpty()
  ProductType: number;

  @ApiProperty({
    example: 'AYT',
    description: 'Arama sorgusu (şehir/havalimanı/otel kodu)',
  })
  @IsString()
  @IsNotEmpty()
  Query: string;

  @ApiProperty({
    example: 1,
    description: 'Servis tipi (sadece uçuş için gerekli)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  ServiceType?: number;

  @ApiProperty({
    type: [DepartureLocation],
    description: 'Kalkış noktaları (sadece uçuş için gerekli)',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DepartureLocation)
  DepartureLocations?: DepartureLocation[];

  @ApiProperty({
    example: 'tr-TR',
    description: 'Dil kodu',
  })
  @IsString()
  @IsNotEmpty()
  Culture: string;
}
