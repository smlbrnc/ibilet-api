import { Module } from '@nestjs/common';
import { Yolcu360Controller } from './yolcu360.controller';
import { Yolcu360Service } from './yolcu360.service';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { FindeksService } from './findeks.service';
import { FindeksController } from './findeks.controller';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  controllers: [Yolcu360Controller, FindeksController],
  providers: [Yolcu360Service, Yolcu360TokenService, FindeksService, LoggerService],
  exports: [Yolcu360Service, FindeksService],
})
export class Yolcu360Module {}

