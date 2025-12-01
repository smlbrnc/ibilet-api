import { Module } from '@nestjs/common';
import { Yolcu360Controller } from './yolcu360.controller';
import { Yolcu360Service } from './yolcu360.service';
import { Yolcu360TokenService } from './yolcu360-token.service';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  controllers: [Yolcu360Controller],
  providers: [Yolcu360Service, Yolcu360TokenService, LoggerService],
  exports: [Yolcu360Service],
})
export class Yolcu360Module {}

