import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import { CarSearchDto, CreateOrderDto, OrderResponseDto } from './dto';
import {
  LocationResponse,
  LocationDetailsResponse,
  CarSearchResponse,
  CarSearchResultResponse,
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

    return this.makeRequest<CarSearchResponse>(
      YOLCU360_ENDPOINTS.SEARCH_POINT,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      'Araç arama',
    );
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

