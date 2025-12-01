import { IsString, IsObject, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class LocationCoordinates {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;
}

export class CarSearchDto {
  @IsString()
  checkInDateTime: string;

  @IsString()
  checkOutDateTime: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  paymentType?: string;

  @IsObject()
  @Type(() => LocationCoordinates)
  checkInLocation: LocationCoordinates;

  @IsObject()
  @Type(() => LocationCoordinates)
  checkOutLocation: LocationCoordinates;
}

