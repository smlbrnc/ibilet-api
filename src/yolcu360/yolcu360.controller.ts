import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Yolcu360Service } from './yolcu360.service';
import { LocationSearchDto, CarSearchDto, CreateOrderDto, OrderResponseDto } from './dto';

@ApiTags('Yolcu 360')
@Controller('yolcu360')
export class Yolcu360Controller {
  constructor(private readonly yolcu360Service: Yolcu360Service) {}

  @Get('locations')
  @ApiOperation({ summary: 'Lokasyon arama (Autocomplete)' })
  @ApiResponse({ status: 200, description: 'Lokasyon listesi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async searchLocations(@Query() dto: LocationSearchDto) {
    return this.yolcu360Service.searchLocations(dto.query);
  }

  @Get('locations/:placeId')
  @ApiOperation({ summary: 'Lokasyon detayı (Koordinat bilgisi)' })
  @ApiResponse({ status: 200, description: 'Lokasyon detayları' })
  @ApiResponse({ status: 404, description: 'Lokasyon bulunamadı' })
  async getLocationDetails(@Param('placeId') placeId: string) {
    return this.yolcu360Service.getLocationDetails(placeId);
  }

  @Post('search')
  @ApiOperation({ summary: 'Araç arama' })
  @ApiResponse({ status: 200, description: 'Müsait araç listesi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async searchCars(@Body() dto: CarSearchDto) {
    return this.yolcu360Service.searchCars(dto);
  }

  @Get('search/:searchID/:code')
  @ApiOperation({ summary: 'Araç arama sonucu detayı' })
  @ApiResponse({ status: 200, description: 'Seçilen araç detayı' })
  @ApiResponse({ status: 404, description: 'Araç bulunamadı' })
  async getCarSearchResult(
    @Param('searchID') searchID: string,
    @Param('code') code: string,
  ) {
    return this.yolcu360Service.getCarSearchResult(searchID, code);
  }

  @Post('order')
  @ApiOperation({ summary: 'Sipariş oluştur' })
  @ApiBody({
    type: CreateOrderDto,
    description: 'Sipariş oluşturma isteği',
    examples: {
      example1: {
        summary: 'Kredi kartı ile sipariş örneği',
        value: {
          paymentType: 'creditCard',
          searchID: 'search_123456789',
          code: 'ECAR',
          isFullCredit: true,
          isLimitedCredit: false,
          extraProducts: [
            { code: 'GPS', quantity: 1 },
            { code: 'CDW', quantity: 1 },
          ],
          passenger: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            nationality: 'US',
            phone: '+1234567890',
            birthDate: '1990-01-15',
            passportNo: 'ABC123456',
          },
          billing: {
            type: 'individual',
            label: 'Home Address',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            countryName: 'United States',
            countryCode: 'US',
            adm1: 'California',
            adm2: 'Los Angeles',
            line: '123 Main Street',
            zipCode: '90210',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sipariş oluşturuldu', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.yolcu360Service.createOrder(dto);
  }
}