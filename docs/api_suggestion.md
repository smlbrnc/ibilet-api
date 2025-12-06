# iBilet API - İyileştirme Önerileri

> **Tarih:** 6 Aralık 2025  
> **Kapsam:** Kod Kalitesi, Performans, Güvenlik, DevOps  
> **Hedef:** Production-Ready Enterprise API

## İçindekiler

- [Öncelik Matrisi](#öncelik-matrisi)
- [Kritik Öneriler](#kritik-öneriler)
- [Yüksek Öncelikli Öneriler](#yüksek-öncelikli-öneriler)
- [Orta Öncelikli Öneriler](#orta-öncelikli-öneriler)
- [Düşük Öncelikli Öneriler](#düşük-öncelikli-öneriler)
- [Mimari İyileştirmeler](#mimari-iyileştirmeler)
- [Best Practices](#best-practices)
- [Roadmap Önerisi](#roadmap-önerisi)

---

## Öncelik Matrisi

| Öncelik | Impact | Effort | Öneriler |
|---------|--------|--------|----------|
| 🔴 Kritik | Yüksek | Değişken | Test Coverage, TODO'lar, Guard Sistemi |
| 🟠 Yüksek | Yüksek | Orta | Type Safety, Redis Cache, Monitoring |
| 🟡 Orta | Orta | Düşük | Code Quality, Documentation, CI/CD |
| 🟢 Düşük | Düşük | Düşük | Optimization, Refactoring |

---

## Kritik Öneriler

### 1. Test Coverage Oluştur (🔴 Kritik)

**Mevcut Durum:** Test coverage %0

**Neden Kritik:**
- Production'da bug riski çok yüksek
- Refactoring yapılamıyor (regression korkusu)
- Code review'da sorunları tespit edemiyoruz

**Uygulama:**

#### A. Test Framework Kurulumu

```bash
npm install --save-dev @nestjs/testing jest ts-jest @types/jest supertest
```

#### B. Unit Test Yapısı

```typescript
// booking.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { SupabaseService } from '../common/services/supabase.service';
import { PaxHttpService } from '../pax/pax-http.service';

describe('BookingService', () => {
  let service: BookingService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let paxHttpService: jest.Mocked<PaxHttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: SupabaseService,
          useFactory: () => ({
            getAdminClient: jest.fn(),
          }),
        },
        {
          provide: PaxHttpService,
          useFactory: () => ({
            post: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    supabaseService = module.get(SupabaseService);
    paxHttpService = module.get(PaxHttpService);
  });

  describe('setReservationInfo', () => {
    it('should save to supabase successfully', async () => {
      // Mock setup
      paxHttpService.post.mockResolvedValue({
        header: { success: true },
        body: { transactionId: 'TEST123', expiresOn: '2025-12-31' },
      });

      supabaseService.getAdminClient.mockReturnValue({
        schema: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      } as any);

      // Test
      const result = await service.setReservationInfo({ offerId: 'abc' });

      // Assertions
      expect(result).toBeDefined();
      expect(result.transactionId).toBe('TEST123');
    });
  });
});
```

#### C. E2E Test Yapısı

```typescript
// test/booking.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Booking (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'test@example.com', password: 'Test1234!' });

    authToken = response.body.data.session.access_token;
  });

  it('/booking/begin-transaction (POST)', () => {
    return request(app.getHttpServer())
      .post('/booking/begin-transaction')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ offerId: 'TEST_OFFER', currency: 'TRY' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.transactionId).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

#### D. Coverage Target

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

**Tahmini Süre:** 4-6 hafta  
**ROI:** Çok Yüksek (Bug prevention, Refactoring confidence)

---

### 2. Guard Sistemi ve CurrentUser Decorator (🔴 Kritik)

**Durum:** ✅ **TAMAMLANDI**

**Yapılan İşlemler:**
- ✅ AuthGuard oluşturuldu ve global olarak aktif
- ✅ CurrentUser decorator tüm controller'larda kullanılıyor
- ✅ Public decorator eklendi
- ✅ Tüm endpoint'ler güncellendi

**Önceki Durum:** Her endpoint'te manuel token parsing

**Güncel Durum:**

#### A. AuthGuard Oluştur

```typescript
// common/guards/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token bulunamadı');
    }

    try {
      const { data: { user }, error } = await this.supabase
        .getAnonClient()
        .auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Geçersiz token');
      }

      request.user = user; // CurrentUser decorator için
      return true;
    } catch {
      throw new UnauthorizedException('Token doğrulanamadı');
    }
  }
}
```

#### B. CurrentUser Decorator'ı Aktif Et

```typescript
// Mevcut decorator kullanılabilir durumda, sadece aktive et
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: User) {
    // Artık user.id direkt kullanılabilir
    return this.userService.getProfile(user.id);
  }
}
```

#### C. Public Endpoint Decorator'ı

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// AuthGuard'da kullan
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ... token validation
  }
}

// Controller'da kullan
@Controller('auth')
export class AuthController {
  @Public()
  @Post('signin')
  async signin(@Body() dto: SigninDto) {
    // ...
  }
}
```

**Tahmini Süre:** ~~1 hafta~~ ✅ **TAMAMLANDI**  
**ROI:** Yüksek (Security + Code quality)

**Güncel Kullanım:**
```typescript
// Global guard (app.module.ts)
{
  provide: APP_GUARD,
  useClass: AuthGuard,
}

// Controller'da
@Controller('user')
export class UserController {
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user.id);
  }

  @Public()
  @Get('check')
  async checkEmail(@Query('email') email: string) {
    return this.userService.checkEmail(email);
  }
}
```

---

### 3. TODO Fonksiyonlarını Implement Et (🔴 Kritik)

**Durum:** ✅ **TAMAMLANDI (Temizlik)**

**Yapılan İşlem:**
- ✅ `getTransactionStatus()` metodu silindi
- ✅ `getStatus()` endpoint'i controller'dan kaldırıldı
- ✅ Production'da çalışmayan kod temizlendi

**Not:** Gelecekte ihtiyaç olursa Garanti VPOS Inquiry API dokümantasyonuna göre yeniden implement edilebilir.

#### ~~A. getTransactionStatus() Implementation~~ (Kaldırıldı)

```typescript
// payment.service.ts
async getTransactionStatus(orderId: string) {
  try {
    this.logger.log({ message: 'VPOS transaction status inquiry', orderId });

    // 1. Hash hesapla (inquiry için)
    const hashData = this.calculateInquiryHash({
      orderId,
      terminalId: this.paymentConfig.getTerminalId(),
      // ... diğer parametreler
    });

    // 2. XML request oluştur
    const xmlRequest = this.buildInquiryXml({
      orderId,
      hashData,
      paymentConfig: this.paymentConfig.getConfig(),
    });

    // 3. VPOS API'ye istek gönder
    const response = await firstValueFrom(
      this.httpService.post(getVposUrl(), xmlRequest, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    // 4. Response'u parse et
    const parsedResponse = await parseXmlResponse(response.data);

    // 5. Status'u formatla
    return this.formatInquiryResponse(parsedResponse);
  } catch (error) {
    this.logger.error({ message: 'Inquiry hatası', orderId, error: error.message });
    throw new InternalServerErrorException('İşlem durumu sorgulanamadı');
  }
}

// Yardımcı fonksiyonlar
private calculateInquiryHash(params: InquiryHashParams): string {
  // Garanti VPOS inquiry hash algoritması
  // Dokümantasyondan implementasyon
}

private buildInquiryXml(params: InquiryXmlParams): string {
  // XML request builder
  // Template: <?xml version="1.0"?><GVPSRequest>...</GVPSRequest>
}

private formatInquiryResponse(response: any) {
  // Response formatter
  return {
    orderId,
    status: response.Transaction.Response.Code,
    // ...
  };
}
```

**Tahmini Süre:** ~~1 hafta~~ ✅ **Kaldırıldı**  
**Kaynak:** N/A (Metod ve endpoint kaldırıldı)

---

### 4. Type Safety İyileştirme (🔴 Kritik)

**Mevcut Durum:** Çok fazla `any` kullanımı

#### A. PAX API Type Definitions

```typescript
// pax/types/pax-response.types.ts
export interface PaxHeader {
  requestId: string;
  success: boolean;
  responseTime: string;
  messages?: PaxMessage[];
}

export interface PaxMessage {
  id: number;
  code: string;
  messageType: number;
  message: string;
}

export interface PaxResponse<T = unknown> {
  header: PaxHeader;
  body: T;
}

export interface PaxPriceSearchBody {
  searchId: string;
  expiresOn: string;
  results: PaxSearchResult[];
}

// Kullanım
async priceSearch(request: FlightPriceSearchDto): Promise<PaxResponse<PaxPriceSearchBody>> {
  const result = await this.paxHttp.post<PaxPriceSearchBody>(...);
  return result;
}
```

#### B. Supabase Type Definitions

```typescript
// common/types/database.types.ts
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          // ...
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      // ... diğer tablolar
    };
  };
  backend: {
    Tables: {
      booking: {
        Row: {
          id: string;
          transaction_id: string;
          status: BookingStatus;
          // ...
        };
      };
    };
  };
}

// Kullanım
const { data } = await this.supabase
  .getAdminClient()
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
// data artık type-safe: UserProfile
```

#### C. Resend Types

```typescript
// email/types/resend.types.ts
import { Resend } from 'resend';

export type ResendClient = Resend;

export interface EmailAttachment {
  content: Buffer | string;
  filename: string;
  contentType?: string;
}

// Service'te
private readonly resend: ResendClient;
```

**Tahmini Süre:** 2 hafta  
**ROI:** Yüksek (Type safety, IDE support, Refactoring safety)

---

## Yüksek Öncelikli Öneriler

### 5. Redis Cache Implementation (🟠 Yüksek)

**Neden Gerekli:**
- In-memory cache scale edilemiyor
- Cluster'da her instance'ın kendi cache'i var (inconsistency)
- Cache invalidation yok

#### Implementation

```bash
npm install cache-manager-redis-yet ioredis
```

```typescript
// app.module.ts
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get('REDIS_PORT', 6379),
          },
          password: config.get('REDIS_PASSWORD'),
          ttl: 3600 * 1000, // 1 saat default
        }),
      }),
      inject: [ConfigService],
    }),
    // ...
  ],
})
```

#### Cache Invalidation Pattern

```typescript
// pax.service.ts
async priceSearch(request: FlightPriceSearchDto): Promise<any> {
  const cacheKey = `price-search:${JSON.stringify(request)}`;

  // Try cache
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  // API call
  const result = await this.callEndpoint('priceSearch', request);

  // Cache with TTL
  await this.cacheManager.set(cacheKey, result, 300000); // 5 dakika

  return result;
}

// Manual invalidation
async invalidatePriceSearchCache(searchId: string) {
  const keys = await this.cacheManager.store.keys(`price-search:*${searchId}*`);
  await Promise.all(keys.map(key => this.cacheManager.del(key)));
}
```

**Tahmini Süre:** 1 hafta  
**ROI:** Yüksek (Performance + Scalability)

---

### 6. Monitoring ve Observability (🟠 Yüksek)

#### A. Prometheus + Grafana

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),
    // ...
  ],
})
```

#### B. Custom Metrics

```typescript
// common/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly paxApiCalls: Counter;

  constructor(private readonly register: Registry) {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.paxApiCalls = new Counter({
      name: 'pax_api_calls_total',
      help: 'Total PAX API calls',
      labelNames: ['endpoint', 'status'],
      registers: [this.register],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  recordPaxApiCall(endpoint: string, success: boolean) {
    this.paxApiCalls.inc({ endpoint, status: success ? 'success' : 'error' });
  }
}
```

#### C. Grafana Dashboard

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**Tahmini Süre:** 1 hafta  
**ROI:** Çok Yüksek (Production visibility, Issue detection)

---

### 7. Error Stack Trace Gizleme (🟠 Yüksek)

```typescript
// common/filters/http-exception.filter.ts
catch(exception: HttpException, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const status = exception.getStatus();
  const exceptionResponse = exception.getResponse();

  const errorResponse = {
    success: false,
    code: exceptionResponse['code'] || 'INTERNAL_ERROR',
    message: exceptionResponse['message'] || exception.message,
    requestId: ctx.getRequest().id,
    timestamp: new Date().toISOString(),
  };

  // Production'da stack trace ekleme
  if (process.env.NODE_ENV !== 'production') {
    errorResponse['stack'] = exception.stack;
    errorResponse['details'] = exceptionResponse;
  }

  this.logger.error({
    code: errorResponse.code,
    message: errorResponse.message,
    stack: exception.stack, // Log'da her zaman var
    requestId: errorResponse.requestId,
  });

  response.status(status).json(errorResponse);
}
```

**Tahmini Süre:** 2 gün  
**ROI:** Orta (Security)

---

## Orta Öncelikli Öneriler

### 8. Database Transaction Wrapper (🟡 Orta)

```typescript
// common/decorators/transactional.decorator.ts
export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const supabase = this.supabase || this.supabaseService;
      
      try {
        // Begin transaction (Supabase function kullanarak)
        const result = await supabase.getAdminClient().rpc('begin_transaction');
        
        const methodResult = await originalMethod.apply(this, args);
        
        // Commit
        await supabase.getAdminClient().rpc('commit_transaction');
        
        return methodResult;
      } catch (error) {
        // Rollback
        await supabase.getAdminClient().rpc('rollback_transaction');
        throw error;
      }
    };

    return descriptor;
  };
}

