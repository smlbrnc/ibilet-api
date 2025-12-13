import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ContactController],
  providers: [ContactService, LoggerService],
  exports: [ContactService],
})
export class ContactModule {}

