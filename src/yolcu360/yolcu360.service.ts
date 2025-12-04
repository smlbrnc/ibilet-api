import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import { CarSearchDto, CreateOrderDto, OrderResponseDto } from './dto';
import {
  LocationResponse,
  LocationDetailsResponse,
  CarSearchResponse,
  CarSearchResultResponse,
  CarSelectionResponse,
} from './dto/response-types.dto';

interface Yolcu360Error {
  code?: number;
  description?: string;
  details?: string | Record<string, any>;
  message?: string;
  error?: string;
}

@Injectable()
export class Yolcu360Service {
  private readonly baseUrl: string;
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika
  private readonly MAX_TTL_MS = 2147483647; // 32-bit signed integer limit
  private readonly CACHE_KEY_PREFIX = 'yolcu360:search:';

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: Yolcu360TokenService,
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.setContext('Yolcu360Service');
    this.baseUrl = this.configService.get<string>('yolcu360.baseUrl')!;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    errorContext: string,
  ): Promise<T> {
    const token = await this.tokenService.getValidToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      await this.handleError(response, errorContext);
    }

    return response.json();
  }

  private async handleError(response: Response, context: string): Promise<never> {
    let errorMessage = `${context} başarısız: ${response.status}`;
    let errorDetails: Yolcu360Error | null = null;
    let errorCode: string | null = null;

    try {
      const errorText = await response.text();
      this.logger.error(`${context} hatası (${response.status}): ${errorText}`);

      errorDetails = this.parseErrorResponse(errorText);
      if (errorDetails) {
        errorCode = this.extractErrorCode(errorDetails);
        errorMessage = this.extractErrorMessage(errorDetails, errorMessage);
      } else if (errorText) {
        errorMessage = errorText;
      }
    } catch (err) {
      this.logger.error(`Hata mesajı parse edilemedi: ${err}`);
    }

    const error = new Error(errorMessage) as Error & {
      status?: number;
      details?: Yolcu360Error | null;
      code?: string | null;
    };
    error.status = response.status;
    error.details = errorDetails;
    error.code = errorCode;
    throw error;
  }

  private parseErrorResponse(errorText: string): Yolcu360Error | null {
    try {
      return JSON.parse(errorText) as Yolcu360Error;
    } catch {
      return null;
    }
  }

  private extractErrorCode(errorDetails: Yolcu360Error): string | null {
    return errorDetails.code ? `YOLCU360_${errorDetails.code}` : null;
  }

  private extractErrorMessage(
    errorDetails: Yolcu360Error,
    defaultMessage: string,
  ): string {
    if (errorDetails.description) {
      let message = errorDetails.description;
      if (errorDetails.details) {
        message += this.formatErrorDetails(errorDetails.details);
      }
      return message;
    }

    if (errorDetails.message) {
      return errorDetails.message;
    }

    if (errorDetails.error) {
      return errorDetails.error;
    }

    return defaultMessage;
  }

  private formatErrorDetails(
    details: string | Record<string, any>,
  ): string {
    if (typeof details === 'string') {
      return `: ${details}`;
    }

    if (typeof details === 'object') {
      const detailsStr = Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return detailsStr ? ` (${detailsStr})` : '';
    }

    return '';
  }

  /**
   * Cache key oluştur
   */
  private getCacheKey(searchID: string): string {
    return `${this.CACHE_KEY_PREFIX}${searchID}`;
  }

  /**
   * Search yanıtından results array'ini çıkar
   */
  private extractResults(responseData: CarSearchResponse | any): any[] {
    const data = responseData?.data || responseData;
    return data?.results || data?.items || [];
  }

  /**
   * Search yanıtından tüm benzersiz searchID'leri çıkar
   */
  private extractSearchIDs(results: any[]): string[] {
    const searchIDs = new Set<string>();
    for (const car of results) {
      if (car?.searchID && typeof car.searchID === 'string') {
        searchIDs.add(car.searchID);
      }
    }
    return Array.from(searchIDs);
  }

  /**
   * Cache'e search yanıtını kaydet (tüm searchID'ler için)
   */
  private async cacheSearchResponse(response: CarSearchResponse, searchIDs: string[]): Promise<void> {
    if (searchIDs.length === 0) {
      this.logger.warn('Search yanıtında searchID bulunamadı, cache\'e kaydedilemedi');
      return;
    }

    try {
      const ttlMs = Math.min(this.CACHE_TTL_MS, this.MAX_TTL_MS);
      // Tüm searchID'ler için aynı response'u cache'e kaydet
      await Promise.all(
        searchIDs.map(async (searchID) => {
          const cacheKey = this.getCacheKey(searchID);
          await this.cacheManager.set(cacheKey, response, ttlMs);
          this.logger.debug(`Search yanıtı cache'e kaydedildi. Key: ${cacheKey}`);
        }),
      );
    } catch (error) {
      this.logger.error(`Cache kayıt hatası: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cache'den search yanıtını al
   */
  private async getCachedSearchResponse(searchID: string): Promise<CarSearchResponse | null> {
    const cacheKey = this.getCacheKey(searchID);
    const cached = await this.cacheManager.get<CarSearchResponse>(cacheKey);
    return cached || null;
  }

  /**
   * Veritabanı kaydını CarSelectionResponse'a map et
   */
  private mapToCarSelectionResponse(data: any): CarSelectionResponse {
    return {
      id: data.id,
      code: data.code,
      search_id: data.search_id,
      car_data: data.car_data,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async searchLocations(query: string): Promise<LocationResponse> {
    return this.makeRequest<LocationResponse>(
      `${YOLCU360_ENDPOINTS.LOCATIONS}?query=${encodeURIComponent(query)}`,
      { method: 'GET' },
      'Lokasyon arama',
    );
  }

  async getLocationDetails(placeId: string): Promise<LocationDetailsResponse> {
    return this.makeRequest<LocationDetailsResponse>(
      `${YOLCU360_ENDPOINTS.LOCATIONS}/${placeId}`,
      { method: 'GET' },
      'Lokasyon detay',
    );
  }

  async searchCars(dto: CarSearchDto): Promise<CarSearchResponse> {
    const body = {
      checkInDateTime: dto.checkInDateTime,
      checkOutDateTime: dto.checkOutDateTime,
      age: dto.age || '30+',
      country: dto.country || 'TR',
      paymentType: dto.paymentType || 'creditCard',
      checkInLocation: dto.checkInLocation,
      checkOutLocation: dto.checkOutLocation,
    };

    const response = await this.makeRequest<CarSearchResponse>(
      YOLCU360_ENDPOINTS.SEARCH_POINT,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      'Araç arama',
    );

    // Search yanıtını cache'e kaydet (tüm searchID'ler için)
    const results = this.extractResults(response);
    if (Array.isArray(results) && results.length > 0) {
      const searchIDs = this.extractSearchIDs(results);
      await this.cacheSearchResponse(response, searchIDs);
    }

    return response;
  }

  async getCarSearchResult(
    searchID: string,
    code: string,
  ): Promise<CarSearchResultResponse> {
    return this.makeRequest<CarSearchResultResponse>(
      `${YOLCU360_ENDPOINTS.CAR_EXTRA_PRODUCTS}/${searchID}/${code}/extra-products`,
      { method: 'GET' },
      'Araç sonuç getirme',
    );
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.makeRequest<OrderResponseDto>(
      YOLCU360_ENDPOINTS.ORDER,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Sipariş oluşturma',
    );
  }

  async saveCarSelection(code: string, searchID: string): Promise<CarSelectionResponse> {
    const cachedResponse = await this.getCachedSearchResponse(searchID);
    if (!cachedResponse) {
      throw new NotFoundException(
        'Search yanıtı cache\'de bulunamadı. Lütfen önce search isteği yapın.',
      );
    }

    const results = this.extractResults(cachedResponse);
    if (!Array.isArray(results) || results.length === 0) {
      throw new BadRequestException('Geçersiz search yanıtı formatı');
    }

    const selectedCar = results.find((car: any) => car.code === code);
    if (!selectedCar) {
      throw new NotFoundException(`Code '${code}' ile eşleşen araç bulunamadı`);
    }

    const carSearchID = selectedCar.searchID || searchID;
    if (!carSearchID) {
      throw new BadRequestException('Araç kartında searchID bulunamadı');
    }

    return await this.insertCarSelection(code, carSearchID, selectedCar);
  }

  /**
   * Araç seçimini veritabanına kaydet
   */
  private async insertCarSelection(
    code: string,
    searchID: string,
    carData: any,
  ): Promise<CarSelectionResponse> {
    const adminClient = this.supabase.getAdminClient();
    const { data: insertedData, error } = await adminClient
      .schema('backend')
      .from('yolcu360_car_selections')
      .insert({
        code,
        search_id: searchID,
        car_data: carData,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Araç kayıt hatası: ${error.message} (code: ${code}, searchID: ${searchID})`);
      throw new BadRequestException(`Araç kaydedilemedi: ${error.message}`);
    }

    this.logger.log(`Araç başarıyla kaydedildi: ${code} (searchID: ${searchID})`);
    return this.mapToCarSelectionResponse(insertedData);
  }

  async getCarSelectionByCode(code: string): Promise<CarSelectionResponse> {
    const adminClient = this.supabase.getAdminClient();
    const { data: carData, error } = await adminClient
      .schema('backend')
      .from('yolcu360_car_selections')
      .select('*')
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(`Araç kaydı getirme hatası: ${error.message} (code: ${code})`);
      throw new NotFoundException(`Code '${code}' ile eşleşen araç kaydı bulunamadı`);
    }

    if (!carData) {
      throw new NotFoundException(`Code '${code}' ile eşleşen araç kaydı bulunamadı`);
    }

    return this.mapToCarSelectionResponse(carData);
  }
}