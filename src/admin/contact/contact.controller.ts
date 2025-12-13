import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CmsQueryDto } from '../dto/admin-query.dto';

@ApiTags('Admin - Contact')
@Controller('admin/contact')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'İletişim mesajları listesi' })
  @ApiResponse({ status: 200, description: 'İletişim mesajları listesi' })
  async getContactMessages(@Query() query: CmsQueryDto) {
    return this.contactService.getContactMessages(query);
  }

  @Put(':id/read')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'İletişim mesajını okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Mesaj okundu olarak işaretlendi' })
  async markContactAsRead(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.contactService.markContactAsRead(id, admin.id);
  }
}