// Kullanım
@Transactional()
async setReservationInfo(request: any) {
  // 1. pre_transactionid insert
  // 2. booking insert
  // Hata olursa otomatik rollback
}
```

**Not:** Supabase'de transaction için PostgreSQL function'ları yazılmalı:

```sql
-- Supabase migration
CREATE OR REPLACE FUNCTION begin_transaction() RETURNS void AS $$
BEGIN
  -- Transaction logic
END;
$$ LANGUAGE plpgsql;
```

**Tahmini Süre:** 1 hafta  
**ROI:** Orta (Data consistency)

---

### 9. API Rate Limiting Granular Control (🟡 Orta)

```typescript
// Endpoint-specific rate limiting
@Controller('payment')
export class PaymentController {
  @Post('initiate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  async initiatePayment() {
    // ...
  }

  @Get('status/:orderId')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 req/min
  async getStatus() {
    // ...
  }
}

// IP-based rate limiting
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ],
    storage: new ThrottlerStorageRedisService({
      host: 'localhost',
      port: 6379,
    }),
  }),
}),
```

**Tahmini Süre:** 3 gün  
**ROI:** Orta (DDoS protection)

---

### 10. CI/CD Pipeline (🟡 Orta)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Check coverage
        run: npm run test:cov
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Build
        run: npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: dist
      
      - name: Deploy to production
        run: |
          # Deployment script
          echo "Deploying to production..."
```

