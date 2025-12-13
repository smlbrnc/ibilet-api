import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { DashboardStatsQueryDto } from '../dto/admin-query.dto';

@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Dashboard istatistikleri' })
  @ApiResponse({ status: 200, description: 'Dashboard istatistikleri' })
  async getDashboardStats(@Query() query: DashboardStatsQueryDto) {
    return this.dashboardService.getDashboardStats(query);
  }
}

