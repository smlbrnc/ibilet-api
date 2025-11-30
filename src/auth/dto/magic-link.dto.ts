import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, Matches } from 'class-validator';

export class MagicLinkDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email adresi' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/callback', description: 'Redirect URL' })
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'Geçerli bir URL giriniz' })
  redirectTo?: string;
}