**Tahmini Süre:** 1 hafta  
**ROI:** Yüksek (Automated quality checks, Faster deployment)

---

## Düşük Öncelikli Öneriler

### 11. Code Duplication Elimination (🟢 Düşük)

#### Base Service Class

```typescript
// common/services/base.service.ts
export abstract class BaseService {
  constructor(protected readonly logger: LoggerService) {}

  protected throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  protected async handleRequest<T>(
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

  protected getToken(authorization?: string): string {
    return authorization?.replace('Bearer ', '') || '';
  }
}

// Kullanım
@Injectable()
export class UserService extends BaseService {
  constructor(
    protected readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
  ) {
    super(logger);
    this.logger.setContext('UserService');
  }

  async getProfile(token: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);
      // ...
    }, 'PROFILE_ERROR', 'Profil getirilemedi');
  }
}
```

**Tahmini Süre:** 1 hafta  
**ROI:** Düşük (Code quality improvement)

---

### 12. Docker ve Docker Compose (🟢 Düşük)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    volumes:
      - ./storage:/app/storage
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  redis_data:
```

**Tahmini Süre:** 2 gün  
**ROI:** Orta (Deployment standardization)

---

## Mimari İyileştirmeler

### A. Event-Driven Architecture (İsteğe Bağlı)

**Durum:** Mevcut sistem queue-based (Bull)

**Öneri:** Event Emitter pattern ile genişlet

```typescript
// common/events/booking.events.ts
export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly transactionId: string,
  ) {}
}

