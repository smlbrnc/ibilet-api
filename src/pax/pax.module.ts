import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenManagerService } from './token-manager.service';
import { PaxHttpService } from './pax-http.service';
import { PaxService } from './pax.service';
import { PaxController } from './pax.controller';
import { BookingModule } from './booking/booking.module';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  imports: [BookingModule],
  controllers: [PaxController],
  providers: [TokenService, TokenManagerService, PaxHttpService, PaxService, LoggerService],
  exports: [TokenManagerService, PaxHttpService],
})
export class PaxModule {}
