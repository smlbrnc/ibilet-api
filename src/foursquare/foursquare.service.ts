import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../common/logger/logger.service';
import { NearbyPlaceDto } from './dto/nearby-place.dto';

interface FsqCategory {
  fsq_category_id: string;
  name: string;
}

interface FsqPlace {
  fsq_place_id: string; // API'de fsq_place_id olarak geliyor
  name: string;
  distance: number;
  latitude: number; // API'de direkt latitude olarak geliyor
  longitude: number; // API'de direkt longitude olarak geliyor
  categories?: FsqCategory[];
  location?: {
    formatted_address?: string;
    locality?: string;
    country?: string;
  };
  popularity?: number;
  rating?: number;
  price?: number;
  price_level?: number; // API'de price_level olarak gelebilir
}

interface FsqNearbyResponse {
  results: FsqPlace[];
}

@Injectable()
export class FoursquareService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = this.config.get<string>('foursquare.baseUrl') || 'https://places-api.foursquare.com';
    // API key'i al ve trim et (boşlukları temizle)
    const rawApiKey = this.config.get<string>('foursquare.apiKey') || '';
    this.apiKey = rawApiKey.trim();

    this.logger.setContext('FoursquareService');

    if (!this.apiKey) {
      this.logger.error('FOURSQUARE_API_KEY tanımlı değil');
      throw new Error('FOURSQUARE_API_KEY tanımlı değil');
    }

  }

  /**
   * Foursquare category ID'sini (hex string) number'a çevir
   * Hex string'in son 4-5 karakterini alarak daha anlamlı bir number üretir
   */
  private parseCategoryId(categoryId: string): number | null {
    try {
      // Hex string'den sadece sayısal karakterleri al
      const cleanId = categoryId.replace(/[^0-9a-fA-F]/g, '');
      if (!cleanId) return null;
      
      // Son 5 karakteri al ve number'a çevir (daha anlamlı bir ID için)
      const lastChars = cleanId.slice(-5);
      const num = parseInt(lastChars, 16);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  async getNearbyPlaces(params: {
    lat: number;
    lng: number;
    radius?: number;
    categories?: string;
    limit?: number;
    sort?: string;
  }): Promise<NearbyPlaceDto[]> {
    const { lat, lng, radius = 2000, categories, limit = 12, sort = 'POPULARITY' } = params;

    try {
      const url = `${this.baseUrl}/places/search`;
      
      this.logger.debug(
        `Foursquare nearby isteği: ${url} - lat:${lat}, lng:${lng}, radius:${radius}, categories:${categories || 'yok'}, limit:${limit}, sort:${sort}`,
      );

      const response$ = this.http.get<FsqNearbyResponse>(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`, // Bearer Token formatı
          'X-Places-Api-Version': '2025-06-17', // Version header'ı zorunlu
        },
        params: {
          ll: `${lat},${lng}`,
          radius,
          ...(categories && { categories }),
          limit,
          sort,
        },
      });

      const { data } = await firstValueFrom(response$);

      if (!data?.results) {
        const dataInfo = data
          ? `Data var ama results yok. Keys: ${Object.keys(data).join(', ')}`
          : 'Data yok';
        this.logger.warn(`Foursquare API boş sonuç döndü veya results yok - ${dataInfo}`);
        return [];
      }

      const places = data.results
        .filter((p) => p.latitude && p.longitude) // API'de direkt latitude/longitude var
        .map<NearbyPlaceDto>((place) => {
          const firstCategory = place.categories?.[0] ?? null;

          return {
            id: place.fsq_place_id, // API'de fsq_place_id olarak geliyor
            name: place.name,
            lat: place.latitude, // API'de direkt latitude
            lng: place.longitude, // API'de direkt longitude
            distance: place.distance ?? 0,
            categoryId: firstCategory?.fsq_category_id ? this.parseCategoryId(firstCategory.fsq_category_id) : null,
            categoryName: firstCategory?.name ?? null,
            address: place.location?.formatted_address ?? null,
            city: place.location?.locality ?? null,
            country: place.location?.country ?? null,
            popularity: place.popularity ?? null,
            rating: place.rating ?? null,
            priceLevel: place.price ?? place.price_level ?? null,
          };
        });

      return places;
    } catch (err: any) {
      // Axios error'ı detaylı logla
      if (err.response) {
        this.logger.error(
          `Foursquare API hatası [${err.response.status}]: ${JSON.stringify(err.response.data)}`,
        );
      } else {
        this.logger.error('Foursquare nearby isteği başarısız', err.stack || err.message);
      }
      throw new InternalServerErrorException('Foursquare nearby isteği başarısız');
    }
  }
}

