import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import { CarSearchDto, CreateOrderDto, OrderResponseDto } from './dto';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: Yolcu360TokenService,
    private readonly logger: LoggerService,
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

      try {
        errorDetails = JSON.parse(errorText) as Yolcu360Error;

        if (errorDetails.code) {
          errorCode = `YOLCU360_${errorDetails.code}`;
        }

        if (errorDetails.description) {
          errorMessage = errorDetails.description;
          if (errorDetails.details) {
            if (typeof errorDetails.details === 'string') {
              errorMessage += `: ${errorDetails.details}`;
            } else if (typeof errorDetails.details === 'object') {
              const detailsStr = Object.entries(errorDetails.details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              if (detailsStr) {
                errorMessage += ` (${detailsStr})`;
              }
            }
          }
        } else if (errorDetails.message) {
          errorMessage = errorDetails.message;
        } else if (errorDetails.error) {
          errorMessage = errorDetails.error;
        } else if (typeof errorDetails === 'string') {
          errorMessage = errorDetails;
        }
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
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

  async searchLocations(query: string): Promise<unknown> {
    return this.makeRequest<unknown>(
      `${YOLCU360_ENDPOINTS.LOCATIONS}?query=${encodeURIComponent(query)}`,
      { method: 'GET' },
      'Lokasyon arama',
    );
  }

  async getLocationDetails(placeId: string): Promise<unknown> {
    return this.makeRequest<unknown>(
      `${YOLCU360_ENDPOINTS.LOCATIONS}/${placeId}`,
      { method: 'GET' },
      'Lokasyon detay',
    );
  }

  async searchCars(dto: CarSearchDto): Promise<unknown> {
    const body = {
      checkInDateTime: dto.checkInDateTime,
      checkOutDateTime: dto.checkOutDateTime,
      age: dto.age || '30+',
      country: dto.country || 'TR',
      paymentType: dto.paymentType || 'creditCard',
      checkInLocation: dto.checkInLocation,
      checkOutLocation: dto.checkOutLocation,
    };

    return this.makeRequest<unknown>(
      YOLCU360_ENDPOINTS.SEARCH_POINT,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      'Araç arama',
    );
  }

  async getCarSearchResult(searchID: string, code: string): Promise<unknown> {
    return this.makeRequest<unknown>(
      `${YOLCU360_ENDPOINTS.CAR_EXTRA_PRODUCTS}/${searchID}/${code}/extra-products`,
      { method: 'GET' },
      'Araç sonuç getirme',
    );
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.debug(`Sipariş oluşturma isteği: ${JSON.stringify(dto, null, 2)}`);

    return this.makeRequest<OrderResponseDto>(
      YOLCU360_ENDPOINTS.ORDER,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Sipariş oluşturma',
    );
  }
}

