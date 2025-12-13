import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Moderator'lar için özel izin kontrolü.
 * super_admin ve admin için her zaman true döner.
 * Sadece moderator rolü için permissions JSONB'den kontrol edilir.
 * 
 * @param permission - Gerekli izin anahtarı (örn: 'users.write', 'bookings.update')
 * @example
 * @RequirePermission('users.write')
 * @Put('users/:id')
 * async updateUser() { ... }
 */
export const RequirePermission = (permission: string) => SetMetadata(REQUIRE_PERMISSION_KEY, permission);

