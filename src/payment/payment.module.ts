import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { SupabaseModule } from '../common/services/supabase.module';
import { PaxModule } from '../pax/pax.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [HttpModule, SupabaseModule, forwardRef(() => PaxModule), EmailModule],
  controllers: [PaymentController],
  providers: [PaymentService, LoggerService, PaymentConfigService],
  exports: [PaymentService],
})
export class PaymentModule {}

