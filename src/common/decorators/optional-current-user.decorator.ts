import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Optional Current User Decorator
 *
 * Request'ten kullanıcı bilgisini çıkarır.
 * Token yoksa veya geçersizse undefined döner.
 *
 * Kullanım:
 * @UseGuards(OptionalAuthGuard)
 * async endpoint(@OptionalCurrentUser() user?: any) {
 *   if (user) {
 *     // Kullanıcı login olmuş
 *     const userId = user.id;
 *   } else {
 *     // Anonymous kullanıcı
 *   }
 * }
 */
export const OptionalCurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user || undefined;
});
