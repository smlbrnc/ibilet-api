import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import { SignupDto, SigninDto, RefreshTokenDto, MagicLinkDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  /**
   * Supabase auth hatası fırlat
   */
  private throwAuthError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  /**
   * Kayıt ol
   */
  async signup(dto: SignupDto) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signUp({
        email: dto.email,
        password: dto.password,
        options: { data: dto.metadata || {} },
      });

      if (error) {
        this.throwAuthError('SIGNUP_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Kullanıcı kaydedildi', email: dto.email });

      return { success: true, data: { user: data.user, session: data.session } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kayıt hatası', error: error.message });
      this.throwAuthError('SIGNUP_ERROR', 'Kayıt işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Giriş yap
   */
  async signin(dto: SigninDto) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error) {
        this.throwAuthError('SIGNIN_ERROR', error.message, HttpStatus.UNAUTHORIZED);
      }

      this.logger.log({ message: 'Kullanıcı giriş yaptı', email: dto.email });

      return { success: true, data: { user: data.user, session: data.session } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Giriş hatası', error: error.message });
      this.throwAuthError('SIGNIN_ERROR', 'Giriş işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Çıkış yap
   */
  async signout() {
    try {
      const { error } = await this.supabase.getAnonClient().auth.signOut({ scope: 'global' });

      if (error) {
        this.throwAuthError('SIGNOUT_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, message: 'Çıkış başarılı' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Çıkış hatası', error: error.message });
      this.throwAuthError('SIGNOUT_ERROR', 'Çıkış işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Token yenile
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.refreshSession({
        refresh_token: dto.refresh_token,
      });

      if (error) {
        this.throwAuthError('REFRESH_ERROR', error.message, HttpStatus.UNAUTHORIZED);
      }

      return { success: true, data: { session: data.session } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Token yenileme hatası', error: error.message });
      this.throwAuthError('REFRESH_ERROR', 'Token yenileme başarısız', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Magic link gönder
   */
  async sendMagicLink(dto: MagicLinkDto) {
    try {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithOtp({
        email: dto.email,
        options: { emailRedirectTo: dto.redirectTo },
      });

      if (error) {
        this.throwAuthError('MAGIC_LINK_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Magic link gönderildi', email: dto.email });

      return { success: true, message: 'Magic link gönderildi', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Magic link hatası', error: error.message });
      this.throwAuthError('MAGIC_LINK_ERROR', 'Magic link gönderilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Kullanıcı bilgilerini getir
   */
  async getUser(token: string) {
    if (!token) {
      this.throwAuthError('GET_USER_ERROR', 'Token bulunamadı', HttpStatus.UNAUTHORIZED);
    }

    try {
      const { data: { user }, error } = await this.supabase.getAnonClient().auth.getUser(token);

      if (error) {
        this.throwAuthError('GET_USER_ERROR', error.message, HttpStatus.UNAUTHORIZED);
      }

      return { success: true, data: { user } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kullanıcı bilgisi hatası', error: error.message });
      this.throwAuthError('GET_USER_ERROR', 'Kullanıcı bilgileri alınamadı', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

