import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private readonly configService: ConfigService) {}

  async getToken(tokenRequest: TokenRequestDto): Promise<TokenResponseDto> {
    try {
      const baseUrl = this.configService.get<string>('pax.baseUrl');
      const authEndpoint = this.configService.get<string>('pax.endpoints.auth');
      const url = `${baseUrl}${authEndpoint}`;

      // Token isteği (sadece gerçekten gerektiğinde çağrılır)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        throw new HttpException(
          `Token alınamadı: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();

      if (!data.body?.token) {
        throw new HttpException('Token response geçersiz', HttpStatus.BAD_REQUEST);
      }

      return {
        token: data.body.token,
        expiresAt: data.body.expiresAt,
      };
    } catch (error) {
      this.logger.error('Token alma hatası:', error);
      throw error;
    }
  }
}

