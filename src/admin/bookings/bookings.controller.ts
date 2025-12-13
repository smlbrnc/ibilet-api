import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { BookingQueryDto } from '../dto/admin-query.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';

@ApiTags('Admin - Bookings')
@Controller('admin/bookings')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Tüm rezervasyonları listele' })
  @ApiResponse({ status: 200, description: 'Rezervasyon listesi' })
  async getBookings(@Query() query: BookingQueryDto) {
    return this.bookingsService.getBookings(query);
  }

  @Get(':id')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Rezervasyon detayı' })
  @ApiResponse({ status: 200, description: 'Rezervasyon detayı' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getBooking(@Param('id') id: string) {
    return this.bookingsService.getBooking(id);
  }

  @Put(':id/status')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Rezervasyon durumu güncelle' })
  @ApiResponse({ status: 200, description: 'Rezervasyon durumu güncellendi' })
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() admin: any,
  ) {
    return this.bookingsService.updateBookingStatus(id, dto, admin.id);
  }
}

