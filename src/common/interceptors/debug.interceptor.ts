import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DebugInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isDevelopment = this.configService.get('nodeEnv') === 'development';

    if (!isDevelopment) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // Eğer debug raw data varsa ekle
        if (request.debugRawData) {
          return {
            ...data,
            debug: {
              provider: 'PAXIMUM',
              raw: request.debugRawData,
            },
          };
        }

        return data;
      }),
    );
  }
}

