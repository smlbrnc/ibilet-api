import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Resend')
@Controller('resend')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Public()
  @Post('send')
  @ApiOperation({
    summary: 'Resend Email Gönder',
    description: 'Belirtilen alıcıya HTML formatında email gönderir',
  })
  @ApiBody({
    type: SendEmailDto,
    examples: {
      'Rezervasyon Onayı': {
        value: {
          to: 'customer@example.com',
          subject: 'İbilet - Rezervasyon Onayı',
          html: '<h1>Rezervasyonunuz Onaylandı</h1><p>PNR: PX041346</p>',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email başarıyla gönderildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz email verisi' })
  @ApiResponse({ status: 500, description: 'Email gönderimi başarısız' })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    return await this.emailService.sendEmail(sendEmailDto);
  }
}
