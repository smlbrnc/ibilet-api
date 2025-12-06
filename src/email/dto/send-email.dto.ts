import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmailAttachmentDto {
  @ApiProperty({
    description: 'Dosya içeriği (base64 string veya Buffer)',
    example: 'base64...',
  })
  @IsNotEmpty({ message: 'Attachment içeriği boş olamaz' })
  content: string | Buffer;

  @ApiProperty({
    description: 'Dosya adı',
    example: 'booking-confirmation.pdf',
  })
  @IsString({ message: 'Dosya adı bir string olmalıdır' })
  @IsNotEmpty({ message: 'Dosya adı boş olamaz' })
  filename: string;

  @ApiProperty({
    description: 'Dosya tipi (MIME type)',
    example: 'application/pdf',
    required: false,
  })
  @IsString({ message: 'Content type bir string olmalıdır' })
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Alıcı email adresi',
    example: 'mustafa@example.com',
  })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @IsNotEmpty({ message: 'Email adresi boş olamaz' })
  to: string;

  @ApiProperty({
    description: 'Email konusu',
    example: 'İbilet Bilet Onayı',
  })
  @IsString({ message: 'Konu bir string olmalıdır' })
  @IsNotEmpty({ message: 'Konu boş olamaz' })
  subject: string;

  @ApiProperty({
    description: 'Email içeriği (HTML formatında)',
    example: '<p>Sayın yolcumuz, biletiniz başarıyla oluşturuldu.</p>',
  })
  @IsString({ message: 'HTML içeriği bir string olmalıdır' })
  @IsNotEmpty({ message: 'HTML içeriği boş olamaz' })
  html: string;

  @ApiProperty({
    description: 'Email ekleri (attachments)',
    type: [EmailAttachmentDto],
    required: false,
  })
  @IsArray({ message: 'Attachments bir array olmalıdır' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];
}
