import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsUrl } from 'class-validator';

export class MagicLinkDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email adresi' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/callback', description: 'Redirect URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Geçerli bir URL giriniz' })
  redirectTo?: string;
}

