import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsObject } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email adresi' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Şifre (min 6 karakter)' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  @ApiPropertyOptional({ example: { name: 'John Doe' }, description: 'Kullanıcı metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
