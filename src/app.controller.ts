import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Ana sayfa - API bilgileri' })
  getRoot() {
    return {
      name: 'iBilet Internal API',
      version: '1.0',
      description: 'iBilet Core API - Flight & Hotel Booking',
      status: 'running',
    };
  }
}

