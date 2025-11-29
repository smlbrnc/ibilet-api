import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({
    description: 'SMS gönderilecek GSM numarası',
    example: '905551234567',
  })
  @IsString()
  @IsNotEmpty()
  no: string;

  @ApiProperty({
    description: 'Mesaj metni (maksimum 917 karakter)',
    example: 'Merhaba, bu bir test mesajıdır.',
  })
  @IsString()
  @IsNotEmpty()
  msg: string;

  @ApiPropertyOptional({
    description: 'Mesaj başlığı (gönderici adı)',
    example: 'IBGROUP',
  })
  @IsString()
  @IsOptional()
  msgheader?: string;

  @ApiPropertyOptional({
    description: 'Karakter kodlaması (Türkçe karakterler için "TR")',
    example: 'TR',
  })
  @IsString()
  @IsOptional()
  encoding?: string;
}

