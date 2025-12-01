import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';
import { YOLCU360_ENDPOINTS } from './constants/yolcu360.constant';
import { CarSearchDto } from './dto';

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

  async searchLocations(query: string): Promise<any> {
    const token = await this.tokenService.getValidToken();
    const url = `${this.baseUrl}${YOLCU360_ENDPOINTS.LOCATIONS}?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Lokasyon arama hatası: ${error}`);
      throw new Error(`Lokasyon arama başarısız: ${response.status}`);
    }

    return response.json();
  }

  async getLocationDetails(placeId: string): Promise<any> {
    const token = await this.tokenService.getValidToken();
    const url = `${this.baseUrl}${YOLCU360_ENDPOINTS.LOCATIONS}/${placeId}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Lokasyon detay hatası: ${error}`);
      throw new Error(`Lokasyon detay başarısız: ${response.status}`);
    }

    return response.json();
  }

  async searchCars(dto: CarSearchDto): Promise<any> {
    const token = await this.tokenService.getValidToken();
    const url = `${this.baseUrl}${YOLCU360_ENDPOINTS.SEARCH_POINT}`;

    const body = {
      checkInDateTime: dto.checkInDateTime,
      checkOutDateTime: dto.checkOutDateTime,
      age: dto.age || '30+',
      country: dto.country || 'TR',
      paymentType: dto.paymentType || 'creditCard',
      checkInLocation: dto.checkInLocation,
      checkOutLocation: dto.checkOutLocation,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Araç arama hatası: ${error}`);
      throw new Error(`Araç arama başarısız: ${response.status}`);
    }

    return response.json();
  }
}

