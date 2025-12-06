import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FoursquareService } from './foursquare.service';
import { NearbyQueryDto, SortOption } from './dto/nearby-query.dto';
import { NearbyGroupedResponseDto } from './dto/nearby-response.dto';

@ApiTags('Foursquare')
@Controller('places')
export class FoursquareController {
  constructor(private readonly foursquareService: FoursquareService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Yakındaki yerleri listele' })
  @ApiQuery({
    name: 'sort',
    enum: SortOption,
    required: false,
    description: 'Sıralama kriteri (POPULARITY, RATING, DISTANCE)',
    example: SortOption.POPULARITY,
  })
  @ApiResponse({ status: 200, description: 'Yakındaki yerler başarıyla getirildi', type: NearbyGroupedResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz parametreler' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async getNearbyPlaces(@Query() query: NearbyQueryDto): Promise<NearbyGroupedResponseDto> {
    return this.foursquareService.getNearbyPlacesGrouped({
      lat: query.lat,
      lng: query.lng,
      radius: query.radius,
      categories: query.categories,
      limit: query.limit,
      sort: query.sort,
    });
  }
}
