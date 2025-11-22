import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Location {
  @ApiProperty({ example: 'IST' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsNotEmpty()
  type: number;
}

export class CheckinDatesRequestDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  ProductType: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  ServiceType: number;

  @ApiProperty({ type: [Location] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  DepartureLocations: Location[];

  @ApiProperty({ type: [Location] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  ArrivalLocations: Location[];
}

