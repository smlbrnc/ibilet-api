import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import {
  FindeksCheckDto,
  FindeksPhoneListDto,
  FindeksReportDto,
  FindeksPinConfirmDto,
  FindeksPinRenewDto,
  FindeksCheckResponse,
  FindeksPhoneListResponse,
  FindeksReportResponse,
} from './dto/findeks.dto';

interface Yolcu360Error {
  code?: number;
  description?: string;
  details?: string | Record<string, any>;
  message?: string;
  error?: string;
}

@Injectable()
export class FindeksService {
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: Yolcu360TokenService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('FindeksService');
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

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async handleError(response: Response, context: string): Promise<never> {
    try {
      const errorText = await response.text();
      this.logger.error(`${context} hatası (${response.status}): ${errorText}`);

      // Yolcu360'dan gelen yanıtı parse et
      const errorDetails = this.parseErrorResponse(errorText);
      
      const httpStatus = this.mapStatusToHttpStatus(response.status);
      
      // Eğer JSON yanıt varsa direkt onu döndür, yoksa text yanıtı döndür
      if (errorDetails) {
        throw new HttpException(errorDetails, httpStatus);
      } else {
        throw new HttpException({ error: errorText || `${context} başarısız` }, httpStatus);
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(`Hata mesajı parse edilemedi: ${err}`);
      throw new HttpException(
        { error: `${context} başarısız` },
        this.mapStatusToHttpStatus(response.status),
      );
    }
  }

  private extractErrorFromText(errorText: string, context: string): { message: string; code?: string } {
    if (!errorText) {
      return { message: `${context} başarısız` };
    }

    const trimmed = errorText.trim();
    
    // [POST /findeks/check][400] isActiveFindexBadRequest formatını parse et
    const bracketMatch = trimmed.match(/\[.*?\]\s*\[.*?\]\s*(.+)/);
    if (bracketMatch && bracketMatch[1]) {
      const errorPart = bracketMatch[1].trim();
      // Eğer errorPart bir hata kodu gibi görünüyorsa (camelCase veya UPPER_CASE)
      if (/^[a-zA-Z]+$/.test(errorPart) && (errorPart.includes('Error') || errorPart.includes('Bad') || errorPart.includes('Request'))) {
        return { message: errorPart, code: errorPart };
      }
      return { message: errorPart };
    }
    
    // [POST /findeks/check][400] formatını parse et
    const singleBracketMatch = trimmed.match(/\[.*?\]\s*(.+)/);
    if (singleBracketMatch && singleBracketMatch[1]) {
      return { message: singleBracketMatch[1].trim() };
    }

    return { message: trimmed };
  }


  private mapStatusToHttpStatus(status: number): HttpStatus {
    switch (status) {
      case 400:
        return HttpStatus.BAD_REQUEST;
      case 401:
        return HttpStatus.UNAUTHORIZED;
      case 403:
        return HttpStatus.FORBIDDEN;
      case 404:
        return HttpStatus.NOT_FOUND;
      case 500:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.BAD_GATEWAY;
    }
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

  async check(dto: FindeksCheckDto): Promise<FindeksCheckResponse> {
    return this.makeRequest<FindeksCheckResponse>(
      YOLCU360_ENDPOINTS.FINDEKS_CHECK,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Findeks kredi kontrolü',
    );
  }

  async getPhoneList(dto: FindeksPhoneListDto): Promise<FindeksPhoneListResponse> {
    return this.makeRequest<FindeksPhoneListResponse>(
      YOLCU360_ENDPOINTS.FINDEKS_PHONE_LIST,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Findeks telefon listesi',
    );
  }

  async generateReport(dto: FindeksReportDto): Promise<FindeksReportResponse> {
    this.logger.log(`Findeks rapor oluşturma isteği: ${JSON.stringify(dto)}`);
    
    return this.makeRequest<FindeksReportResponse>(
      YOLCU360_ENDPOINTS.FINDEKS_REPORT,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Findeks rapor oluşturma',
    );
  }

  async confirmPin(dto: FindeksPinConfirmDto): Promise<void> {
    await this.makeRequest<void>(
      YOLCU360_ENDPOINTS.FINDEKS_PIN_CONFIRM,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Findeks PIN onaylama',
    );
  }

  async renewPin(dto: FindeksPinRenewDto): Promise<void> {
    await this.makeRequest<void>(
      YOLCU360_ENDPOINTS.FINDEKS_PIN_RENEW,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
      'Findeks PIN yenileme',
    );
  }
}

