import {
  Injectable,
  OnModuleInit,
  Inject,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { readFileSync } from 'fs';
import { join } from 'path';

interface HomeAirport {
  iata: string;
  city: string;
  airport_name: string;
  lat: number;
  lng: number;
}

interface IpWhoisResponse {
  ip: string;
  success: boolean;
  type?: string;
  continent?: string;
  continent_code?: string;
  country?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  latitude: number;
  longitude: number;
  is_eu?: boolean;
  postal?: string;
  calling_code?: string;
  capital?: string;
  borders?: string;
  flag?: {
    img: string;
    emoji: string;
    emoji_unicode: string;
  };
  connection?: {
    asn: number;
    org: string;
    isp: string;
    domain: string;
  };
  timezone?: {
    id: string;
    abbr: string;
    is_dst: boolean;
    offset: number;
    utc: string;
    current_time: string;
  };
}

@Injectable()
export class DetectAirportService implements OnModuleInit {
  private readonly logger = new Logger(DetectAirportService.name);
  private airports: HomeAirport[] = [];
  private readonly IP_GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat
  private readonly AIRPORTS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 gün

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    await this.loadAirports();
  }

  /**
   * Havalimanı verilerini yükler (cache'den veya dosyadan)
   */
  private async loadAirports(): Promise<void> {
    const cacheKey = 'detect-airport:airports:home';
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<HomeAirport[]>(cacheKey);
    if (cached) {
      this.airports = cached;
      this.logger.log(`Havalimanı verileri cache'den yüklendi (${this.airports.length} adet)`);
      return;
    }

    // Cache yoksa dosyadan oku
    try {
      const filePath = join(__dirname, '..', 'data', 'home_airport.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      this.airports = JSON.parse(fileContent);
      
      // Cache'e kaydet
      await this.cacheManager.set(cacheKey, this.airports, this.AIRPORTS_CACHE_TTL);
      this.logger.log(`Havalimanı verileri dosyadan yüklendi ve cache'lendi (${this.airports.length} adet)`);
    } catch (error) {
      this.logger.error('Havalimanı verileri yüklenirken hata oluştu:', error);
      throw new HttpException(
        'Havalimanı verileri yüklenemedi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * IP adresinden geolocation bilgilerini alır (cache'li)
   */
  async getClientIpLocation(ip: string): Promise<{ latitude: number; longitude: number }> {
    // Localhost için varsayılan koordinatlar (İstanbul)
    if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      this.logger.debug('Localhost isteği tespit edildi, varsayılan konum kullanılıyor (İstanbul)');
      return {
        latitude: 41.0082, // İstanbul koordinatları
        longitude: 28.9784,
      };
    }

    const cacheKey = `detect-airport:ip-geo:${ip}`;

    // Cache'den kontrol et
    const cached = await this.cacheManager.get<{ latitude: number; longitude: number }>(cacheKey);
    if (cached) {
      this.logger.debug(`IP geolocation cache'den alındı: ${ip}`);
      return cached;
    }

    // Cache yoksa API'ye istek at
    try {
      // ipwho.is - Limitsiz, API key gerekmez
      const url = `https://ipwho.is/${ip}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpException(
          `IP geolocation API hatası: ${response.statusText}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data: IpWhoisResponse = await response.json();

      // API hata kontrolü
      if (!data.success) {
        throw new HttpException(
          'IP geolocation servisi başarısız yanıt döndü',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!data.latitude || !data.longitude) {
        throw new HttpException(
          'IP adresinden konum bilgisi alınamadı',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = {
        latitude: data.latitude,
        longitude: data.longitude,
      };

      // Cache'e kaydet
      await this.cacheManager.set(cacheKey, result, this.IP_GEO_CACHE_TTL);
      this.logger.debug(`IP geolocation ipwho.is'den alındı ve cache'lendi: ${ip}`);

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`IP geolocation API hatası: ${error.message}`, error);
      throw new HttpException(
        'IP geolocation servisi şu anda kullanılamıyor',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplar (km cinsinden)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Derece cinsinden açıyı radyan'a çevirir
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Verilen koordinatlara en yakın havalimanını bulur
   */
  findNearestAirport(latitude: number, longitude: number): HomeAirport {
    if (this.airports.length === 0) {
      throw new HttpException(
        'Havalimanı verileri yüklenemedi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let nearestAirport: HomeAirport | null = null;
    let minDistance = Infinity;

    for (const airport of this.airports) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        airport.lat,
        airport.lng,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestAirport = airport;
      }
    }

    if (!nearestAirport) {
      throw new NotFoundException('En yakın havalimanı bulunamadı');
    }

    return nearestAirport;
  }

  /**
   * IP adresinden en yakın havalimanını bulur
   */
  async detectAirport(ip: string): Promise<{ iata: string; city: string; airport_name: string }> {
    // IP'den konum bilgisi al
    const location = await this.getClientIpLocation(ip);

    // En yakın havalimanını bul
    const nearestAirport = this.findNearestAirport(location.latitude, location.longitude);

    return {
      iata: nearestAirport.iata,
      city: nearestAirport.city,
      airport_name: nearestAirport.airport_name,
    };
  }
}
