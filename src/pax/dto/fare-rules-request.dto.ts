import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Segment DTO
 * Uçuş segmenti bilgisi
 */
export class SegmentDto {
  @ApiProperty({
    description: 'Segment ID',
    example: '1',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}

/**
 * FareRules Request DTO
 * Uçuş ücret kurallarını almak için kullanılır
 */
export class FareRulesRequestDto {
  @ApiProperty({
    description:
      'Rezervasyon numarası (Reservation Number) - transactionId ile birlikte kullanılabilir',
    example: 'RC00231C',
    required: false,
  })
  @IsOptional()
  @IsString()
  reservationNumber?: string;

  @ApiProperty({
    description: 'İşlem ID (Transaction ID) - Eski format desteği için',
    example: 'b59f54ef-867d-4415-93a1-b456361838cf',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Servis ID',
    example: '1',
  })
  @IsNotEmpty()
  @IsString()
  serviceId: string;

  @ApiProperty({
    description: 'Segment bilgisi',
    type: SegmentDto,
    example: { id: '1' },
  })
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => SegmentDto)
  segment: SegmentDto;

  @ApiProperty({
    description: 'Dil/Kültür kodu',
    example: 'en-US',
    default: 'en-US',
  })
  @IsNotEmpty()
  @IsString()
  culture: string;
}
