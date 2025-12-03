import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LocationSearchDto {
  @ApiProperty({
    description: 'Aranacak lokasyon adı (minimum 2 karakter)',
    example: 'Istanbul',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  query: string;
}