import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  imports: [SupabaseModule],
  controllers: [BookingsController],
  providers: [BookingsService, LoggerService],
  exports: [BookingsService],
})
export class BookingsModule {}

