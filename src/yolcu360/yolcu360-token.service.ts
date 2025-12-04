import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../common/logger/logger.service';
import {
  YOLCU360_ENDPOINTS,
  YOLCU360_CACHE_KEYS,
  TOKEN_REFRESH_THRESHOLD,
} from './constants/yolcu360.constant';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: string;
  refreshTokenExpireAt: string;
}

@Injectable()
export class Yolcu360TokenService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('Yolcu360TokenService');
    this.baseUrl = this.configService.get<string>('yolcu360.baseUrl')!;
    this.apiKey = this.configService.get<string>('yolcu360.apiKey')!;
    this.apiSecret = this.configService.get<string>('yolcu360.apiSecret')!;
  }

  async getValidToken(): Promise<string> {
    try {
      const cachedToken = await this.cacheManager.get<string>(
        YOLCU360_CACHE_KEYS.ACCESS_TOKEN,
      );
      const cachedExp = await this.cacheManager.get<number>(
        YOLCU360_CACHE_KEYS.ACCESS_TOKEN_EXP,
      );

      if (cachedToken && cachedExp && this.isTokenValid(cachedExp)) {
        return cachedToken;
      }

      // Access token geçersiz, refresh token ile yenile
      const refreshToken = await this.cacheManager.get<string>(
        YOLCU360_CACHE_KEYS.REFRESH_TOKEN,
      );
      const refreshExp = await this.cacheManager.get<number>(
        YOLCU360_CACHE_KEYS.REFRESH_TOKEN_EXP,
      );

      if (refreshToken && refreshExp && this.isTokenValid(refreshExp)) {
        return await this.refreshAccessToken(refreshToken);
      }

      // Her iki token da geçersiz, yeni login yap
      return await this.login();
    } catch (error) {
      this.logger.error(`Token alma hatası: ${error}`);
      return await this.login();
    }
  }

  private isTokenValid(expirationTime: number): boolean {
    const now = Date.now();
    return expirationTime - now > TOKEN_REFRESH_THRESHOLD;
  }

  private async login(): Promise<string> {
    const response = await fetch(`${this.baseUrl}${YOLCU360_ENDPOINTS.AUTH_LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: this.apiKey, secret: this.apiSecret }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Yolcu360 login hatası: ${error}`);
      throw new Error(`Yolcu360 login başarısız: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    await this.cacheTokens(data);

    this.logger.log('Yolcu360 login başarılı');
    return data.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}${YOLCU360_ENDPOINTS.AUTH_REFRESH}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      },
    );

    if (!response.ok) {
      this.logger.warn('Refresh token geçersiz, yeni login yapılıyor');
      return await this.login();
    }

    const data: AuthResponse = await response.json();
    await this.cacheTokens(data);

    this.logger.log('Yolcu360 token yenilendi');
    return data.accessToken;
  }

  private async cacheTokens(data: AuthResponse): Promise<void> {
    const accessExpTime = new Date(data.accessTokenExpireAt).getTime();
    const refreshExpTime = new Date(data.refreshTokenExpireAt).getTime();
    const now = Date.now();

    const accessTtl = accessExpTime - now;
    const refreshTtl = refreshExpTime - now;

    await Promise.all([
      this.cacheManager.set(
        YOLCU360_CACHE_KEYS.ACCESS_TOKEN,
        data.accessToken,
        accessTtl,
      ),
      this.cacheManager.set(
        YOLCU360_CACHE_KEYS.ACCESS_TOKEN_EXP,
        accessExpTime,
        accessTtl,
      ),
      this.cacheManager.set(
        YOLCU360_CACHE_KEYS.REFRESH_TOKEN,
        data.refreshToken,
        refreshTtl,
      ),
      this.cacheManager.set(
        YOLCU360_CACHE_KEYS.REFRESH_TOKEN_EXP,
        refreshExpTime,
        refreshTtl,
      ),
    ]);
  }

}

