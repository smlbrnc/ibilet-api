import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Gender } from '../enums/user.enum';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ahmet Yılmaz', description: 'Ad Soyad' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: '+905551234567', description: 'Telefon' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-01-15', description: 'Doğum tarihi' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Cinsiyet' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'TR', description: 'Uyruk' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: 'U12345678', description: 'Pasaport numarası' })
  @IsOptional()
  @IsString()
  passport_number?: string;

  @ApiPropertyOptional({ example: '2030-01-01', description: 'Pasaport geçerlilik tarihi' })
  @IsOptional()
  @IsDateString()
  passport_expiry?: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'TC Kimlik No' })
  @IsOptional()
  @IsString()
  tc_kimlik_no?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Profil fotoğrafı URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiPropertyOptional({ example: 'Atatürk Cad. No:1', description: 'Adres' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'İstanbul', description: 'Şehir' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Türkiye', description: 'Ülke' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '34000', description: 'Posta kodu' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ example: 'tr', description: 'Tercih edilen dil' })
  @IsOptional()
  @IsString()
  preferred_language?: string;

  @ApiPropertyOptional({ example: 'TRY', description: 'Tercih edilen para birimi' })
  @IsOptional()
  @IsString()
  preferred_currency?: string;

  @ApiPropertyOptional({ example: true, description: 'Pazarlama izni' })
  @IsOptional()
  @IsBoolean()
  marketing_consent?: boolean;
}

