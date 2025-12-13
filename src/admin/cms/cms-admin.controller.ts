import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CmsAdminService } from './cms-admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CmsQueryDto } from '../dto/admin-query.dto';
import { CreateBlogDto, UpdateBlogDto } from '../dto/create-blog.dto';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/create-campaign.dto';
import { CreateDiscountDto, UpdateDiscountDto } from '../dto/create-discount.dto';
import { CreateTrendFlightDto, UpdateTrendFlightDto } from '../dto/create-trend-flight.dto';
import { CreateStaticPageDto, UpdateStaticPageDto } from '../dto/create-static-page.dto';
import { CreateFaqDto, UpdateFaqDto } from '../dto/create-faq.dto';

@ApiTags('Admin - CMS')
@Controller('admin/cms')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class CmsAdminController {
  constructor(private readonly cmsAdminService: CmsAdminService) {}

  // ==================== BLOGS ====================

  @Get('blogs')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Blog listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Blog listesi' })
  async getAdminBlogs(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminBlogs(query);
  }

  @Post('blogs')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Blog oluştur' })
  @ApiResponse({ status: 201, description: 'Blog oluşturuldu' })
  async createBlog(@Body() dto: CreateBlogDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createBlog(dto, admin.id);
  }

  @Put('blogs/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Blog güncelle' })
  @ApiResponse({ status: 200, description: 'Blog güncellendi' })
  async updateBlog(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateBlog(id, dto, admin.id);
  }

  @Delete('blogs/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Blog sil' })
  @ApiResponse({ status: 200, description: 'Blog silindi' })
  async deleteBlog(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteBlog(id, admin.id);
  }

  // ==================== CAMPAIGNS ====================

  @Get('campaigns')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Kampanya listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Kampanya listesi' })
  async getAdminCampaigns(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminCampaigns(query);
  }

  @Post('campaigns')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Kampanya oluştur' })
  @ApiResponse({ status: 201, description: 'Kampanya oluşturuldu' })
  async createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createCampaign(dto, admin.id);
  }

  @Put('campaigns/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Kampanya güncelle' })
  @ApiResponse({ status: 200, description: 'Kampanya güncellendi' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateCampaign(id, dto, admin.id);
  }

  @Delete('campaigns/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Kampanya sil' })
  @ApiResponse({ status: 200, description: 'Kampanya silindi' })
  async deleteCampaign(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteCampaign(id, admin.id);
  }

  // ==================== DISCOUNTS ====================

  @Get('discounts')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'İndirim kodu listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'İndirim kodu listesi' })
  async getAdminDiscounts(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminDiscounts(query);
  }

  @Post('discounts')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'İndirim kodu oluştur' })
  @ApiResponse({ status: 201, description: 'İndirim kodu oluşturuldu' })
  async createDiscount(@Body() dto: CreateDiscountDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createDiscount(dto, admin.id);
  }

  @Put('discounts/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'İndirim kodu güncelle' })
  @ApiResponse({ status: 200, description: 'İndirim kodu güncellendi' })
  async updateDiscount(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateDiscount(id, dto, admin.id);
  }

  @Delete('discounts/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'İndirim kodu sil' })
  @ApiResponse({ status: 200, description: 'İndirim kodu silindi' })
  async deleteDiscount(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteDiscount(id, admin.id);
  }

  // ==================== TREND FLIGHTS ====================

  @Get('trends/flights')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Trend uçuş listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Trend uçuş listesi' })
  async getAdminTrendFlights(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminTrendFlights(query);
  }

  @Post('trends/flights')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Trend uçuş oluştur' })
  @ApiResponse({ status: 201, description: 'Trend uçuş oluşturuldu' })
  async createTrendFlight(@Body() dto: CreateTrendFlightDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createTrendFlight(dto, admin.id);
  }

  @Put('trends/flights/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Trend uçuş güncelle' })
  @ApiResponse({ status: 200, description: 'Trend uçuş güncellendi' })
  async updateTrendFlight(
    @Param('id') id: string,
    @Body() dto: UpdateTrendFlightDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateTrendFlight(id, dto, admin.id);
  }

  @Delete('trends/flights/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Trend uçuş sil' })
  @ApiResponse({ status: 200, description: 'Trend uçuş silindi' })
  async deleteTrendFlight(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteTrendFlight(id, admin.id);
  }

  // ==================== STATIC PAGES ====================

  @Get('pages')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Statik sayfa listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Statik sayfa listesi' })
  async getAdminStaticPages(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminStaticPages(query);
  }

  @Post('pages')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Statik sayfa oluştur' })
  @ApiResponse({ status: 201, description: 'Statik sayfa oluşturuldu' })
  async createStaticPage(@Body() dto: CreateStaticPageDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createStaticPage(dto, admin.id);
  }

  @Put('pages/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Statik sayfa güncelle' })
  @ApiResponse({ status: 200, description: 'Statik sayfa güncellendi' })
  async updateStaticPage(
    @Param('id') id: string,
    @Body() dto: UpdateStaticPageDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateStaticPage(id, dto, admin.id);
  }

  @Delete('pages/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Statik sayfa sil' })
  @ApiResponse({ status: 200, description: 'Statik sayfa silindi' })
  async deleteStaticPage(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteStaticPage(id, admin.id);
  }

  // ==================== FAQ ====================

  @Get('faq')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'FAQ listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'FAQ listesi' })
  async getAdminFaqs(@Query() query: CmsQueryDto) {
    return this.cmsAdminService.getAdminFaqs(query);
  }

  @Post('faq')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'FAQ oluştur' })
  @ApiResponse({ status: 201, description: 'FAQ oluşturuldu' })
  async createFaq(@Body() dto: CreateFaqDto, @CurrentUser() admin: any) {
    return this.cmsAdminService.createFaq(dto, admin.id);
  }

  @Put('faq/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'FAQ güncelle' })
  @ApiResponse({ status: 200, description: 'FAQ güncellendi' })
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser() admin: any,
  ) {
    return this.cmsAdminService.updateFaq(id, dto, admin.id);
  }

  @Delete('faq/:id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'FAQ sil' })
  @ApiResponse({ status: 200, description: 'FAQ silindi' })
  async deleteFaq(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.cmsAdminService.deleteFaq(id, admin.id);
  }
}

