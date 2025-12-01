import { Controller, Post, Get, Body, Headers, Query, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoggerService } from '../common/logger/logger.service';
import { SignupDto, SigninDto, RefreshTokenDto, MagicLinkDto, ResetPasswordDto, UpdatePasswordDto, OAuthProvider, IdTokenSignInDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthController');
  }

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

  @Post('reset-password')
  @ApiOperation({ summary: 'Şifre sıfırlama emaili gönder' })
  @ApiResponse({ status: 200, description: 'Şifre sıfırlama emaili gönderildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('update-password')
  @ApiOperation({ summary: 'Şifreyi güncelle' })
  @ApiResponse({ status: 200, description: 'Şifre güncellendi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiBearerAuth()
  async updatePassword(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    return this.authService.updatePassword(token, dto);
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

  @Get('confirm')
  @ApiOperation({ summary: 'Email onay linkini doğrula ve frontend\'e yönlendir' })
  @ApiQuery({ name: 'token_hash', required: true, description: 'Token hash' })
  @ApiQuery({ name: 'type', required: true, description: 'Onay tipi (signup, recovery, invite, email)' })
  @ApiQuery({ name: 'redirect_to', required: false, description: 'Yönlendirilecek URL' })
  @ApiResponse({ status: 302, description: 'Frontend\'e yönlendirildi' })
  async confirmEmail(
    @Query('token_hash') tokenHash: string,
    @Query('type') type: string,
    @Query('redirect_to') redirectTo: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.verifyEmailToken(tokenHash, type);
    
    // Frontend URL'ini belirle
    const frontendUrl = redirectTo || process.env.FRONTEND_URL;
    
    if (result.success && result.data?.session) {
      // Başarılı - session bilgilerini URL'e ekle ve frontend'e yönlendir
      const params = new URLSearchParams({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
        type: type,
      });
      this.logger.log({ message: 'Email doğrulama başarılı, yönlendiriliyor', type });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } else {
      // Hata - hata mesajıyla frontend'e yönlendir
      const params = new URLSearchParams({
        error: result.code || 'VERIFICATION_ERROR',
        error_description: result.message || 'Email doğrulama başarısız',
      });
      this.logger.warn({ message: 'Email doğrulama başarısız', type, error: result.code });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    }
  }

  @Get('oauth/:provider')
  @ApiOperation({ summary: 'OAuth URL al (Google/Apple)' })
  @ApiParam({ name: 'provider', enum: OAuthProvider, description: 'OAuth provider' })
  @ApiQuery({ name: 'redirect_to', required: false, description: 'Başarılı giriş sonrası yönlendirilecek URL' })
  @ApiResponse({ status: 200, description: 'OAuth URL döndürüldü' })
  @ApiResponse({ status: 400, description: 'Geçersiz provider' })
  async getOAuthUrl(
    @Param('provider') provider: OAuthProvider,
    @Query('redirect_to') redirectTo?: string,
  ) {
    return this.authService.getOAuthUrl(provider, redirectTo);
  }

  @Post('oauth/token')
  @ApiOperation({ summary: 'ID Token ile giriş (Mobile Native)' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı' })
  @ApiResponse({ status: 401, description: 'Geçersiz token' })
  async signInWithIdToken(@Body() dto: IdTokenSignInDto) {
    return this.authService.signInWithIdToken(dto.provider, dto.token, dto.nonce, dto.accessToken);
  }
}

