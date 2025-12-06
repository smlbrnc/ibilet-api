import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [EmailController],
  providers: [EmailService, LoggerService],
  exports: [EmailService],
})
export class EmailModule {}
