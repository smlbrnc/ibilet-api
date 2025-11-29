import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PaxHttpService } from '../pax-http.service';
import { TokenManagerService } from '../token-manager.service';
import { TokenService } from '../token.service';
import { LoggerService } from '../../common/logger/logger.service';
import { SupabaseModule } from '../../common/services/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BookingController],
  providers: [BookingService, PaxHttpService, TokenManagerService, TokenService, LoggerService],
  exports: [BookingService],
})
export class BookingModule {}
