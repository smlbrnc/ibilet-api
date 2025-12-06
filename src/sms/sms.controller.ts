import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NetgsmService } from './netgsm.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { GetBalanceDto } from './dto/get-balance.dto';

@ApiTags('Netgsm')
@Controller('sms')
export class SmsController {
  constructor(private readonly netgsmService: NetgsmService) {}

  @Post('send')
  @ApiOperation({
    summary: 'SMS Gönder',
    description: 'Netgsm API kullanarak SMS gönderir',
  })
  @ApiBody({
    type: SendSmsDto,
    examples: {
      'Rezervasyon Onayı': {
        value: {
          no: '905551234567',
          msg: 'İbilet: PX041352 numaralı rezervasyonunuz onaylandı. İyi yolculuklar!',
          msgheader: 'IBGROUP',
          encoding: 'TR',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'SMS başarıyla gönderildi' })
  @ApiResponse({ status: 500, description: 'SMS gönderim hatası' })
  async sendSms(@Body() dto: SendSmsDto) {
    return this.netgsmService.sendSms(dto);
  }

  @Post('balance')
  @ApiOperation({
    summary: 'Bakiye Sorgula',
    description: 'Netgsm hesap bakiyesini sorgular',
  })
  @ApiBody({
    type: GetBalanceDto,
    examples: {
      'Tüm Varlık': { value: { stip: 3 } },
      'Kredi': { value: { stip: 2 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Bakiye sorgulandı' })
  @ApiResponse({ status: 500, description: 'Bakiye sorgulama hatası' })
  async getBalance(@Body() dto: GetBalanceDto) {
    return this.netgsmService.getBalance(dto);
  }
}

