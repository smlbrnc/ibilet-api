import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ContactCategory {
  GENERAL = 'general',
  BOOKING = 'booking',
  PAYMENT = 'payment',
  REFUND = 'refund',
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
  OTHER = 'other',
}

export class CreateContactDto {
  @ApiProperty({ example: 'Ahmet Yılmaz', description: 'İsim' })
  @IsString()
  @IsNotEmpty({ message: 'İsim gereklidir' })
  name: string;

  @ApiProperty({ example: 'ahmet@example.com', description: 'Email adresi' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiPropertyOptional({ example: '+905551234567', description: 'Telefon numarası' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Rezervasyon Hakkında', description: 'Konu' })
  @IsString()
  @IsNotEmpty({ message: 'Konu gereklidir' })
  subject: string;

  @ApiProperty({ example: 'Rezervasyonumla ilgili bilgi almak istiyorum...', description: 'Mesaj' })
  @IsString()
  @IsNotEmpty({ message: 'Mesaj gereklidir' })
  message: string;

  @ApiPropertyOptional({ enum: ContactCategory, example: 'booking', description: 'Kategori' })
  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory;

  @ApiPropertyOptional({ example: 'PX123456', description: 'Rezervasyon referansı' })
  @IsOptional()
  @IsString()
  booking_reference?: string;
}

