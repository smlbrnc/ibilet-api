import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: '10001' })
  id: string;

  @ApiProperty({ example: 2 })
  type: number;
}

class RoomCriteria {
  @ApiProperty({ example: 2 })
  adult: number;

  @ApiProperty({ type: [Number], example: [1], required: false })
  @IsOptional()
  childAges?: number[];
}

class ProductPriceCategory {
  @ApiProperty({ example: '103746' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 'a' })
  @IsString()
  @IsNotEmpty()
  category: string;
}

export class HotelPriceSearchDto {
  @ApiProperty({ example: 2, description: '2=Hotel' })
  @IsNumber()
  @IsNotEmpty()
  productType: number;

  @ApiProperty({ type: [RoomCriteria] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomCriteria)
  @IsNotEmpty()
  roomCriteria: RoomCriteria[];

  @ApiProperty({ example: 'DE' })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiProperty({ example: '2025-10-22' })
  @IsString()
  @IsNotEmpty()
  checkIn: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  night: number;

  @ApiProperty({ example: 'TRY' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'tr-TR' })
  @IsString()
  @IsNotEmpty()
  culture: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  checkAllotment: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  checkStopSale: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsNotEmpty()
  getOnlyDiscountedPrice: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsNotEmpty()
  getOnlyBestOffers: boolean;

  @ApiProperty({ type: [Location], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  @IsOptional()
  arrivalLocations?: Location[];

  @ApiProperty({ type: [String], required: false, example: ['326323'] })
  @IsArray()
  @IsOptional()
  Products?: string[];

  @ApiProperty({
    type: [ProductPriceCategory],
    required: false,
    description: 'Belirli ürünler için fiyat kategorisi filtresi',
    example: [{ product: '103746', category: 'a' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceCategory)
  @IsOptional()
  productPriceCategories?: ProductPriceCategory[];
}

