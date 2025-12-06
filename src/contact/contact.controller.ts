import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'İletişim formu gönder' })
  @ApiResponse({ status: 201, description: 'Mesaj başarıyla gönderildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async createContact(@Body() dto: CreateContactDto) {
    return this.contactService.createContact(dto);
  }
}

