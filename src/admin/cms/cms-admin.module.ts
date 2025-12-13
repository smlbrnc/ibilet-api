import { Module } from '@nestjs/common';
import { CmsAdminController } from './cms-admin.controller';
import { CmsAdminService } from './cms-admin.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CmsAdminController],
  providers: [CmsAdminService, LoggerService],
  exports: [CmsAdminService],
})
export class CmsAdminModule {}

