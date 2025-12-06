import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

/**
 * ProductInfo Request DTO
 * Belirli bir ürünün (otel/uçak) detaylı bilgilerini almak için kullanılır
 */
export class ProductInfoRequestDto {
  @ApiProperty({
    description: 'Ürün tipi (2: Otel, 3: Uçak)',
    example: 2,
    enum: [2, 3],
  })
  @IsNotEmpty()
  @IsNumber()
  productType: number;

  @ApiProperty({
    description: 'Sağlayıcı ID (Owner Provider)',
    example: 2,
  })
  @IsNotEmpty()
  @IsNumber()
  ownerProvider: number;

  @ApiProperty({
    description: 'Ürün ID (Product ID)',
    example: '325772',
  })
  @IsNotEmpty()
  @IsString()
  product: string;

  @ApiProperty({
    description: 'Dil/Kültür kodu',
    example: 'tr-TR',
    default: 'tr-TR',
  })
  @IsNotEmpty()
  @IsString()
  culture: string;
}
