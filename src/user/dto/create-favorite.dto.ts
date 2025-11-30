import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum FavoriteType {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
  DESTINATION = 'destination',
}

export class CreateFavoriteDto {
  @ApiProperty({ enum: FavoriteType, example: 'flight', description: 'Favori tipi' })
  @IsEnum(FavoriteType)
  type: FavoriteType;

  @ApiProperty({ example: 'İstanbul - Antalya Uçuşu', description: 'Başlık' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Ekonomi sınıfı, direkt uçuş', description: 'Açıklama' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'Görsel URL' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ 
    example: { origin: 'IST', destination: 'AYT', date: '2024-06-15' }, 
    description: 'Favori detay verisi (JSON)' 
  })
  @IsObject()
  data: Record<string, any>;
}

