import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import { SignupDto, SigninDto, RefreshTokenDto, MagicLinkDto, ResetPasswordDto, UpdatePasswordDto, OAuthProvider } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  private async handleRequest<T>(
    operation: () => Promise<T>,
    errorCode: string,
    errorMessage: string,
    errorStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: errorMessage, error: error.message });
      this.throwError(errorCode, errorMessage, errorStatus);
    }
  }

  async signup(dto: SignupDto) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.signUp({
        email: dto.email,
        password: dto.password,
        options: { data: dto.metadata || {} },
      });

      if (error) this.throwError('SIGNUP_ERROR', error.message, HttpStatus.BAD_REQUEST);

      // Metadata'yı user_profiles tablosuna kaydet
      if (data.user && dto.metadata) {
        const { full_name, phone, date_of_birth, gender, nationality, tc_kimlik_no } = dto.metadata;
        const profileUpdate = Object.fromEntries(
          Object.entries({ full_name, phone, date_of_birth, gender, nationality, tc_kimlik_no })
            .filter(([, v]) => v !== undefined)
        );

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await this.supabase.getAdminClient()
            .from('user_profiles')
            .update(profileUpdate)
            .eq('id', data.user.id);

          if (profileError) this.logger.warn({ message: 'Profil güncelleme hatası', error: profileError.message });
        }
      }

      this.logger.log({ message: 'Kullanıcı kaydedildi', email: dto.email });
      return { success: true, data: { user: data.user, session: data.session } };
    }, 'SIGNUP_ERROR', 'Kayıt işlemi başarısız');
    }

  async signin(dto: SigninDto) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error) this.throwError('SIGNIN_ERROR', error.message, HttpStatus.UNAUTHORIZED);

      this.logger.log({ message: 'Kullanıcı giriş yaptı', email: dto.email });
      return { success: true, data: { user: data.user, session: data.session } };
    }, 'SIGNIN_ERROR', 'Giriş işlemi başarısız');
    }

  async signout() {
    return this.handleRequest(async () => {
      const { error } = await this.supabase.getAnonClient().auth.signOut({ scope: 'global' });
      if (error) this.throwError('SIGNOUT_ERROR', error.message, HttpStatus.BAD_REQUEST);
      return { success: true, message: 'Çıkış başarılı' };
    }, 'SIGNOUT_ERROR', 'Çıkış işlemi başarısız');
    }

  async refreshToken(dto: RefreshTokenDto) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.refreshSession({
        refresh_token: dto.refresh_token,
      });

      if (error) this.throwError('REFRESH_ERROR', error.message, HttpStatus.UNAUTHORIZED);
      return { success: true, data: { session: data.session } };
    }, 'REFRESH_ERROR', 'Token yenileme başarısız');
    }

  async sendMagicLink(dto: MagicLinkDto) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithOtp({
        email: dto.email,
        options: { emailRedirectTo: dto.redirectTo },
      });

      if (error) this.throwError('MAGIC_LINK_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Magic link gönderildi', email: dto.email });
      return { success: true, message: 'Magic link gönderildi', data };
    }, 'MAGIC_LINK_ERROR', 'Magic link gönderilemedi');
    }

  async getUser(token: string) {
    if (!token) this.throwError('GET_USER_ERROR', 'Token bulunamadı', HttpStatus.UNAUTHORIZED);

    return this.handleRequest(async () => {
      const { data: { user }, error } = await this.supabase.getAnonClient().auth.getUser(token);
      if (error) this.throwError('GET_USER_ERROR', error.message, HttpStatus.UNAUTHORIZED);
      return { success: true, data: { user } };
    }, 'GET_USER_ERROR', 'Kullanıcı bilgileri alınamadı');
    }

  async resetPassword(dto: ResetPasswordDto) {
    return this.handleRequest(async () => {
      const { error } = await this.supabase.getAnonClient().auth.resetPasswordForEmail(
        dto.email,
        { redirectTo: dto.redirectTo },
      );

      if (error) this.throwError('RESET_PASSWORD_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Şifre sıfırlama emaili gönderildi', email: dto.email });
      return { success: true, message: 'Şifre sıfırlama linki email adresinize gönderildi' };
    }, 'RESET_PASSWORD_ERROR', 'Şifre sıfırlama emaili gönderilemedi');
    }

  async updatePassword(token: string, dto: UpdatePasswordDto) {
    if (!token) this.throwError('UPDATE_PASSWORD_ERROR', 'Token bulunamadı', HttpStatus.UNAUTHORIZED);

    return this.handleRequest(async () => {
      const { data: sessionData, error: sessionError } = await this.supabase.getAnonClient().auth.getUser(token);

      if (sessionError || !sessionData.user) {
        this.throwError('UPDATE_PASSWORD_ERROR', 'Geçersiz veya süresi dolmuş token', HttpStatus.UNAUTHORIZED);
      }

      const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(
        sessionData.user.id,
        { password: dto.password }
      );

      if (error) this.throwError('UPDATE_PASSWORD_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Şifre güncellendi', userId: sessionData.user.id });
      return { success: true, message: 'Şifreniz başarıyla güncellendi' };
    }, 'UPDATE_PASSWORD_ERROR', 'Şifre güncellenemedi');
    }

  async verifyEmailToken(tokenHash: string, type: string): Promise<any> {
    if (!tokenHash || !type) {
      return { success: false, code: 'INVALID_PARAMS', message: 'Token hash ve type gereklidir' };
    }

    try {
      const { data, error } = await this.supabase.getAnonClient().auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (error) {
        this.logger.error({ message: 'Email doğrulama hatası', error: error.message });
        return { success: false, code: 'VERIFICATION_ERROR', message: error.message };
      }

      this.logger.log({ message: 'Email doğrulandı', userId: data.user?.id, type });
      return { success: true, data: { user: data.user, session: data.session } };
    } catch (error) {
      this.logger.error({ message: 'Email doğrulama hatası', error: error.message });
      return { success: false, code: 'VERIFICATION_ERROR', message: 'Email doğrulama başarısız' };
    }
  }

  async getOAuthUrl(provider: OAuthProvider, redirectTo?: string) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) this.throwError('OAUTH_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'OAuth URL oluşturuldu', provider });
      return { success: true, data: { url: data.url, provider: data.provider } };
    }, 'OAUTH_ERROR', 'OAuth URL oluşturulamadı');
    }

  async signInWithIdToken(provider: OAuthProvider, token: string, nonce?: string, accessToken?: string) {
    return this.handleRequest(async () => {
      const { data, error } = await this.supabase.getAnonClient().auth.signInWithIdToken({
        provider,
        token,
        nonce,
        access_token: accessToken,
      });

      if (error) this.throwError('ID_TOKEN_ERROR', error.message, HttpStatus.UNAUTHORIZED);

      // Kullanıcı profili güncelle
      if (data.user) {
        const metadata = data.user.user_metadata || {};
        const profileUpdate: Record<string, any> = {};

        if (metadata.full_name || metadata.name) profileUpdate.full_name = metadata.full_name || metadata.name;
        if (metadata.avatar_url || metadata.picture) profileUpdate.avatar_url = metadata.avatar_url || metadata.picture;

        if (Object.keys(profileUpdate).length > 0) {
          await this.supabase.getAdminClient()
            .from('user_profiles')
            .update({ ...profileUpdate, updated_at: new Date().toISOString() })
            .eq('id', data.user.id);
        }
      }

      this.logger.log({ message: 'ID Token ile giriş başarılı', provider, userId: data.user?.id });
      return { success: true, data: { user: data.user, session: data.session } };
    }, 'ID_TOKEN_ERROR', 'ID Token ile giriş başarısız');
    }
  }
