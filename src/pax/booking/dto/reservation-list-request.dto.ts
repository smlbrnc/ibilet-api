// Simplified reservation list DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';

export class ReservationListRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  culture: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  dateCriterias: any[];

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  reservationStatus: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  limit: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  pageRowCount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  maxIndexNumber: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  minIndexNumber: number;
}

