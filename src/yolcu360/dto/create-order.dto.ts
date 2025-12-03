import {
  IsString,
  IsObject,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEmail,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ExtraProductDto {
  @ApiProperty({
    description: 'Ürün kodu (extra products aramasından alınan kod)',
    example: 'GPS',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Miktar (minimum 1)',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  quantity: number;
}

class PassengerDto {
  @ApiProperty({
    description: 'Yolcu adı',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Yolcu soyadı',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Geçerli e-posta adresi',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'ISO ülke kodu (2 karakter)',
    example: 'US',
  })
  @IsString()
  nationality: string;

  @ApiProperty({
    description: 'Telefon numarası (E.164 formatında)',
    example: '+1234567890',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Doğum tarihi (YYYY-MM-DD formatında)',
    example: '1990-01-15',
  })
  @IsString()
  birthDate: string;

  @ApiProperty({
    description: '11 haneli kimlik numarası (Türk vatandaşları için)',
    example: '12345678901',
    required: false,
  })
  @IsString()
  @IsOptional()
  identityNumber?: string;

  @ApiProperty({
    description: 'Pasaport numarası (Yurt dışı yolcular için)',
    example: 'ABC123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  passportNo?: string;
}

class BillingDto {
  @ApiProperty({
    description: 'Adres tipi',
    example: 'individual',
    enum: ['individual', 'corporateCompany'],
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Adres için özel etiket',
    example: 'Home Address',
    required: false,
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({
    description: 'Fatura adı',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Fatura soyadı',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Fatura e-posta adresi',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Fatura telefon numarası',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Tam ülke adı',
    example: 'United States',
  })
  @IsString()
  countryName: string;

  @ApiProperty({
    description: 'ISO ülke kodu (2 karakter)',
    example: 'US',
  })
  @IsString()
  countryCode: string;

  @ApiProperty({
    description: 'İdari bölüm seviyesi 1 (eyalet/il)',
    example: 'California',
  })
  @IsString()
  adm1: string;

  @ApiProperty({
    description: 'İdari bölüm seviyesi 2 (şehir/ilçe)',
    example: 'Los Angeles',
    required: false,
  })
  @IsString()
  @IsOptional()
  adm2?: string;

  @ApiProperty({
    description: 'Adres satırı (sokak adresi)',
    example: '123 Main Street',
    required: false,
  })
  @IsString()
  @IsOptional()
  line?: string;

  @ApiProperty({
    description: 'Posta/ZIP kodu',
    example: '90210',
    required: false,
  })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({
    description: 'Vergi dairesi',
    example: 'Kadıköy Vergi Dairesi',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxDivision?: string;

  @ApiProperty({
    description: 'Vergi kimlik numarası',
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxIdentifier?: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Ödeme yöntemi',
    example: 'creditCard',
    enum: ['creditCard', 'limit'],
  })
  @IsString()
  paymentType: string;

  @ApiProperty({
    description: 'Araç arama sonuçlarından alınan arama ID',
    example: 'search_123456789',
  })
  @IsString()
  searchID: string;

  @ApiProperty({
    description: 'Arama sonuçlarından seçilen araç ürün kodu',
    example: 'ECAR',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Tam kredi ödemesi kullan (acente yetkilendirilmiş olmalı)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFullCredit?: boolean;

  @ApiProperty({
    description: 'Sınırlı kredi ödemesi kullan (acente yetkilendirilmiş olmalı)',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isLimitedCredit?: boolean;

  @ApiProperty({
    description: 'Ekstra ürün ve hizmetler listesi',
    type: [ExtraProductDto],
    example: [
      { code: 'GPS', quantity: 1 },
      { code: 'CDW', quantity: 1 },
    ],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraProductDto)
  @IsOptional()
  extraProducts?: ExtraProductDto[];

  @ApiProperty({
    description: 'Birincil yolcu bilgileri',
    type: PassengerDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => PassengerDto)
  passenger: PassengerDto;

  @ApiProperty({
    description: 'Özel fatura adresi (opsiyonel, belirtilmezse yolcu bilgileri kullanılır)',
    type: BillingDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BillingDto)
  @IsOptional()
  billing?: BillingDto;
}