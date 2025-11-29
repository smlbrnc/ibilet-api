import { Module } from '@nestjs/common';
import { SupabaseAuthController } from './supabase-auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [SupabaseAuthController],
  providers: [AuthService, LoggerService],
  exports: [AuthService],
})
export class AuthModule {}
