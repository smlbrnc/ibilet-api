import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: ['AWAITING_PAYMENT', 'PAYMENT_IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED'],
  })
  @IsString()
  @IsIn(['AWAITING_PAYMENT', 'PAYMENT_IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
