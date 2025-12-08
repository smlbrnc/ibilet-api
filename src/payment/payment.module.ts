import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PromotionService } from './promotion.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { SupabaseModule } from '../common/services/supabase.module';
import { PaxModule } from '../pax/pax.module';
import { Yolcu360Module } from '../yolcu360/yolcu360.module';
import { QueueModule } from '../common/queues/queue.module';

@Module({
  imports: [
    HttpModule,
    SupabaseModule,
    forwardRef(() => PaxModule),
    Yolcu360Module,
    QueueModule, // Queue module zaten notifications queue'sunu export ediyor
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PromotionService, LoggerService, PaymentConfigService],
  exports: [PaymentService, PromotionService],
})
export class PaymentModule {}
