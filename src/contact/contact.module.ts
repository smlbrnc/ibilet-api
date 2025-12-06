import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, LoggerService],
  exports: [ContactService],
})
export class ContactModule {}
