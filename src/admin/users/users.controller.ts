import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { UserQueryDto } from '../dto/admin-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UpdateModeratorPermissionsDto } from '../dto/update-moderator-permissions.dto';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Tüm kullanıcıları listele' })
  @ApiResponse({ status: 200, description: 'Kullanıcı listesi' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.usersService.getUsers(query);
  }

  @Get(':id')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Kullanıcı detayı' })
  @ApiResponse({ status: 200, description: 'Kullanıcı detayı' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Put(':id')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Kullanıcı güncelle' })
  @ApiResponse({ status: 200, description: 'Kullanıcı güncellendi' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: any,
  ) {
    return this.usersService.updateUser(id, dto, admin.id);
  }

  @Delete(':id')
  @RequireRole('super_admin', 'admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Kullanıcı sil' })
  @ApiResponse({ status: 200, description: 'Kullanıcı silindi' })
  async deleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.usersService.deleteUser(id, admin.id);
  }

  // ==================== ROLE MANAGEMENT ====================

  @Get(':id/role')
  @RequireRole('super_admin', 'admin')
  @ApiOperation({ summary: 'Kullanıcının rolünü ve izinlerini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı rolü ve izinleri' })
  @ApiResponse({ status: 404, description: 'Rol bulunamadı' })
  async getUserRole(@Param('id') id: string) {
    return this.usersService.getUserRole(id);
  }

  @Put(':id/role')
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Kullanıcı rolü güncelle (sadece super_admin)' })
  @ApiResponse({ status: 200, description: 'Rol güncellendi' })
  @ApiResponse({ status: 403, description: 'Yetkisiz erişim' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: any,
  ) {
    return this.usersService.updateUserRole(id, dto.role, admin.id);
  }

  @Put(':id/permissions')
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Moderator izinlerini güncelle (sadece super_admin)' })
  @ApiResponse({ status: 200, description: 'İzinler güncellendi' })
  @ApiResponse({ status: 403, description: 'Yetkisiz erişim' })
  @ApiResponse({ status: 400, description: 'Sadece moderator rolü için izin güncellenebilir' })
  async updateModeratorPermissions(
    @Param('id') id: string,
    @Body() dto: UpdateModeratorPermissionsDto,
    @CurrentUser() admin: any,
  ) {
    return this.usersService.updateModeratorPermissions(id, dto.permissions, admin.id);
  }
}

// Role Management endpoints (separate controller for better organization)
@ApiTags('Admin - Roles')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequireRole('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Tüm roller ve yetkileri listele' })
  @ApiResponse({ status: 200, description: 'Roller ve yetkiler listesi' })
  async getAllRoles() {
    return this.usersService.getAllRoles();
  }

  @Get('permissions')
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Moderator\'lar için mevcut izin listesi' })
  @ApiResponse({ status: 200, description: 'İzin listesi' })
  async getAvailablePermissions() {
    return this.usersService.getAvailablePermissions();
  }
}

