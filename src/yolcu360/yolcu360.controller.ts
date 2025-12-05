import { Controller, Get, Post, Query, Param, Body, UseFilters } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Yolcu360Service } from './yolcu360.service';
import { Yolcu360ExceptionFilter } from './filters/yolcu360-exception.filter';
import { LocationSearchDto, CarSearchDto, CreateOrderDto, OrderResponseDto, SaveCarSelectionDto } from './dto';
import { CarSelectionResponse, CarSelectionResponseDto } from './dto/response-types.dto';

@ApiTags('Yolcu 360')
@Controller('yolcu360')
@UseFilters(Yolcu360ExceptionFilter)
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
  })
  @ApiResponse({ status: 201, description: 'Sipariş oluşturuldu', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.yolcu360Service.createOrder(dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Sipariş detayı getir' })
  @ApiResponse({ status: 200, description: 'Sipariş detayı', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async getOrder(@Param('orderId') orderId: string): Promise<OrderResponseDto> {
    return this.yolcu360Service.getOrder(orderId);
  }

  @Post('car-selection/:code')
  @ApiOperation({ summary: 'Seçilen aracı veritabanına kaydet' })
  @ApiQuery({
    name: 'searchID',
    required: true,
    description: 'Search ID (search isteğinden dönen searchID)',
  })
  @ApiResponse({ status: 201, description: 'Araç başarıyla kaydedildi', type: CarSelectionResponseDto })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 404, description: 'Araç veya search yanıtı bulunamadı' })
  async saveCarSelection(
    @Param('code') code: string,
    @Query() dto: SaveCarSelectionDto,
  ): Promise<CarSelectionResponse> {
    return this.yolcu360Service.saveCarSelection(code, dto.searchID);
  }

  @Get('car-selection/:code')
  @ApiOperation({ summary: 'Kaydedilen araç kaydını getir (code ile)' })
  @ApiResponse({ status: 200, description: 'Araç kaydı', type: CarSelectionResponseDto })
  @ApiResponse({ status: 404, description: 'Araç kaydı bulunamadı' })
  async getCarSelection(@Param('code') code: string): Promise<CarSelectionResponse> {
    return this.yolcu360Service.getCarSelectionByCode(code);
  }
}