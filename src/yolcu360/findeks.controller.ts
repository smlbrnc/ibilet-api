import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FindeksService } from './findeks.service';
import {
  FindeksCheckDto,
  FindeksPhoneListDto,
  FindeksReportDto,
  FindeksPinConfirmDto,
  FindeksPinRenewDto,
  FindeksCheckResponse,
  FindeksPhoneListResponse,
  FindeksReportResponse,
} from './dto/findeks.dto';

@ApiTags('Findeks')
@Controller('findeks')
export class FindeksController {
  constructor(private readonly findeksService: FindeksService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kredi uygunluk kontrolü' })
  @ApiBody({
    type: FindeksCheckDto,
    description: 'Findeks kredi kontrolü isteği',
  })
  @ApiResponse({
    status: 200,
    description: 'Kredi uygunluk durumu',
    type: FindeksCheckResponse,
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async check(@Body() dto: FindeksCheckDto): Promise<FindeksCheckResponse> {
    return this.findeksService.check(dto);
  }

  @Post('phone-list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Müşteri telefon listesi' })
  @ApiBody({
    type: FindeksPhoneListDto,
    description: 'Telefon listesi isteği',
  })
  @ApiResponse({
    status: 200,
    description: 'Kayıtlı telefon numaraları listesi',
    type: FindeksPhoneListResponse,
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async getPhoneList(
    @Body() dto: FindeksPhoneListDto,
  ): Promise<FindeksPhoneListResponse> {
    return this.findeksService.getPhoneList(dto);
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Findeks kredi raporu oluştur' })
  @ApiBody({
    type: FindeksReportDto,
    description: 'Kredi raporu oluşturma isteği',
  })
  @ApiResponse({
    status: 200,
    description: 'Findeks raporu oluşturuldu',
    type: FindeksReportResponse,
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async generateReport(
    @Body() dto: FindeksReportDto,
  ): Promise<FindeksReportResponse> {
    return this.findeksService.generateReport(dto);
  }

  @Post('pin-confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'PIN kodu onayla' })
  @ApiBody({
    type: FindeksPinConfirmDto,
    description: 'PIN onaylama isteği',
  })
  @ApiResponse({
    status: 204,
    description: 'PIN başarıyla onaylandı',
  })
  @ApiResponse({ status: 400, description: 'Geçersiz PIN veya istek formatı' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async confirmPin(@Body() dto: FindeksPinConfirmDto): Promise<void> {
    return this.findeksService.confirmPin(dto);
  }

  @Post('pin-renew')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'PIN kodu yenile' })
  @ApiBody({
    type: FindeksPinRenewDto,
    description: 'PIN yenileme isteği',
  })
  @ApiResponse({
    status: 204,
    description: 'PIN başarıyla yenilendi',
  })
  @ApiResponse({ status: 400, description: 'Geçersiz istek formatı' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async renewPin(@Body() dto: FindeksPinRenewDto): Promise<void> {
    return this.findeksService.renewPin(dto);
  }
}

