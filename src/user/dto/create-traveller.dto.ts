import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsDateString, IsEmail } from 'class-validator';

export enum TravellerType {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT = 'infant',
}

export enum TravellerTitle {
  MR = 'mr',
  MRS = 'mrs',
  MS = 'ms',
  MISS = 'miss',
}

export enum TravellerGender {
  MALE = 'male',
  FEMALE = 'female',
}

export class CreateTravellerDto {
  @ApiProperty({ enum: TravellerType, example: 'adult', description: 'Yolcu tipi' })
  @IsEnum(TravellerType)
  traveller_type: TravellerType;

  @ApiPropertyOptional({ enum: TravellerTitle, example: 'mr', description: 'Ünvan' })
  @IsOptional()
  @IsEnum(TravellerTitle)
  title?: TravellerTitle;

  @ApiProperty({ example: 'Ahmet', description: 'Ad' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Yılmaz', description: 'Soyad' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiPropertyOptional({ example: '1990-01-15', description: 'Doğum tarihi' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: TravellerGender, description: 'Cinsiyet' })
  @IsOptional()
  @IsEnum(TravellerGender)
  gender?: TravellerGender;

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

  @ApiPropertyOptional({ example: 'TR', description: 'Pasaport ülkesi' })
  @IsOptional()
  @IsString()
  passport_country?: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'TC Kimlik No' })
  @IsOptional()
  @IsString()
  tc_kimlik_no?: string;

  @ApiPropertyOptional({ example: 'ahmet@example.com', description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+905551234567', description: 'Telefon' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: false, description: 'Ana yolcu mu?' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

