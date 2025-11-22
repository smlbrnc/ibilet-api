import { ApiProperty } from '@nestjs/swagger';

export class NearbyPlaceDto {
  @ApiProperty({
    description: 'Foursquare yer ID\'si',
    example: '4b5e6f8d9a0b1c2d3e4f5a6b',
  })
  id: string;

  @ApiProperty({
    description: 'Yer adı',
    example: 'Ayasofya Camii',
  })
  name: string;

  @ApiProperty({
    description: 'Enlem (latitude)',
    example: 41.0086,
  })
  lat: number;

  @ApiProperty({
    description: 'Boylam (longitude)',
    example: 28.98,
  })
  lng: number;

  @ApiProperty({
    description: 'Kullanıcıya olan mesafe (metre)',
    example: 120,
  })
  distance: number;

  @ApiProperty({
    description: 'Kategori ID\'si',
    example: 16000,
    nullable: true,
  })
  categoryId: number | null;

  @ApiProperty({
    description: 'Kategori adı',
    example: 'Tarihi Yer',
    nullable: true,
  })
  categoryName: string | null;

  @ApiProperty({
    description: 'Adres',
    example: 'Sultan Ahmet, Ayasofya Meydanı',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'Şehir',
    example: 'İstanbul',
    nullable: true,
  })
  city: string | null;

  @ApiProperty({
    description: 'Ülke',
    example: 'Türkiye',
    nullable: true,
  })
  country: string | null;

  @ApiProperty({
    description: 'Popülerlik skoru',
    example: 0.95,
    nullable: true,
  })
  popularity: number | null;

  @ApiProperty({
    description: 'Değerlendirme puanı',
    example: 4.5,
    nullable: true,
  })
  rating: number | null;

  @ApiProperty({
    description: 'Fiyat seviyesi (1-4)',
    example: 2,
    nullable: true,
  })
  priceLevel: number | null;
}

