import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';

export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export class OAuthSignInDto {
  @ApiProperty({ enum: OAuthProvider, description: 'OAuth provider (google veya apple)' })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiPropertyOptional({ description: 'Başarılı girişten sonra yönlendirilecek URL' })
  @IsOptional()
  @IsUrl()
  redirectTo?: string;
}

