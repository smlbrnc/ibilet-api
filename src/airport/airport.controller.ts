import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AirportService, NearestAirportResult } from './airport.service';
import { NearestAirportRequestDto } from './dto/nearest-airport-request.dto';

@ApiTags('Airport')
@Controller('airport')
export class AirportController {
  constructor(private readonly airportService: AirportService) {}

  @Post('nearest')
  @ApiOperation({ summary: 'En yakın havalimanını bul' })
  @ApiResponse({
    status: 200,
    description: 'En yakın havalimanı bulundu',
    schema: {
      example: {
        success: true,
        data: {
          airport: {
            type: 'large_airport',
            name: 'Dubai International Airport',
            lat: 25.2532,
            lon: 55.3657,
          },
          distance: 23.45,
        },
        requestId: 'xxx',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Geçersiz parametreler' })
  @ApiResponse({ status: 500, description: 'Havalimanı bulunamadı' })
  async findNearest(
    @Body() request: NearestAirportRequestDto,
  ): Promise<NearestAirportResult> {
    return this.airportService.findNearestAirport(
      request.latitude,
      request.longitude,
      request.type,
    );
  }
}

