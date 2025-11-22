import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FoursquareService } from './foursquare.service';
import { NearbyQueryDto, SortOption } from './dto/nearby-query.dto';
import { NearbyGroupedResponseDto } from './dto/nearby-response.dto';
import { randomUUID } from 'crypto';

@ApiTags('Foursquare Places')
@Controller('places')
export class FoursquareController {
  constructor(
    private readonly foursquareService: FoursquareService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Yakındaki yerleri listele' })
  @ApiQuery({
    name: 'sort',
    enum: SortOption,
    required: false,
    description: 'Sıralama kriteri (POPULARITY, RATING, DISTANCE)',
    example: SortOption.POPULARITY,
  })
  @ApiResponse({
    status: 200,
    description: 'Yakındaki yerler başarıyla getirildi',
    type: NearbyGroupedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz parametreler',
  })
  @ApiResponse({
    status: 500,
    description: 'Sunucu hatası',
  })
  async getNearbyPlaces(@Query() query: NearbyQueryDto): Promise<NearbyGroupedResponseDto> {
    const cacheKey = `foursquare:nearby:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<NearbyGroupedResponseDto>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const places = await this.foursquareService.getNearbyPlaces({
      lat: query.lat,
      lng: query.lng,
      radius: query.radius,
      categories: query.categories,
      limit: query.limit,
      sort: query.sort,
    });

    // Mesafeye göre sırala (en yakından en uzağa)
    const sortedPlaces = places.sort((a, b) => a.distance - b.distance);
    
    // İlk 5'i yürüme mesafesi, geri kalanları simge yapılar olarak grupla
    const walkingDistance = sortedPlaces.slice(0, 5);
    const nearbyLandmarks = sortedPlaces.slice(5);

    const response: NearbyGroupedResponseDto = {
      success: true,
      data: {
        walkingDistance,
        nearbyLandmarks,
      },
      requestId: randomUUID(),
    };

    // 30 dakika cache
    await this.cacheManager.set(cacheKey, response, 1800 * 1000);
    
    return response;
  }
}

