import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';

@ApiTags('Auth')
@Controller('auth')
export class SupabaseAuthController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SupabaseAuthController');
  }

  private handleError(error: any, code: string, message: string, status: HttpStatus): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error({
      message: `${code} hatası`,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpException(
      {
        success: false,
        code,
        message,
      },
      status,
    );
  }

  @Post('signup')
  @ApiOperation({ summary: 'Email/password ile kayıt ol' })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla kaydedildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async signup(
    @Body() body: { email: string; password: string; metadata?: Record<string, any> },
  ) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: body.metadata || {},
        },
      });

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'SIGNUP_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      };
    } catch (error) {
      this.handleError(error, 'SIGNUP_ERROR', 'Kayıt işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('signin')
  @ApiOperation({ summary: 'Email/password ile giriş yap' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  async signin(@Body() body: { email: string; password: string }) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'SIGNIN_ERROR',
            message: error.message,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      };
    } catch (error) {
      this.handleError(error, 'SIGNIN_ERROR', 'Giriş işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('signout')
  @ApiOperation({ summary: 'Çıkış yap' })
  @ApiResponse({ status: 200, description: 'Çıkış başarılı' })
  @ApiBearerAuth()
  async signout() {
    try {
      const { error } = await this.supabase.getAnonClient().auth.signOut({
        scope: 'global',
      });

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'SIGNOUT_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Çıkış başarılı',
      };
    } catch (error) {
      this.handleError(error, 'SIGNOUT_ERROR', 'Çıkış işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Token yenile' })
  @ApiResponse({ status: 200, description: 'Token yenilendi' })
  @ApiResponse({ status: 401, description: 'Geçersiz token' })
  @ApiBearerAuth()
  async refresh(@Body() body: { refresh_token: string }) {
    try {
      if (!body.refresh_token) {
        throw new HttpException(
          {
            success: false,
            code: 'REFRESH_ERROR',
            message: 'Refresh token bulunamadı',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const { data, error } = await this.supabase.getAnonClient().auth.refreshSession({
        refresh_token: body.refresh_token,
      });

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'REFRESH_ERROR',
            message: error.message,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      return {
        success: true,
        data: {
          session: data.session,
        },
      };
    } catch (error) {
      this.handleError(error, 'REFRESH_ERROR', 'Token yenileme başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('magic-link')
  @ApiOperation({ summary: 'Magic link gönder' })
  @ApiResponse({ status: 200, description: 'Magic link gönderildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async magicLink(@Body() body: { email: string; redirectTo?: string }) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithOtp({
        email: body.email,
        options: {
          emailRedirectTo: body.redirectTo,
        },
      });

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'MAGIC_LINK_ERROR',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Magic link gönderildi',
        data,
      };
    } catch (error) {
      this.handleError(error, 'MAGIC_LINK_ERROR', 'Magic link gönderilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user')
  @ApiOperation({ summary: 'Kullanıcı bilgilerini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgileri' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  @ApiBearerAuth()
  async getUser(@Headers('authorization') authorization?: string) {
    try {
      const token = authorization?.replace('Bearer ', '') || '';

      if (!token) {
        throw new HttpException(
          {
            success: false,
            code: 'GET_USER_ERROR',
            message: 'Token bulunamadı',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const { data: { user }, error } = await this.supabase.getAnonClient().auth.getUser(token);

      if (error) {
        throw new HttpException(
          {
            success: false,
            code: 'GET_USER_ERROR',
            message: error.message,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      return {
        success: true,
        data: { user },
      };
    } catch (error) {
      this.handleError(error, 'GET_USER_ERROR', 'Kullanıcı bilgileri alınamadı', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