export class PaymentSuccessEvent {
  constructor(
    public readonly orderId: string,
    public readonly bookingId: string,
  ) {}
}

// booking.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BookingService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createBooking() {
    // ... booking creation
    this.eventEmitter.emit(
      'booking.created',
      new BookingCreatedEvent(bookingId, transactionId),
    );
  }
}

// Listener
@Injectable()
export class BookingListener {
  @OnEvent('booking.created')
  handleBookingCreated(event: BookingCreatedEvent) {
    // Analytics, notification, etc.
  }
}
```

**Fayda:** Loose coupling, extensibility

---

### B. CQRS Pattern (İsteğe Bağlı)

**Ne Zaman Gerekli:** Read/Write operasyonları çok farklıysa

```typescript
// commands/create-booking.command.ts
export class CreateBookingCommand {
  constructor(
    public readonly offerId: string,
    public readonly userId: string,
  ) {}
}

// commands/handlers/create-booking.handler.ts
@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  async execute(command: CreateBookingCommand) {
    // Write operation
  }
}

// queries/get-booking.query.ts
export class GetBookingQuery {
  constructor(public readonly bookingId: string) {}
}

// queries/handlers/get-booking.handler.ts
@QueryHandler(GetBookingQuery)
export class GetBookingHandler implements IQueryHandler<GetBookingQuery> {
  async execute(query: GetBookingQuery) {
    // Read operation
  }
}
```

**Fayda:** Scalability, complexity management

---

## Best Practices

### 1. Environment Variables Validation

```typescript
// config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  // ... diğer env'ler
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

