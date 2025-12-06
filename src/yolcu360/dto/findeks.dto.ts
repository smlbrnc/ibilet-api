import { IsString, IsNumber, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FindeksCheckDto {
  @ApiProperty({
    description: 'Müşteri TC kimlik numarası',
    example: '11223344556',
  })
  @IsString()
  identityNumber: string;

  @ApiProperty({
    description: 'Arama sonucundan gelen entegrasyon takip kodu',
    example: 'integrationCode123',
  })
  @IsString()
  integrationCode: string;
}

export class FindeksPhoneListDto {
  @ApiProperty({
    description: 'Müşteri TC kimlik numarası',
    example: '11223344556',
  })
  @IsString()
  identityNumber: string;

  @ApiProperty({
    description: 'Arama sonucundan gelen entegrasyon takip kodu',
    example: 'integrationCode123',
  })
  @IsString()
  integrationCode: string;
}

export class FindeksReportDto {
  @ApiProperty({
    description: 'Müşteri TC kimlik numarası',
    example: '45473452',
  })
  @IsString()
  identityNumber: string;

  @ApiProperty({
    description: 'Müşteri doğum tarihi (YYYY-MM-DD)',
    example: '1994-01-15',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description: 'Ehliyet alınma tarihi (YYYY-MM-DD)',
    example: '2012-03-20',
  })
  @IsDateString()
  driverLicenseDate: string;

  @ApiProperty({
    description: 'Müşteri telefon numarası (E.164 format)',
    example: '+905554443322',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Telefon listesinden gelen telefon anahtarı',
    example: 123,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  phoneKey: number;

  @ApiProperty({
    description: 'Arama sonucundan gelen entegrasyon takip kodu',
    example: 'integrationCode123',
  })
  @IsString()
  integrationCode: string;
}

export class FindeksPinConfirmDto {
  @ApiProperty({
    description: 'Rapor oluşturma işleminden dönen Findeks kodu',
    example: '45473452',
  })
  @IsString()
  findeksCode: string;

  @ApiProperty({
    description: 'SMS ile gönderilen PIN kodu',
    example: '123456',
  })
  @IsString()
  pinCode: string;

  @ApiProperty({
    description: 'Arama sonucundan gelen entegrasyon takip kodu',
    example: 'integrationCode123',
  })
  @IsString()
  integrationCode: string;
}

export class FindeksPinRenewDto {
  @ApiProperty({
    description: 'Rapor oluşturma işleminden dönen Findeks kodu',
    example: '45473452',
  })
  @IsString()
  findeksCode: string;

  @ApiProperty({
    description: 'Arama sonucundan gelen entegrasyon takip kodu',
    example: 'integrationCode123',
  })
  @IsString()
  integrationCode: string;
}

export class PhoneListItem {
  @ApiProperty({
    description: 'Telefon numarası için benzersiz anahtar',
    example: 711957237,
  })
  @IsNumber()
  key: number;

  @ApiProperty({
    description: 'Maskelenmiş telefon numarası',
    example: '533*****36',
  })
  @IsString()
  phone: string;
}

export class FindeksCheckResponse {
  @ApiProperty({
    description: 'Kredi uygunluk durumu',
    example: 'Positive',
    enum: ['Positive', 'Negative', 'Unknown', 'Positive With Young Driver'],
  })
  @IsString()
  status: string;
}

export class FindeksPhoneListResponse {
  @ApiProperty({
    description: 'Kayıtlı telefon numaraları listesi',
    type: [PhoneListItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneListItem)
  phoneList: PhoneListItem[];
}

export class FindeksReportResponse {
  @ApiProperty({
    description: 'Oluşturulan Findeks raporu kodu',
    example: 182783973,
  })
  @IsNumber()
  findeksCode: number;
}
