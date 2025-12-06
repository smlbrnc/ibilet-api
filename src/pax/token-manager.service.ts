import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TokenService } from './token.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class TokenManagerService {
  private readonly tokenRefreshThreshold = 5 * 60 * 1000; // 5 dakika
  private readonly TOKEN_CACHE_KEY = 'pax:token';
  private readonly TOKEN_EXP_CACHE_KEY = 'pax:token:exp';
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TokenManagerService');
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async getValidToken(): Promise<string> {
    try {
      const cachedToken = await this.cacheManager.get<string>(this.TOKEN_CACHE_KEY);
      const cachedExp = await this.cacheManager.get<number>(this.TOKEN_EXP_CACHE_KEY);

      if (cachedToken && cachedExp && this.isTokenValid(cachedExp)) {
        return cachedToken;
      }

      // Token yok veya yenileme gerekiyor
      return await this.refreshToken();
    } catch (error) {
      // Cache hatası - token yenilemeyi dene
      return await this.refreshToken();
    }
  }

  /**
   * Token'ın hala geçerli olup olmadığını kontrol eder
   * Token expire olmadan 5 dakika öncesine kadar geçerli sayılır
   */
  private isTokenValid(expirationTime: number): boolean {
    const now = Date.now();
    const timeUntilExpiration = expirationTime - now;
    return timeUntilExpiration > this.tokenRefreshThreshold;
  }

  private async refreshToken(): Promise<string> {
    try {
      const tokenRequest: TokenRequestDto = {
        Agency: this.configService.get<string>('pax.agency')!,
        User: this.configService.get<string>('pax.user')!,
        Password: this.configService.get<string>('pax.password')!,
      };

      const response = await this.tokenService.getToken(tokenRequest);

      if (!response || !response.token) {
        this.logger.error('PAX API token yanıtı boş');
        throw new Error('Token alınamadı: API yanıt vermedi');
      }

      const newToken = response.token;
      const tokenParts = newToken.split('.');

      if (tokenParts.length !== 3) {
        this.logger.error('Geçersiz JWT formatı');
        throw new Error('Geçersiz token formatı: JWT parça sayısı hatalı');
      }

      const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));

      if (!tokenPayload?.exp) {
        this.logger.error('Token payload hatalı: exp alanı bulunamadı');
        throw new Error('Token payload geçersiz: exp alanı bulunamadı');
      }

      const tokenExpirationTime = tokenPayload.exp * 1000;
      const ttlSeconds = Math.floor((tokenExpirationTime - Date.now()) / 1000); // TTL saniye cinsinden

      if (ttlSeconds <= 0) {
        this.logger.error('Token zaten expire olmuş');
        throw new Error('Token zaten expire olmuş');
      }

      // Token'ı cache'e kaydet (TTL milisaniye cinsinden - cache-manager v5 ms kullanır)
      const ttlMs = ttlSeconds * 1000;
      await this.cacheManager.set(this.TOKEN_CACHE_KEY, newToken, ttlMs);
      await this.cacheManager.set(this.TOKEN_EXP_CACHE_KEY, tokenExpirationTime, ttlMs);

      return newToken;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error({
        message: 'Token renewal error',
        error: errorMessage,
        ...(this.isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
      });

      throw new Error(`Token yenileme başarısız: ${errorMessage}`);
    }
  }

  async clearToken(): Promise<void> {
    await this.cacheManager.del(this.TOKEN_CACHE_KEY);
    await this.cacheManager.del(this.TOKEN_EXP_CACHE_KEY);
  }

  async getTokenStatus(): Promise<{
    hasToken: boolean;
    expiresAt: number | null;
    timeUntilExpiration: number | null;
  }> {
    const token = await this.cacheManager.get<string>(this.TOKEN_CACHE_KEY);
    const expiresAt = await this.cacheManager.get<number>(this.TOKEN_EXP_CACHE_KEY);
    const now = Date.now();

    return {
      hasToken: !!token,
      expiresAt: expiresAt ?? null,
      timeUntilExpiration: expiresAt ? expiresAt - now : null,
    };
  }
}