// app.module.ts
ConfigModule.forRoot({
  validate,
}),
```

### 2. Health Check Improvement

```typescript
// health/health.controller.ts
@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    () => this.checkDatabase(),
    () => this.checkRedis(),
    () => this.checkPaxApi(),
  ]);
}

async checkDatabase() {
  try {
    await this.supabase.getAdminClient().from('user_profiles').select('id').limit(1);
    return { database: { status: 'up' } };
  } catch {
    throw new HealthCheckError('Database check failed', { database: { status: 'down' } });
  }
}

async checkRedis() {
  try {
    await this.cacheManager.set('health_check', 'ok', 1000);
    await this.cacheManager.get('health_check');
    return { redis: { status: 'up' } };
  } catch {
    throw new HealthCheckError('Redis check failed', { redis: { status: 'down' } });
  }
}
```

### 3. Request/Response Logging

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const startTime = Date.now();

    this.logger.log({
      type: 'request',
      method,
      url,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logger.log({
          type: 'response',
          method,
          url,
          duration: `${duration}ms`,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.cardInfo;
    return sanitized;
  }
}
```

---

## Roadmap Önerisi

### Sprint 1 (2 hafta) - Kritik Güvenlik ve Stabilite

- [x] ✅ AuthGuard + CurrentUser implementation **TAMAMLANDI**
- [x] ✅ getTransactionStatus() temizliği **TAMAMLANDI** (kaldırıldı)
- [ ] Error stack trace gizleme
- [ ] Unit test framework setup

### Sprint 2 (2 hafta) - Test Coverage

- [ ] Core service unit tests (%50 coverage)
- [ ] Controller unit tests (%30 coverage)
- [ ] E2E test setup ve kritik flow'lar

### Sprint 3 (2 hafta) - Type Safety

- [ ] PAX API type definitions
- [ ] Supabase type definitions
- [ ] any kullanımlarını eliminate et

### Sprint 4 (2 hafta) - Infrastructure

- [ ] Redis cache implementation
- [ ] Prometheus + Grafana setup
- [ ] Docker ve docker-compose

### Sprint 5 (2 hafta) - DevOps

- [ ] CI/CD pipeline setup
- [ ] Automated testing
- [ ] Deployment automation

### Sprint 6 (1 hafta) - Cleanup

- [ ] Code duplication elimination
- [ ] Documentation update
- [ ] Performance optimization

---

## Özet

### Kritik Aksiyonlar (İlk Ay)

1. [ ] Test coverage oluştur
2. [x] ✅ Guard sistemi implement et **TAMAMLANDI**
3. [x] ✅ TODO fonksiyonlarını temizle **TAMAMLANDI** (kaldırıldı)
4. [ ] Type safety iyileştir

### Yüksek Öncelikli (İkinci Ay)

5. ✅ Redis cache'e geç
6. ✅ Monitoring ekle
7. ✅ Stack trace gizle
8. ✅ Database transaction'ları kullan

### Orta Öncelikli (Üçüncü Ay)

9. ✅ Granular rate limiting
10. ✅ CI/CD pipeline
11. ✅ Health check iyileştir

### Düşük Öncelikli (Dördüncü Ay+)

12. ✅ Code duplication temizle
13. ✅ Docker setup
14. ✅ Event-driven pattern (opsiyonel)

---

**Hazırlayan:** AI Code Analyzer  
**Sonraki Gözden Geçirme:** Her sprint sonrası progress review yapılmalı

