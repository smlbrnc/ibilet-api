import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ContactService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  async createContact(dto: CreateContactDto) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('contact')
        .insert([{
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          subject: dto.subject,
          message: dto.message,
          category: dto.category || 'general',
          booking_reference: dto.booking_reference,
          status: 'new',
        }])
        .select()
        .single();

      if (error) {
        this.throwError('CONTACT_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'İletişim formu gönderildi', email: dto.email, subject: dto.subject });

      return { 
        success: true, 
        message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        data: { id: data.id }
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'İletişim formu hatası', error: error.message });
      this.throwError('CONTACT_ERROR', 'Mesaj gönderilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

