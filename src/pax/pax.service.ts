import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PaxHttpService } from './pax-http.service';
import { TokenManagerService } from './token-manager.service';
import { handlePaxApiError } from '../common/utils/error-handler.util';

export interface PaxRequestOptions {
  ip?: string;
  userId?: string;
  email?: string;
}

// Cache süreleri (ms)
const CACHE_TTL = {
  DEPARTURE: 3600 * 1000, // 1 saat
  ARRIVAL: 3600 * 1000,   // 1 saat
  CHECKIN_DATES: 1800 * 1000, // 30 dakika
} as const;

@Injectable()
export class PaxService {
  constructor(
    private readonly paxHttp: PaxHttpService,
    private readonly tokenManager: TokenManagerService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * PAX API endpoint çağrısı (cache'siz)
   */
  async callEndpoint(endpointKey: string, request: any, options: PaxRequestOptions = {}): Promise<any> {
    const baseUrl = this.config.get<string>('pax.baseUrl');
    const endpoint = this.config.get<string>(`pax.endpoints.${endpointKey}`);
    const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, options);
    return result.body || result;
  }

  /**
   * PAX API endpoint çağrısı (cache ile)
   */
  async callEndpointWithCache(
    endpointKey: string,
    request: any,
    cacheTtl: number,
    options: PaxRequestOptions = {},
  ): Promise<any> {
    const cacheKey = `pax:${endpointKey}:${JSON.stringify(request)}`;
    
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.callEndpoint(endpointKey, request, options);
    await this.cacheManager.set(cacheKey, result, cacheTtl);
    return result;
  }

  /**
   * Token yenile
   */
  async refreshToken(): Promise<{ message: string; hasToken: boolean }> {
    const token = await this.tokenManager.getValidToken();
    return { message: 'Token başarıyla yenilendi', hasToken: !!token };
  }

  /**
   * Kalkış noktası arama (cache'li)
   */
  async getDeparture(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpointWithCache('departure', request, CACHE_TTL.DEPARTURE, options);
  }

  /**
   * Varış noktası arama (cache'li)
   */
  async getArrival(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpointWithCache('arrival', request, CACHE_TTL.ARRIVAL, options);
  }

  /**
   * Check-in tarihleri (cache'li)
   */
  async getCheckinDates(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpointWithCache('checkinDates', request, CACHE_TTL.CHECKIN_DATES, options);
  }

  /**
   * Fiyat arama
   */
  async priceSearch(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpoint('priceSearch', request, options);
  }

  /**
   * Teklifleri getir
   */
  async getOffers(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpoint('getOffers', request, options);
  }

  /**
   * Teklif detayları (productInfo ile)
   */
  async getOfferDetails(request: any, options: PaxRequestOptions = {}): Promise<any> {
    const requestWithProductInfo = { ...request, getProductInfo: true };
    return this.callEndpoint('offerDetails', requestWithProductInfo, options);
  }

  /**
   * Ürün bilgisi
   */
  async getProductInfo(request: any, options: PaxRequestOptions = {}): Promise<any> {
    return this.callEndpoint('productInfo', request, options);
  }

  /**
   * Ücret kuralları
   */
  async getFareRules(request: any, options: PaxRequestOptions = {}): Promise<any> {
    if (!request.transactionId && !request.reservationNumber) {
      throw new BadRequestException('transactionId veya reservationNumber zorunludur');
    }

    const baseUrl = this.config.get<string>('pax.baseUrl');
    const endpoint = this.config.get<string>('pax.endpoints.fareRules');
    return this.paxHttp.post(`${baseUrl}${endpoint}`, request, options);
  }
}

