import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ROLE_KEY = 'requireRole';
export type AdminRole = 'super_admin' | 'admin' | 'moderator';

/**
 * Endpoint'e erişim için gerekli rolleri belirler.
 * Birden fazla role verilirse OR mantığı ile çalışır (herhangi biri yeterli).
 * 
 * @param roles - Gerekli roller
 * @example
 * @RequireRole('super_admin', 'admin')
 * @Get('users')
 * async getUsers() { ... }
 */
export const RequireRole = (...roles: AdminRole[]) => SetMetadata(REQUIRE_ROLE_KEY, roles);

