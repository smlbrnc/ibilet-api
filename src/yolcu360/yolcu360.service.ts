import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import { CarSearchDto, CreateOrderDto, OrderResponseDto } from './dto';
import { PaymentPayDto } from './dto/payment-pay.dto';
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
    try {
      const errorText = await response.text();
      this.logger.error(`${context} hatası (${response.status}): ${errorText}`);

      // Yolcu360'dan gelen yanıtı parse et
      const errorDetails = this.parseErrorResponse(errorText);
      
      // Eğer JSON yanıt varsa direkt onu döndür, yoksa text yanıtı döndür
      if (errorDetails) {
        const error = new Error(JSON.stringify(errorDetails)) as Error & {
          status?: number;
          response?: Yolcu360Error;
        };
        error.status = response.status;
        error.response = errorDetails;
        throw error;
      } else {
        const error = new Error(errorText || `${context} başarısız`) as Error & {
          status?: number;
        };
        error.status = response.status;
        throw error;
      }
    } catch (err) {
      if (err instanceof Error && 'status' in err) {
        throw err;
      }
      this.logger.error(`Hata mesajı parse edilemedi: ${err}`);
      const error = new Error(`${context} başarısız`) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }
  }

  private parseErrorResponse(errorText: string): Yolcu360Error | null {
    try {
      return JSON.parse(errorText) as Yolcu360Error;
    } catch {
      return null;
    }
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
    const orderResponse = await this.makeRequest<OrderResponseDto>(
      YOLCU360_ENDPOINTS.ORDER,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Sipariş oluşturma',
    );

    // Order yanıtını veritabanına kaydet (non-blocking)
    await this.saveOrderToDatabase(orderResponse);

    return orderResponse;
  }

  async getOrder(orderId: string): Promise<OrderResponseDto> {
    return this.makeRequest<OrderResponseDto>(
      `${YOLCU360_ENDPOINTS.ORDER}/${orderId}`,
      { method: 'GET' },
      'Sipariş detay getirme',
    );
  }

  /**
   * Order yanıtını pre_transactionid tablosuna kaydet
   */
  private async saveOrderToDatabase(order: OrderResponseDto): Promise<void> {
    try {
      const adminClient = this.supabase.getAdminClient();

      const { error: insertError } = await adminClient
        .schema('backend')
        .from('pre_transactionid')
        .insert({
          transaction_id: order.id,
          expires_on: null,
          success: true,
          code: order.id,
          messages: null,
          body: order,
        });

      if (insertError) {
        this.logger.error(`Order veritabanı kayıt hatası: ${insertError.message} (orderId: ${order.id})`);
        return;
      }

      this.logger.log(`Order başarıyla veritabanına kaydedildi: ${order.id}`);
    } catch (error) {
      this.logger.error({
        message: 'Order veritabanı kayıt hatası',
        error: error instanceof Error ? error.message : String(error),
        orderId: order.id,
      });
    }
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

  /**
   * Yolcu360 limit ödeme işlemi (callback için kullanılır)
   */
  async processLimitPaymentForCallback(orderID: string): Promise<{
    success: boolean;
    findeksCode?: string;
    error?: string;
  }> {
    try {
      this.logger.log(`=== YOLCU360 LIMIT PAYMENT (CALLBACK) ===`);
      this.logger.debug(`OrderID: ${orderID}`);

      const paymentResponse = await this.makeRequest<any>(
        YOLCU360_ENDPOINTS.PAYMENT_PAY,
        {
          method: 'POST',
          body: JSON.stringify({
            orderID: orderID,
            paymentType: 'limit',
          }),
        },
        'Limit ödeme (callback)',
      );

      this.logger.log({
        message: 'Yolcu360 payment response (callback)',
        orderID,
        success: paymentResponse?.success,
        findeksCode: paymentResponse?.findeksCode,
      });

      const findeksCode = paymentResponse?.findeksCode;

      if (!findeksCode) {
        this.logger.warn(`findeksCode bulunamadı: ${orderID}`);
      }

      return {
        success: true,
        findeksCode: findeksCode,
      };
    } catch (error) {
      this.logger.error({
        message: 'Limit ödeme hatası (callback)',
        error: error instanceof Error ? error.message : String(error),
        orderID: orderID,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ödeme işlemi başarısız',
      };
    }
  }

  /**
   * Order detaylarını getir
   */
  async getOrderDetails(orderId: string): Promise<OrderResponseDto> {
    return this.getOrder(orderId);
  }

  /**
   * Yolcu360 limit ödeme işlemi (public endpoint için)
   */
  async processLimitPayment(dto: PaymentPayDto): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`=== YOLCU360 LIMIT PAYMENT ===`);
      this.logger.debug(`OrderID: ${dto.orderID}, PaymentType: ${dto.paymentType}`);

      // Transaction kontrolü
      const adminClient = this.supabase.getAdminClient();
      const { data: transactionData, error: transactionError } = await adminClient
        .schema('backend')
        .from('pre_transactionid')
        .select('*')
        .eq('transaction_id', dto.orderID)
        .single();

      if (transactionError || !transactionData) {
        this.logger.error(`Transaction bulunamadı: ${dto.orderID}`);
        throw new NotFoundException(`Transaction ID bulunamadı: ${dto.orderID}`);
      }

      // Ödeme işlemi
      await this.makeRequest<any>(
        YOLCU360_ENDPOINTS.PAYMENT_PAY,
        {
          method: 'POST',
          body: JSON.stringify({
            orderID: dto.orderID,
            paymentType: dto.paymentType,
          }),
        },
        'Limit ödeme',
      );

      this.logger.log(`Limit ödeme başarılı: ${dto.orderID}`);

      return {
        success: true,
        message: 'Ödeme başarılı',
      };
    } catch (error) {
      this.logger.error({
        message: 'Limit ödeme hatası',
        error: error instanceof Error ? error.message : String(error),
        orderID: dto.orderID,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Ödeme işlemi başarısız',
      );
    }
  }
}