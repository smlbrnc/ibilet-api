import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DepartureRequestDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  ProductType: number;

  @ApiProperty({ example: 'IST' })
  @IsString()
  @IsNotEmpty()
  Query: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  ServiceType: number;

  @ApiProperty({ example: 'tr-TR' })
  @IsString()
  @IsNotEmpty()
  Culture: string;
}

