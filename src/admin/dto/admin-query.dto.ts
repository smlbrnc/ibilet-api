import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Email, isim veya telefon ile arama' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['created_at', 'email', 'full_name'] })
  @IsOptional()
  @IsIn(['created_at', 'email', 'full_name'])
  sort?: string = 'created_at';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['AWAITING_PAYMENT', 'PAYMENT_IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['flight', 'hotel', 'car'] })
  @IsOptional()
  @IsString()
  product_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 format' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 format' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Rezervasyon numarası veya transaction ID' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'success', 'failed', 'refunded'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 format' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 format' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Sipariş ID ile arama' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CmsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  is_published?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({ enum: ['today', 'week', 'month', 'year', 'all'] })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year', 'all'])
  period?: string = 'all';
}
