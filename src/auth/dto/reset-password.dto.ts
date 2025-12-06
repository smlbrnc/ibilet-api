import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email adresi' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiPropertyOptional({
    example: 'https://yoursite.com/reset-password',
    description: 'Şifre sıfırlama sonrası yönlendirilecek URL',
  })
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'Geçerli bir URL giriniz' })
  redirectTo?: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'newPassword123', description: 'Yeni şifre (min 6 karakter)' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;
}
