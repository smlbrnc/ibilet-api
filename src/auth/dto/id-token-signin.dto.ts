import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OAuthProvider } from './oauth-signin.dto';

export class IdTokenSignInDto {
  @ApiProperty({ enum: OAuthProvider, description: 'OAuth provider (google veya apple)' })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({ description: 'Native SDK\'dan alınan ID token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Apple Sign In için nonce değeri' })
  @IsOptional()
  @IsString()
  nonce?: string;

  @ApiPropertyOptional({ description: 'Google Sign In için access token' })
  @IsOptional()
  @IsString()
  accessToken?: string;
}

