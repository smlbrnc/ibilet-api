import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsController } from './sms.controller';
import { NetgsmService } from './netgsm.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [SmsController],
  providers: [NetgsmService, LoggerService],
  exports: [NetgsmService],
})
export class SmsModule {}

