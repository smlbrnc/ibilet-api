import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOption {
  POPULARITY = 'POPULARITY',
  RATING = 'RATING',
  DISTANCE = 'DISTANCE',
}

export class NearbyQueryDto {
  @ApiProperty({
    description: 'Enlem (latitude) - default: 41.036944',
    example: 41.036944,
  })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({
    description: 'Boylam (longitude) - default: 28.985833',
    example: 28.985833,
  })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiProperty({
    description: 'Arama yarıçapı (metre)',
    example: 2000,
    required: false,
    default: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  @Type(() => Number)
  radius?: number = 2000;

  @ApiProperty({
    description: 'Kategori ID\'leri (virgülle ayrılmış, ör: 16000,13000)',
    example: '16000,13000',
    required: false,
  })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiProperty({
    description: 'Maksimum sonuç sayısı',
    example: 12,
    required: false,
    default: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 12;

  @ApiProperty({
    description: 'Sıralama kriteri',
    enum: SortOption,
    example: SortOption.POPULARITY,
    required: false,
    default: SortOption.POPULARITY,
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.POPULARITY;
}

