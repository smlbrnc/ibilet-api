import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

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
}

