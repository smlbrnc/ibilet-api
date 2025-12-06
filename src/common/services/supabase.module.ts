import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, LoggerService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
