import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TransactionsService } from './transactions.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { TransactionQueryDto } from '../dto/admin-query.dto';
import { RefundTransactionDto } from '../dto/refund-transaction.dto';

@ApiTags('Admin - Transactions')
@Controller('admin/transactions')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Tüm işlemleri listele' })
  @ApiResponse({ status: 200, description: 'İşlem listesi' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.transactionsService.getTransactions(query);
  }

  @Get(':id')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'İşlem detayı' })
  @ApiResponse({ status: 200, description: 'İşlem detayı' })
  @ApiResponse({ status: 404, description: 'İşlem bulunamadı' })
  async getTransaction(@Param('id') id: string) {
    return this.transactionsService.getTransaction(id);
  }

  @Post(':id/refund')
  @RequireRole('super_admin', 'admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'İade işlemi başlat' })
  @ApiResponse({ status: 200, description: 'İade işlemi başlatıldı' })
  async refundTransaction(
    @Param('id') id: string,
    @Body() dto: RefundTransactionDto,
    @CurrentUser() admin: any,
  ) {
    return this.transactionsService.refundTransaction(id, dto, admin.id);
  }
}

