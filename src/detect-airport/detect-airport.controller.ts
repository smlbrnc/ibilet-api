import { Controller, Get, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { DetectAirportService } from './detect-airport.service';
import { DetectAirportResponseDto } from './dto/detect-airport-response.dto';

@ApiTags('Detect Airport')
@Controller('detect-airport')
export class DetectAirportController {
  constructor(private readonly detectAirportService: DetectAirportService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'IP adresinden en yakın havalimanını bul',
    description:
      'İstek yapan kullanıcının IP adresini kullanarak ipapi.co API\'sinden konum bilgisi alır ve en yakın havalimanını döndürür.',
  })
  @ApiResponse({
    status: 200,
    description: 'En yakın havalimanı başarıyla bulundu',
    type: DetectAirportResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          iata: 'IST',
          city: 'Istanbul',
          airport_name: 'Istanbul Airport',
        },
        requestId: 'detect-airport-2025-12-06T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz IP adresi veya konum bilgisi alınamadı',
  })
  @ApiResponse({
    status: 404,
    description: 'En yakın havalimanı bulunamadı',
  })
  @ApiResponse({
    status: 500,
    description: 'Sunucu hatası',
  })
  @ApiResponse({
    status: 503,
    description: 'IP geolocation servisi kullanılamıyor',
  })
  async detectAirport(@Req() req: Request): Promise<DetectAirportResponseDto> {
    try {
      // IP adresini al
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown';

      // En yakın havalimanını bul
      const result = await this.detectAirportService.detectAirport(ip);

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Havalimanı tespit edilirken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
