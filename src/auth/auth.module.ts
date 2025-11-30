import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, LoggerService],
  exports: [AuthService],
})
export class AuthModule {}
