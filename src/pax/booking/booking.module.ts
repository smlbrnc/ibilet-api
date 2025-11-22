import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { PaxHttpService } from '../pax-http.service';
import { TokenManagerService } from '../token-manager.service';
import { TokenService } from '../token.service';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  controllers: [BookingController],
  providers: [PaxHttpService, TokenManagerService, TokenService, LoggerService],
  exports: [],
})
export class BookingModule {}

