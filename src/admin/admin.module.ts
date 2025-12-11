import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SupabaseModule } from '../common/services/supabase.module';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService, LoggerService],
  exports: [AdminService],
})
export class AdminModule {}
