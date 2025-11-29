import { Controller, Post, Get, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto, SigninDto, RefreshTokenDto, MagicLinkDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class SupabaseAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Email/password ile kayıt ol' })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla kaydedildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('signin')
  @ApiOperation({ summary: 'Email/password ile giriş yap' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  async signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @Post('signout')
  @ApiOperation({ summary: 'Çıkış yap' })
  @ApiResponse({ status: 200, description: 'Çıkış başarılı' })
  @ApiBearerAuth()
  async signout() {
    return this.authService.signout();
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Token yenile' })
  @ApiResponse({ status: 200, description: 'Token yenilendi' })
  @ApiResponse({ status: 401, description: 'Geçersiz token' })
  @ApiBearerAuth()
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('magic-link')
  @ApiOperation({ summary: 'Magic link gönder' })
  @ApiResponse({ status: 200, description: 'Magic link gönderildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async magicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto);
  }

  @Get('user')
  @ApiOperation({ summary: 'Kullanıcı bilgilerini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgileri' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiBearerAuth()
  async getUser(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace('Bearer ', '') || '';
    return this.authService.getUser(token);
  }
}
