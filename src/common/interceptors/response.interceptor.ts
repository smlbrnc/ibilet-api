import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // Eğer response zaten standart formatta ise (success field varsa), dokunma
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Standart formata çevir
        return {
          success: true,
          data,
          requestId,
        };
      }),
    );
  }
}
