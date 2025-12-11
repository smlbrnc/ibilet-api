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
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  UserQueryDto,
  BookingQueryDto,
  TransactionQueryDto,
  CmsQueryDto,
  DashboardStatsQueryDto,
} from './dto/admin-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { CreateBlogDto, UpdateBlogDto } from './dto/create-blog.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/create-discount.dto';
import { CreateTrendFlightDto, UpdateTrendFlightDto } from './dto/create-trend-flight.dto';
import { CreateStaticPageDto, UpdateStaticPageDto } from './dto/create-static-page.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/create-faq.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== USERS ====================

  @Get('users')
  @ApiOperation({ summary: 'Tüm kullanıcıları listele' })
  @ApiResponse({ status: 200, description: 'Kullanıcı listesi' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Kullanıcı detayı' })
  @ApiResponse({ status: 200, description: 'Kullanıcı detayı' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Kullanıcı güncelle' })
  @ApiResponse({ status: 200, description: 'Kullanıcı güncellendi' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateUser(id, dto, admin.id);
  }

  @Delete('users/:id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Kullanıcı sil' })
  @ApiResponse({ status: 200, description: 'Kullanıcı silindi' })
  async deleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteUser(id, admin.id);
  }

  // ==================== BOOKINGS ====================

  @Get('bookings')
  @ApiOperation({ summary: 'Tüm rezervasyonları listele' })
  @ApiResponse({ status: 200, description: 'Rezervasyon listesi' })
  async getBookings(@Query() query: BookingQueryDto) {
    return this.adminService.getBookings(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Rezervasyon detayı' })
  @ApiResponse({ status: 200, description: 'Rezervasyon detayı' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getBooking(@Param('id') id: string) {
    return this.adminService.getBooking(id);
  }

  @Put('bookings/:id/status')
  @ApiOperation({ summary: 'Rezervasyon durumu güncelle' })
  @ApiResponse({ status: 200, description: 'Rezervasyon durumu güncellendi' })
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateBookingStatus(id, dto, admin.id);
  }

  // ==================== TRANSACTIONS ====================

  @Get('transactions')
  @ApiOperation({ summary: 'Tüm işlemleri listele' })
  @ApiResponse({ status: 200, description: 'İşlem listesi' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.adminService.getTransactions(query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'İşlem detayı' })
  @ApiResponse({ status: 200, description: 'İşlem detayı' })
  @ApiResponse({ status: 404, description: 'İşlem bulunamadı' })
  async getTransaction(@Param('id') id: string) {
    return this.adminService.getTransaction(id);
  }

  @Post('transactions/:id/refund')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'İade işlemi başlat' })
  @ApiResponse({ status: 200, description: 'İade işlemi başlatıldı' })
  async refundTransaction(
    @Param('id') id: string,
    @Body() dto: RefundTransactionDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.refundTransaction(id, dto, admin.id);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Dashboard istatistikleri' })
  @ApiResponse({ status: 200, description: 'Dashboard istatistikleri' })
  async getDashboardStats(@Query() query: DashboardStatsQueryDto) {
    return this.adminService.getDashboardStats(query);
  }

  // ==================== CMS - BLOGS ====================

  @Get('cms/blogs')
  @ApiOperation({ summary: 'Blog listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Blog listesi' })
  async getAdminBlogs(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminBlogs(query);
  }

  @Post('cms/blogs')
  @ApiOperation({ summary: 'Blog oluştur' })
  @ApiResponse({ status: 201, description: 'Blog oluşturuldu' })
  async createBlog(@Body() dto: CreateBlogDto, @CurrentUser() admin: any) {
    return this.adminService.createBlog(dto, admin.id);
  }

  @Put('cms/blogs/:id')
  @ApiOperation({ summary: 'Blog güncelle' })
  @ApiResponse({ status: 200, description: 'Blog güncellendi' })
  async updateBlog(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateBlog(id, dto, admin.id);
  }

  @Delete('cms/blogs/:id')
  @ApiOperation({ summary: 'Blog sil' })
  @ApiResponse({ status: 200, description: 'Blog silindi' })
  async deleteBlog(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteBlog(id, admin.id);
  }

  // ==================== CMS - CAMPAIGNS ====================

  @Get('cms/campaigns')
  @ApiOperation({ summary: 'Kampanya listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Kampanya listesi' })
  async getAdminCampaigns(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminCampaigns(query);
  }

  @Post('cms/campaigns')
  @ApiOperation({ summary: 'Kampanya oluştur' })
  @ApiResponse({ status: 201, description: 'Kampanya oluşturuldu' })
  async createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() admin: any) {
    return this.adminService.createCampaign(dto, admin.id);
  }

  @Put('cms/campaigns/:id')
  @ApiOperation({ summary: 'Kampanya güncelle' })
  @ApiResponse({ status: 200, description: 'Kampanya güncellendi' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateCampaign(id, dto, admin.id);
  }

  @Delete('cms/campaigns/:id')
  @ApiOperation({ summary: 'Kampanya sil' })
  @ApiResponse({ status: 200, description: 'Kampanya silindi' })
  async deleteCampaign(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteCampaign(id, admin.id);
  }

  // ==================== CMS - DISCOUNTS ====================

  @Get('cms/discounts')
  @ApiOperation({ summary: 'İndirim kodu listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'İndirim kodu listesi' })
  async getAdminDiscounts(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminDiscounts(query);
  }

  @Post('cms/discounts')
  @ApiOperation({ summary: 'İndirim kodu oluştur' })
  @ApiResponse({ status: 201, description: 'İndirim kodu oluşturuldu' })
  async createDiscount(@Body() dto: CreateDiscountDto, @CurrentUser() admin: any) {
    return this.adminService.createDiscount(dto, admin.id);
  }

  @Put('cms/discounts/:id')
  @ApiOperation({ summary: 'İndirim kodu güncelle' })
  @ApiResponse({ status: 200, description: 'İndirim kodu güncellendi' })
  async updateDiscount(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateDiscount(id, dto, admin.id);
  }

  @Delete('cms/discounts/:id')
  @ApiOperation({ summary: 'İndirim kodu sil' })
  @ApiResponse({ status: 200, description: 'İndirim kodu silindi' })
  async deleteDiscount(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteDiscount(id, admin.id);
  }

  // ==================== CMS - TREND FLIGHTS ====================

  @Get('cms/trends/flights')
  @ApiOperation({ summary: 'Trend uçuş listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Trend uçuş listesi' })
  async getAdminTrendFlights(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminTrendFlights(query);
  }

  @Post('cms/trends/flights')
  @ApiOperation({ summary: 'Trend uçuş oluştur' })
  @ApiResponse({ status: 201, description: 'Trend uçuş oluşturuldu' })
  async createTrendFlight(@Body() dto: CreateTrendFlightDto, @CurrentUser() admin: any) {
    return this.adminService.createTrendFlight(dto, admin.id);
  }

  @Put('cms/trends/flights/:id')
  @ApiOperation({ summary: 'Trend uçuş güncelle' })
  @ApiResponse({ status: 200, description: 'Trend uçuş güncellendi' })
  async updateTrendFlight(
    @Param('id') id: string,
    @Body() dto: UpdateTrendFlightDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateTrendFlight(id, dto, admin.id);
  }

  @Delete('cms/trends/flights/:id')
  @ApiOperation({ summary: 'Trend uçuş sil' })
  @ApiResponse({ status: 200, description: 'Trend uçuş silindi' })
  async deleteTrendFlight(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteTrendFlight(id, admin.id);
  }

  // ==================== CMS - STATIC PAGES ====================

  @Get('cms/pages')
  @ApiOperation({ summary: 'Statik sayfa listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'Statik sayfa listesi' })
  async getAdminStaticPages(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminStaticPages(query);
  }

  @Post('cms/pages')
  @ApiOperation({ summary: 'Statik sayfa oluştur' })
  @ApiResponse({ status: 201, description: 'Statik sayfa oluşturuldu' })
  async createStaticPage(@Body() dto: CreateStaticPageDto, @CurrentUser() admin: any) {
    return this.adminService.createStaticPage(dto, admin.id);
  }

  @Put('cms/pages/:id')
  @ApiOperation({ summary: 'Statik sayfa güncelle' })
  @ApiResponse({ status: 200, description: 'Statik sayfa güncellendi' })
  async updateStaticPage(
    @Param('id') id: string,
    @Body() dto: UpdateStaticPageDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateStaticPage(id, dto, admin.id);
  }

  @Delete('cms/pages/:id')
  @ApiOperation({ summary: 'Statik sayfa sil' })
  @ApiResponse({ status: 200, description: 'Statik sayfa silindi' })
  async deleteStaticPage(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteStaticPage(id, admin.id);
  }

  // ==================== CMS - FAQ ====================

  @Get('cms/faq')
  @ApiOperation({ summary: 'FAQ listesi (Admin)' })
  @ApiResponse({ status: 200, description: 'FAQ listesi' })
  async getAdminFaqs(@Query() query: CmsQueryDto) {
    return this.adminService.getAdminFaqs(query);
  }

  @Post('cms/faq')
  @ApiOperation({ summary: 'FAQ oluştur' })
  @ApiResponse({ status: 201, description: 'FAQ oluşturuldu' })
  async createFaq(@Body() dto: CreateFaqDto, @CurrentUser() admin: any) {
    return this.adminService.createFaq(dto, admin.id);
  }

  @Put('cms/faq/:id')
  @ApiOperation({ summary: 'FAQ güncelle' })
  @ApiResponse({ status: 200, description: 'FAQ güncellendi' })
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.updateFaq(id, dto, admin.id);
  }

  @Delete('cms/faq/:id')
  @ApiOperation({ summary: 'FAQ sil' })
  @ApiResponse({ status: 200, description: 'FAQ silindi' })
  async deleteFaq(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.deleteFaq(id, admin.id);
  }

  // ==================== CONTACT MESSAGES ====================

  @Get('contact')
  @ApiOperation({ summary: 'İletişim mesajları listesi' })
  @ApiResponse({ status: 200, description: 'İletişim mesajları listesi' })
  async getContactMessages(@Query() query: CmsQueryDto) {
    return this.adminService.getContactMessages(query);
  }

  @Put('contact/:id/read')
  @ApiOperation({ summary: 'İletişim mesajını okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Mesaj okundu olarak işaretlendi' })
  async markContactAsRead(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.markContactAsRead(id, admin.id);
  }
}
