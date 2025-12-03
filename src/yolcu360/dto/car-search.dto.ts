import { IsString, IsObject, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LocationCoordinates {
  @ApiProperty({ description: 'Enlem (latitude)', example: 41.0082 })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Boylam (longitude)', example: 28.9784 })
  @IsNumber()
  lon: number;
}

export class CarSearchDto {
  @ApiProperty({
    description: 'Alış tarih ve saati (ISO 8601 format)',
    example: '2024-12-15T10:00:00',
  })
  @IsString()
  checkInDateTime: string;

  @ApiProperty({
    description: 'Teslim tarih ve saati (ISO 8601 format)',
    example: '2024-12-20T10:00:00',
  })
  @IsString()
  checkOutDateTime: string;

  @ApiProperty({
    description: 'Yaş grubu',
    example: '30+',
    required: false,
  })
  @IsString()
  @IsOptional()
  age?: string;

  @ApiProperty({
    description: 'Ülke kodu (ISO 2 karakter)',
    example: 'TR',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Ödeme tipi',
    example: 'creditCard',
    enum: ['creditCard', 'limit'],
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentType?: string;

  @ApiProperty({
    description: 'Alış lokasyonu koordinatları',
    type: LocationCoordinates,
  })
  @IsObject()
  @Type(() => LocationCoordinates)
  checkInLocation: LocationCoordinates;

  @ApiProperty({
    description: 'Teslim lokasyonu koordinatları',
    type: LocationCoordinates,
  })
  @IsObject()
  @Type(() => LocationCoordinates)
  checkOutLocation: LocationCoordinates;
}