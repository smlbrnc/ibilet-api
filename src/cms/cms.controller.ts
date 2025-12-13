import { Controller, Get, Param, Query, Post, Put, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public } from '../common/decorators/public.decorator';
import { CreateCookieConsentDto, UpdateCookieConsentDto } from './dto/cookie-consent.dto';
import { Request } from 'express';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  private parseNumber(value?: string): number | undefined {
    return value ? parseInt(value, 10) : undefined;
  }

  // ==================== BLOGS ====================

  @Public()
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
      limit: this.parseNumber(limit),
      offset: this.parseNumber(offset),
    });
  }

  @Public()
  @Get('blogs/categories')
  @ApiOperation({ summary: 'Blog kategorilerini getir' })
  @ApiResponse({ status: 200, description: 'Kategori listesi' })
  async getBlogCategories() {
    return this.cmsService.getBlogCategories();
  }

  @Public()
  @Get('blogs/categories/:id')
  @ApiOperation({ summary: 'Kategoriye göre blogları getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlama sayısı' })
  @ApiResponse({ status: 200, description: 'Kategoriye göre blog listesi' })
  async getBlogsByCategoryId(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.cmsService.getBlogsByCategoryId(id, {
      limit: this.parseNumber(limit),
      offset: this.parseNumber(offset),
    });
  }

  @Public()
  @Get('blogs/featured')
  @ApiOperation({ summary: 'Öne çıkan blogları getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 2)' })
  @ApiResponse({ status: 200, description: 'Öne çıkan blog listesi' })
  async getFeaturedBlogs(@Query('limit') limit?: string) {
    return this.cmsService.getFeaturedBlogs(this.parseNumber(limit) || 2);
  }

  @Public()
  @Get('blogs/recent')
  @ApiOperation({ summary: 'Son yazıları getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 4)' })
  @ApiResponse({ status: 200, description: 'Son yazılar listesi' })
  async getRecentBlogs(@Query('limit') limit?: string) {
    return this.cmsService.getRecentBlogs(this.parseNumber(limit) || 4);
  }

  @Public()
  @Get('blogs/:slug')
  @ApiOperation({ summary: 'Blog detayını getir' })
  @ApiResponse({ status: 200, description: 'Blog detayı' })
  @ApiResponse({ status: 404, description: 'Blog bulunamadı' })
  async getBlogBySlug(@Param('slug') slug: string) {
    return this.cmsService.getBlogBySlug(slug);
  }

  // ==================== CAMPAIGNS ====================

  @Public()
  @Get('campaigns')
  @ApiOperation({ summary: 'Kampanya listesini getir' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['flight', 'hotel', 'both'],
    description: 'Kampanya tipi',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit' })
  @ApiResponse({ status: 200, description: 'Kampanya listesi' })
  async getCampaigns(@Query('type') type?: string, @Query('limit') limit?: string) {
    return this.cmsService.getCampaigns({
      type,
      limit: this.parseNumber(limit),
    });
  }

  @Public()
  @Get('campaigns/:slug')
  @ApiOperation({ summary: 'Kampanya detayını getir' })
  @ApiResponse({ status: 200, description: 'Kampanya detayı' })
  @ApiResponse({ status: 404, description: 'Kampanya bulunamadı' })
  async getCampaignBySlug(@Param('slug') slug: string) {
    return this.cmsService.getCampaignBySlug(slug);
  }

  // ==================== DISCOUNTS ====================

  @Public()
  @Get('discounts')
  @ApiOperation({ summary: 'Aktif indirim kodlarını listele' })
  @ApiResponse({ status: 200, description: 'İndirim listesi' })
  async getDiscounts() {
    return this.cmsService.getDiscounts();
  }

  @Public()
  @Get('discounts/validate/:code')
  @ApiOperation({ summary: 'İndirim kodunu doğrula' })
  @ApiResponse({ status: 200, description: 'Geçerli indirim kodu' })
  @ApiResponse({ status: 404, description: 'Geçersiz indirim kodu' })
  async validateDiscountCode(@Param('code') code: string) {
    return this.cmsService.validateDiscountCode(code);
  }

  // ==================== TRENDS ====================

  @Public()
  @Get('trends/flights')
  @ApiOperation({ summary: 'Popüler uçuşları getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 6)' })
  @ApiResponse({ status: 200, description: 'Trend uçuş listesi' })
  async getTrendFlights(@Query('limit') limit?: string) {
    return this.cmsService.getTrendFlights(this.parseNumber(limit) || 6);
  }

  // ==================== STATIC PAGES ====================

  @Public()
  @Get('pages')
  @ApiOperation({ summary: 'Statik sayfa listesini getir' })
  @ApiResponse({ status: 200, description: 'Sayfa listesi' })
  async getStaticPages() {
    return this.cmsService.getStaticPages();
  }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Statik sayfa detayını getir' })
  @ApiResponse({ status: 200, description: 'Sayfa detayı' })
  @ApiResponse({ status: 404, description: 'Sayfa bulunamadı' })
  async getStaticPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.getStaticPageBySlug(slug);
  }

  @Public()
  @Get('cookie-policy')
  @ApiOperation({ summary: 'Çerez politikası sayfasını getir' })
  @ApiResponse({ status: 200, description: 'Çerez politikası içeriği' })
  @ApiResponse({ status: 404, description: 'Çerez politikası sayfası bulunamadı' })
  async getCookiePolicy() {
    return this.cmsService.getStaticPageBySlug('cookie-policy');
  }

  // ==================== FAQ ====================

  @Public()
  @Get('faq')
  @ApiOperation({ summary: 'Sık Sorulan Soruları getir' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tr', 'en'], description: 'Dil seçimi (tr/en)' })
  @ApiResponse({ status: 200, description: 'FAQ listesi' })
  async getFaqs(@Query('lang') lang?: string) {
    return this.cmsService.getFaqs(lang || 'tr');
  }

  // ==================== COOKIE CONSENT ====================

  @Public()
  @Post('cookie-consent')
  @ApiOperation({ summary: 'Çerez onayını kaydet (ilk onay)' })
  @ApiResponse({
    status: 201,
    description: 'Çerez onayı başarıyla kaydedildi',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          timestamp: '2025-12-13T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async createCookieConsent(@Body() dto: CreateCookieConsentDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    return this.cmsService.createCookieConsent(dto, ip);
  }

  @Public()
  @Put('cookie-consent')
  @ApiOperation({ summary: 'Çerez onayını güncelle (tercih değişikliği)' })
  @ApiResponse({
    status: 200,
    description: 'Çerez onayı başarıyla güncellendi',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          timestamp: '2025-12-13T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async updateCookieConsent(@Body() dto: UpdateCookieConsentDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    return this.cmsService.updateCookieConsent(dto, ip);
  }
}
