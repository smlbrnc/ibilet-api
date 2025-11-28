import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [HttpModule, SupabaseModule],
  controllers: [PaymentController],
  providers: [PaymentService, LoggerService, PaymentConfigService],
  exports: [PaymentService],
})
export class PaymentModule {}

