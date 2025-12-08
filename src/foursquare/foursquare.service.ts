import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { LoggerService } from '../common/logger/logger.service';
import { NearbyPlaceDto } from './dto/nearby-place.dto';
import { NearbyGroupedResponseDto } from './dto/nearby-response.dto';
import {
  FOURSQUARE_API_VERSION,
  FOURSQUARE_DEFAULT_BASE_URL,
  DEFAULT_RADIUS,
  DEFAULT_LIMIT,
  DEFAULT_SORT,
  WALKING_DISTANCE_COUNT,
  NEARBY_CACHE_TTL,
} from './constants/foursquare.constant';

interface FsqCategory {
  fsq_category_id: string;
  name: string;
}

interface FsqPlace {
  fsq_place_id: string;
  name: string;
  distance: number;
  latitude: number;
  longitude: number;
  categories?: FsqCategory[];
  location?: {
    formatted_address?: string;
    locality?: string;
    country?: string;
  };
  popularity?: number;
  rating?: number;
  price?: number;
  price_level?: number;
}

interface FsqNearbyResponse {
  results: FsqPlace[];
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radius?: number;
  categories?: string;
  limit?: number;
  sort?: string;
}

@Injectable()
export class FoursquareService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.baseUrl = this.config.get<string>('foursquare.baseUrl') || FOURSQUARE_DEFAULT_BASE_URL;
    const rawApiKey = this.config.get<string>('foursquare.apiKey') || '';
    this.apiKey = rawApiKey.trim();

    this.logger.setContext('FoursquareService');

    if (!this.apiKey) {
      this.logger.error('FOURSQUARE_API_KEY tanımlı değil');
      throw new Error('FOURSQUARE_API_KEY tanımlı değil');
    }
  }

  /**
   * Category ID'yi number'a çevir
   */
  private parseCategoryId(categoryId: string): number | null {
    try {
      const cleanId = categoryId.replace(/[^0-9a-fA-F]/g, '');
      if (!cleanId) return null;
      const num = parseInt(cleanId.slice(-5), 16);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  /**
   * Yakındaki yerleri gruplandırılmış olarak getir (cache'li)
   */
  async getNearbyPlacesGrouped(params: NearbyParams): Promise<NearbyGroupedResponseDto> {
    const cacheKey = `foursquare:nearby:${JSON.stringify(params)}`;
    const cached = await this.cacheManager.get<NearbyGroupedResponseDto>(cacheKey);

    if (cached) return cached;

    const places = await this.fetchNearbyPlaces(params);

    // Mesafeye göre sırala
    const sortedPlaces = places.sort((a, b) => a.distance - b.distance);

    // Grupla: ilk 5 yürüme mesafesi, geri kalanı simge yapılar
    const response: NearbyGroupedResponseDto = {
      success: true,
      data: {
        walkingDistance: sortedPlaces.slice(0, WALKING_DISTANCE_COUNT),
        nearbyLandmarks: sortedPlaces.slice(WALKING_DISTANCE_COUNT),
      },
      requestId: randomUUID(),
    };

    await this.cacheManager.set(cacheKey, response, NEARBY_CACHE_TTL);
    return response;
  }

  /**
   * Foursquare API'den yakındaki yerleri getir
   */
  private async fetchNearbyPlaces(params: NearbyParams): Promise<NearbyPlaceDto[]> {
    const {
      lat,
      lng,
      radius = DEFAULT_RADIUS,
      categories,
      limit = DEFAULT_LIMIT,
      sort = DEFAULT_SORT,
    } = params;

    try {
      const url = `${this.baseUrl}/places/search`;

      this.logger.debug(
        `Foursquare nearby isteği: ${url} - lat:${lat}, lng:${lng}, radius:${radius}`,
      );

      const response$ = this.http.get<FsqNearbyResponse>(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Places-Api-Version': FOURSQUARE_API_VERSION,
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
        this.logger.warn('Foursquare API boş sonuç döndü');
        return [];
      }

      return data.results
        .filter((p: FsqPlace) => p.latitude && p.longitude)
        .map<NearbyPlaceDto>((place: FsqPlace) => {
          const firstCategory = place.categories?.[0] ?? null;
          return {
            id: place.fsq_place_id,
            name: place.name,
            lat: place.latitude,
            lng: place.longitude,
            distance: place.distance ?? 0,
            categoryId: firstCategory?.fsq_category_id
              ? this.parseCategoryId(firstCategory.fsq_category_id)
              : null,
            categoryName: firstCategory?.name ?? null,
            address: place.location?.formatted_address ?? null,
            city: place.location?.locality ?? null,
            country: place.location?.country ?? null,
            popularity: place.popularity ?? null,
            rating: place.rating ?? null,
            priceLevel: place.price ?? place.price_level ?? null,
          };
        });
    } catch (err: any) {
      if (err.response) {
        this.logger.error({
          message: 'Foursquare API error',
          status: err.response.status,
          error: err.response.data,
        });
      } else {
        this.logger.error('Foursquare nearby isteği başarısız', err.stack || err.message);
      }
      throw new InternalServerErrorException('Foursquare nearby isteği başarısız');
    }
  }
}
