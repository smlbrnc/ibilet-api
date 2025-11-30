import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CmsService } from './cms.service';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==================== BLOGS ====================

  @Get('blogs')
  @ApiOperation({ summary: 'Blog listesini getir' })
  @ApiQuery({ name: 'category', required: false, description: 'Kategori filtresi' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlama sayısı' })
  @ApiResponse({ status: 200, description: 'Blog listesi' })
  async getBlogs(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.cmsService.getBlogs({
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('blogs/:slug')
  @ApiOperation({ summary: 'Blog detayını getir' })
  @ApiResponse({ status: 200, description: 'Blog detayı' })
  @ApiResponse({ status: 404, description: 'Blog bulunamadı' })
  async getBlogBySlug(@Param('slug') slug: string) {
    return this.cmsService.getBlogBySlug(slug);
  }

  // ==================== CAMPAIGNS ====================

  @Get('campaigns')
  @ApiOperation({ summary: 'Kampanya listesini getir' })
  @ApiQuery({ name: 'type', required: false, enum: ['flight', 'hotel', 'both'], description: 'Kampanya tipi' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit' })
  @ApiResponse({ status: 200, description: 'Kampanya listesi' })
  async getCampaigns(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cmsService.getCampaigns({
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('campaigns/:slug')
  @ApiOperation({ summary: 'Kampanya detayını getir' })
  @ApiResponse({ status: 200, description: 'Kampanya detayı' })
  @ApiResponse({ status: 404, description: 'Kampanya bulunamadı' })
  async getCampaignBySlug(@Param('slug') slug: string) {
    return this.cmsService.getCampaignBySlug(slug);
  }

  // ==================== DISCOUNTS ====================

  @Get('discounts')
  @ApiOperation({ summary: 'Aktif indirim kodlarını listele' })
  @ApiResponse({ status: 200, description: 'İndirim listesi' })
  async getDiscounts() {
    return this.cmsService.getDiscounts();
  }

  @Get('discounts/validate/:code')
  @ApiOperation({ summary: 'İndirim kodunu doğrula' })
  @ApiResponse({ status: 200, description: 'Geçerli indirim kodu' })
  @ApiResponse({ status: 404, description: 'Geçersiz indirim kodu' })
  async validateDiscountCode(@Param('code') code: string) {
    return this.cmsService.validateDiscountCode(code);
  }

  // ==================== TRENDS ====================

  @Get('trends/hotels')
  @ApiOperation({ summary: 'Popüler otelleri getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 6)' })
  @ApiResponse({ status: 200, description: 'Trend otel listesi' })
  async getTrendHotels(@Query('limit') limit?: string) {
    return this.cmsService.getTrendHotels(limit ? parseInt(limit, 10) : 6);
  }

  @Get('trends/flights')
  @ApiOperation({ summary: 'Popüler uçuşları getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 6)' })
  @ApiResponse({ status: 200, description: 'Trend uçuş listesi' })
  async getTrendFlights(@Query('limit') limit?: string) {
    return this.cmsService.getTrendFlights(limit ? parseInt(limit, 10) : 6);
  }
}

