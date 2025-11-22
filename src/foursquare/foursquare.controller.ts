import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FoursquareService } from './foursquare.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { NearbyPlaceDto } from './dto/nearby-place.dto';

@ApiTags('Foursquare Places')
@Controller('places')
export class FoursquareController {
  constructor(
    private readonly foursquareService: FoursquareService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Yakındaki yerleri listele' })
  @ApiResponse({
    status: 200,
    description: 'Yakındaki yerler başarıyla getirildi',
    type: [NearbyPlaceDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz parametreler',
  })
  @ApiResponse({
    status: 500,
    description: 'Sunucu hatası',
  })
  async getNearbyPlaces(@Query() query: NearbyQueryDto): Promise<NearbyPlaceDto[]> {
    const cacheKey = `foursquare:nearby:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<NearbyPlaceDto[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.foursquareService.getNearbyPlaces({
      lat: query.lat,
      lng: query.lng,
      radius: query.radius,
      categories: query.categories,
      limit: query.limit,
    });

    // 30 dakika cache
    await this.cacheManager.set(cacheKey, result, 1800 * 1000);
    
    return result;
  }
}

