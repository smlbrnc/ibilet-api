import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, ValidateNested } from 'class-validator';
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
    description: 'İşlem ID (Transaction ID)',
    example: 'c89c8c94-da29-4c49-bbb0-92e1b1649ec3',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;

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

