import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Yolcu360Service } from './yolcu360.service';
import { LocationSearchDto, CarSearchDto } from './dto';

@ApiTags('Yolcu 360')
@Controller('yolcu360')
export class Yolcu360Controller {
  constructor(private readonly yolcu360Service: Yolcu360Service) {}

  @Get('locations')
  @ApiOperation({ summary: 'Lokasyon arama (Autocomplete)' })
  @ApiResponse({ status: 200, description: 'Lokasyon listesi' })
  async searchLocations(@Query() dto: LocationSearchDto) {
    return this.yolcu360Service.searchLocations(dto.query);
  }

  @Get('locations/:placeId')
  @ApiOperation({ summary: 'Lokasyon detayı (Koordinat bilgisi)' })
  @ApiResponse({ status: 200, description: 'Lokasyon detayları' })
  async getLocationDetails(@Param('placeId') placeId: string) {
    return this.yolcu360Service.getLocationDetails(placeId);
  }

  @Post('search')
  @ApiOperation({ summary: 'Araç arama' })
  @ApiResponse({ status: 200, description: 'Müsait araç listesi' })
  async searchCars(@Body() dto: CarSearchDto) {
    return this.yolcu360Service.searchCars(dto);
  }
}

