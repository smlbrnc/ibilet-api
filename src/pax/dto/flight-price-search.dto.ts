import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class Location {
  @ApiProperty({ example: 'IST' })
  id: string;

  @ApiProperty({ example: 2 })
  type: number;
}

class Passenger {
  @ApiProperty({ example: 1, description: '1=Adult, 2=Child, 3=Infant' })
  type: number;

  @ApiProperty({ example: 1 })
  count: number;
}

export class FlightPriceSearchDto {
  @ApiProperty({ example: 3, description: '3=Flight' })
  @IsNumber()
  @IsNotEmpty()
  ProductType: number;

  @ApiProperty({ type: [String], example: ['1'] })
  @IsArray()
  @IsNotEmpty()
  ServiceTypes: string[];

  @ApiProperty({ example: '2025-10-19' })
  @IsString()
  @IsNotEmpty()
  CheckIn: string;

  @ApiProperty({ type: [Location] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  @IsNotEmpty()
  DepartureLocations: Location[];

  @ApiProperty({ type: [Location] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  @IsNotEmpty()
  ArrivalLocations: Location[];

  @ApiProperty({ type: [Passenger] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Passenger)
  @IsNotEmpty()
  Passengers: Passenger[];

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsNotEmpty()
  showOnlyNonStopFlight: boolean;

  @ApiProperty({ example: 'tr-TR' })
  @IsString()
  @IsNotEmpty()
  Culture: string;

  @ApiProperty({ example: 'TRY' })
  @IsString()
  @IsNotEmpty()
  Currency: string;

  @ApiPropertyOptional({ example: 6 })
  @IsNumber()
  @IsOptional()
  Night?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Paket teklif toplam fiyatını devre dışı bırak',
  })
  @IsBoolean()
  @IsOptional()
  disablePackageOfferTotalPrice?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Uçuş ücretlerini hesapla' })
  @IsBoolean()
  @IsOptional()
  calculateFlightFees?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Uçuş paketini zorla' })
  @IsBoolean()
  @IsOptional()
  forceFlightBundlePackage?: boolean;
}
