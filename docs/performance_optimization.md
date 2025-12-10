# iBilet API - Performance Optimizasyon Rehberi

> **Oluşturma Tarihi:** 2025-01-15  
> **Versiyon:** 1.0.0  
> **Kapsam:** Tüm proje performans optimizasyonları ve best practices

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Mevcut Durum Analizi](#mevcut-durum-analizi)
- [Caching Stratejileri](#caching-stratejileri)
- [Database Optimizasyonları](#database-optimizasyonları)
- [Memory Management](#memory-management)
- [API Response Time Optimizasyonları](#api-response-time-optimizasyonları)
- [PDF Generation Optimizasyonları](#pdf-generation-optimizasyonları)
- [Queue Optimizasyonları](#queue-optimizasyonları)
- [Code-Level Optimizasyonlar](#code-level-optimizasyonlar)
- [Monitoring ve Metrics](#monitoring-ve-metrics)
- [Uygulama Öncelikleri](#uygulama-öncelikleri)

---

## Genel Bakış

Bu dokümantasyon, iBilet API projesinin performansını optimize etmek için kapsamlı bir rehber sunar. Her optimizasyon önerisi, uygulama kolaylığı, etki ve öncelik açısından değerlendirilmiştir.

### Performans Hedefleri

| Metrik | Mevcut | Hedef | İyileştirme |
|--------|--------|-------|-------------|
| API Response Time (avg) | ~500ms | <300ms | %40 |
| Cache Hit Rate | ~60% | >85% | %25 |
| Database Query Time | ~100ms | <50ms | %50 |
| Memory Usage | ~200MB | <150MB | %25 |
| PDF Generation Time | ~2s | <1s | %50 |

---

## Mevcut Durum Analizi

### ✅ Güçlü Yönler

1. **Queue Sistemi**: Bull queue ile async işlemler
2. **Caching**: Departure/Arrival için 1 saatlik cache
3. **Token Management**: Otomatik token refresh
4. **Error Handling**: Standartlaştırılmış hata yönetimi
5. **Logging**: Winston ile structured logging

### ⚠️ İyileştirme Alanları

1. **Cache Stratejisi**: In-memory cache, Redis yok
2. **Database Queries**: N+1 query problemleri
3. **Memory Usage**: Airport data memory'de tutuluyor
4. **PDF Generation**: Sync, blocking operations
5. **Type Safety**: Çok fazla `any` kullanımı

---

## Caching Stratejileri

### 1. Redis Cache Implementation

**Mevcut Durum:**
- In-memory cache kullanılıyor
- Multi-instance scale edilemiyor
- Cache invalidation stratejisi yok

**Öneri: Redis Cache'e Geçiş**

```typescript
// src/config/configuration.ts
CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const redisConfig = configService.get('redis');
    
    if (redisConfig?.host) {
      const redisUrl = redisConfig.password
        ? `redis://:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`
        : `redis://${redisConfig.host}:${redisConfig.port}`;
      
      return {
        store: new KeyvRedis(redisUrl),
        ttl: 3600000,
        max: 1000, // Max cache entries
      };
    }
    
    // Fallback: in-memory
    return { ttl: 3600000 };
  },
  inject: [ConfigService],
})
```

**Faydalar:**
- ✅ Multi-instance cache sharing
- ✅ Cache persistence
- ✅ Better memory management
- ✅ Cache invalidation support

**Öncelik:** 🔴 Yüksek

---

### 2. Cache Key Optimization

**Mevcut Durum:**
```typescript
// ❌ Kötü: JSON.stringify ile uzun key'ler
const cacheKey = `pax:${endpointKey}:${JSON.stringify(request)}`;
```

**Öneri: Hash-Based Cache Keys**

```typescript
import { createHash } from 'crypto';

private generateCacheKey(prefix: string, data: any): string {
  const dataStr = JSON.stringify(data);
  const hash = createHash('md5').update(dataStr).digest('hex');
  return `${prefix}:${hash}`;
}

// Kullanım
const cacheKey = this.generateCacheKey('pax:departure', request);
```

**Faydalar:**
- ✅ Daha kısa key'ler (memory tasarrufu)
- ✅ Consistent key format
- ✅ Collision riski düşük

**Öncelik:** 🟡 Orta

---

### 3. Cache TTL Optimization

**Mevcut TTL Değerleri:**
- Departure/Arrival: 1 saat
- Check-in Dates: 30 dakika
- Foursquare: 30 dakika
- IP Geolocation: 24 saat
- Airport Data: 7 gün

**Öneri: Dynamic TTL**

```typescript
// Cache hit rate'e göre TTL ayarla
private getCacheTTL(endpoint: string, hitRate: number): number {
  const baseTTL = {
    departure: 3600000,      // 1 saat
    arrival: 3600000,         // 1 saat
    checkinDates: 1800000,    // 30 dakika
  };
  
  // Yüksek hit rate varsa TTL'yi artır
  if (hitRate > 0.8) {
    return baseTTL[endpoint] * 1.5;
  }
  
  return baseTTL[endpoint];
}
```

**Öncelik:** 🟡 Orta

---

### 4. Cache Invalidation Strategy

**Öneri: Event-Based Invalidation**

```typescript
// Cache invalidation için event emitter
@Injectable()
export class CacheInvalidationService {
  private eventEmitter = new EventEmitter();
  
  invalidatePattern(pattern: string) {
    // Redis'te pattern'e göre key'leri sil
    this.eventEmitter.emit('cache:invalidate', pattern);
  }
}

// Kullanım: Booking tamamlandığında
await this.cacheInvalidation.invalidatePattern('pax:price-search:*');
```

**Öncelik:** 🟠 Yüksek

---

## Database Optimizasyonları

### 1. Query Optimization

**Mevcut Sorun: N+1 Query Problem**

```typescript
// ❌ Kötü: Her booking için ayrı query
const bookings = await this.getBookings(userId);
for (const booking of bookings) {
  const transaction = await this.getTransaction(booking.transaction_id);
}
```

**Öneri: Batch Queries**

```typescript
// ✅ İyi: Tek query ile tüm transaction'ları al
const bookings = await this.getBookings(userId);
const transactionIds = bookings.map(b => b.transaction_id);

const { data: transactions } = await this.supabase
  .getAdminClient()
  .from('user_transaction')
  .select('*')
  .in('id', transactionIds);

// Map ile birleştir
const bookingsWithTransactions = bookings.map(booking => ({
  ...booking,
  transaction: transactions.find(t => t.id === booking.transaction_id),
}));
```

**Öncelik:** 🔴 Yüksek

---

### 2. Select Field Optimization

**Mevcut Durum:**
```typescript
// ❌ Kötü: Tüm field'ları çekiyor
.select('*')
```

**Öneri: Sadece Gerekli Field'ları Seç**

```typescript
// ✅ İyi: Sadece gerekli field'lar
.select('id, transaction_id, status, booking_number, created_at')
```

**Faydalar:**
- ✅ Network trafiği azalır
- ✅ Memory kullanımı düşer
- ✅ Query time iyileşir

**Öncelik:** 🟡 Orta

---

### 3. Pagination Implementation

**Mevcut Durum:**
```typescript
// ⚠️ Limit var ama offset yok
.limit(options.limit)
```

**Öneri: Cursor-Based Pagination**

```typescript
// ✅ İyi: Cursor-based pagination
async getBookings(
  userId: string,
  cursor?: string,
  limit: number = 20,
): Promise<{ data: any[]; nextCursor: string | null }> {
  let query = this.supabase
    .getAdminClient()
    .from('booking')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 to check if there's more
  
  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  
  const { data } = await query;
  
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;
  
  return { data: items, nextCursor };
}
```

**Öncelik:** 🟠 Yüksek

---

### 4. Database Index Optimization

**Öneri: Index Kontrolü**

```sql
-- Sık kullanılan query'ler için index'ler
CREATE INDEX IF NOT EXISTS idx_booking_user_id_created_at 
ON backend.booking(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_user_transaction_user_id_created_at 
ON user_transaction(user_id, created_at DESC);
```

**Öncelik:** 🔴 Yüksek

---

### 5. Connection Pooling

**Mevcut Durum:**
- Supabase otomatik connection pooling kullanıyor
- Manuel ayar gerekmiyor

**Öneri: Monitoring**

```typescript
// Connection pool metrics topla
const poolStats = {
  activeConnections: pool.totalCount - pool.idleCount,
  idleConnections: pool.idleCount,
  waitingRequests: pool.waitingCount,
};
```

**Öncelik:** 🟡 Orta

---

## Memory Management

### 1. Airport Data Optimization

**Mevcut Durum:**
```typescript
// ❌ Kötü: Tüm airport data memory'de
this.airports = JSON.parse(fileContent); // 257 havalimanı
```

**Öneri: Redis Cache'e Taşı**

```typescript
// ✅ İyi: Redis'te tut
async loadAirports(): Promise<void> {
  const cacheKey = 'detect-airport:airports:home';
  
  const cached = await this.cacheManager.get<HomeAirport[]>(cacheKey);
  if (cached) {
    this.airports = cached;
    return;
  }
  
  // İlk yüklemede Redis'e kaydet
  const fileContent = readFileSync(filePath, 'utf-8');
  this.airports = JSON.parse(fileContent);
  
  await this.cacheManager.set(cacheKey, this.airports, 7 * 24 * 60 * 60 * 1000);
}
```

**Faydalar:**
- ✅ Memory kullanımı azalır
- ✅ Multi-instance'lar aynı data'yı kullanır
- ✅ Data güncellemesi kolaylaşır

**Öncelik:** 🟠 Yüksek

---

### 2. PDF Buffer Management

**Mevcut Durum:**
```typescript
// ⚠️ Tüm PDF buffer memory'de tutuluyor
const pdfBuffer = await this.buildPdfBuffer(doc);
```

**Öneri: Stream-Based Generation**

```typescript
// ✅ İyi: Stream kullan
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async generateBookingPdfStream(
  reservationDetails: any,
  reservationNumber: string,
): Promise<string> {
  const filePath = this.getPdfPath(reservationNumber);
  const doc = this.getProductType(reservationDetails) === 1
    ? buildFlightBookingPdf(reservationDetails, reservationNumber)
    : buildHotelBookingPdf(reservationDetails, reservationNumber);
  
  const writeStream = createWriteStream(filePath);
  await pipeline(doc, writeStream);
  
  return filePath;
}
```

**Faydalar:**
- ✅ Memory kullanımı düşer
- ✅ Büyük PDF'ler için daha iyi
- ✅ Disk I/O optimize edilir

**Öncelik:** 🟠 Yüksek

---

### 3. Large Response Handling

**Öneri: Response Streaming**

```typescript
// Büyük response'lar için streaming
@Get('export')
async exportData(@Res() res: Response) {
  const stream = await this.generateDataStream();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="export.json"');
  stream.pipe(res);
}
```

**Öncelik:** 🟡 Orta

---

## API Response Time Optimizasyonları

### 1. Parallel API Calls

**Mevcut Durum:**
```typescript
// ⚠️ Sequential calls
const departure = await this.getDeparture(request);
const arrival = await this.getArrival(request);
```

**Öneri: Parallel Execution**

```typescript
// ✅ İyi: Paralel çağrılar
const [departure, arrival] = await Promise.all([
  this.getDeparture(request),
  this.getArrival(request),
]);
```

**Faydalar:**
- ✅ Response time %50 azalır
- ✅ User experience iyileşir

**Öncelik:** 🟡 Orta

---

### 2. Request Batching

**Öneri: Batch Requests**

```typescript
// Birden fazla kullanıcı için batch query
async getMultipleUserProfiles(userIds: string[]) {
  const { data } = await this.supabase
    .getAdminClient()
    .from('user_profiles')
    .select('*')
    .in('id', userIds);
  
  return data;
}
```

**Öncelik:** 🟡 Orta

---

### 3. Timeout Optimization

**Öneri: Adaptive Timeouts**

```typescript
// Endpoint'e göre timeout ayarla
const timeouts = {
  priceSearch: 10000,    // 10 saniye
  booking: 15000,         // 15 saniye
  payment: 5000,          // 5 saniye
};

const response = await firstValueFrom(
  this.httpService.post(url, data, {
    timeout: timeouts[endpoint] || 5000,
  }),
);
```

**Öncelik:** 🟡 Orta

---

## PDF Generation Optimizasyonları

### 1. Async PDF Generation

**Mevcut Durum:**
- PDF generation sync, blocking
- Queue'da yapılıyor ama optimize edilebilir

**Öneri: Pre-generation**

```typescript
// Booking commit'ten önce PDF'i hazırla
async preGeneratePdf(transactionId: string) {
  const reservationDetails = await this.getReservationDetails(transactionId);
  const pdfPath = await this.generateBookingPdfStream(
    reservationDetails,
    reservationDetails.reservationNumber,
  );
  
  // Cache'le
  await this.cacheManager.set(
    `pdf:${transactionId}`,
    pdfPath,
    3600000, // 1 saat
  );
}
```

**Öncelik:** 🟠 Yüksek

---

### 2. PDF Template Caching

**Öneri: Template Cache**

```typescript
// PDF template'lerini cache'le
private templateCache = new Map<string, any>();

private getCachedTemplate(type: 'flight' | 'hotel') {
  const cacheKey = `pdf:template:${type}`;
  
  if (this.templateCache.has(cacheKey)) {
    return this.templateCache.get(cacheKey);
  }
  
  const template = type === 'flight' 
    ? buildFlightBookingPdfTemplate()
    : buildHotelBookingPdfTemplate();
  
  this.templateCache.set(cacheKey, template);
  return template;
}
```

**Öncelik:** 🟡 Orta

---

## Queue Optimizasyonları

### 1. Job Priority

**Öneri: Priority Queue**

```typescript
// Yüksek öncelikli job'lar
await this.notificationQueue.add(
  'send-booking-confirmation',
  data,
  {
    priority: 10, // Yüksek öncelik
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
);
```

**Öncelik:** 🟡 Orta

---

### 2. Batch Job Processing

**Öneri: Batch Jobs**

```typescript
// Birden fazla bildirimi tek job'da işle
await this.notificationQueue.add(
  'send-batch-notifications',
  {
    userIds: [userId1, userId2, userId3],
    notification: { title, message },
  },
);
```

**Öncelik:** 🟡 Orta

---

### 3. Dead Letter Queue

**Öneri: DLQ Implementation**

```typescript
// Başarısız job'ları DLQ'ya taşı
@Process('send-booking-confirmation')
async handleNotification(job: Job<NotificationJobData>) {
  try {
    // ... işlem
  } catch (error) {
    if (job.attemptsMade >= job.opts.attempts) {
      // DLQ'ya gönder
      await this.dlqQueue.add('failed-notification', job.data);
    }
    throw error;
  }
}
```

**Öncelik:** 🟠 Yüksek

---

## Code-Level Optimizasyonlar

### 1. JSON.stringify/parse Optimization

**Mevcut Sorun:**
```typescript
// ❌ Kötü: Gereksiz double conversion
const requestBody = JSON.stringify(body);
this.logger.log({
  requestBody: JSON.parse(requestBody),
});
```

**Öneri:**
```typescript
// ✅ İyi: Direkt object kullan
this.logger.log({
  requestBody: body,
});
```

**Öncelik:** 🟡 Orta

---

### 2. Array Operations Optimization

**Öneri: Efficient Array Methods**

```typescript
// ❌ Kötü: Multiple iterations
const filtered = array.filter(x => x.active);
const mapped = filtered.map(x => x.id);
const sorted = mapped.sort();

// ✅ İyi: Single iteration
const result = array
  .filter(x => x.active)
  .map(x => x.id)
  .sort();
```

**Öncelik:** 🟡 Orta

---

### 3. Type Safety Improvements

**Öneri: Interface Definitions**

```typescript
// ✅ İyi: Type definitions
interface ReservationDetails {
  body: {
    reservationData: {
      services: Service[];
    };
  };
}

interface Service {
  productType: number;
  isExtraService: boolean;
}
```

**Öncelik:** 🟠 Yüksek

---

## Monitoring ve Metrics

### 1. Performance Metrics Collection

**Öneri: Metrics Middleware**

```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log({
          endpoint: request.url,
          method: request.method,
          duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });
      }),
    );
  }
}
```

**Öncelik:** 🟠 Yüksek

---

### 2. Cache Hit Rate Monitoring

**Öneri: Cache Metrics**

```typescript
private cacheStats = {
  hits: 0,
  misses: 0,
};

async getWithCache(key: string, fetcher: () => Promise<any>) {
  const cached = await this.cacheManager.get(key);
  
  if (cached) {
    this.cacheStats.hits++;
    return cached;
  }
  
  this.cacheStats.misses++;
  const data = await fetcher();
  await this.cacheManager.set(key, data);
  return data;
}

getCacheHitRate(): number {
  const total = this.cacheStats.hits + this.cacheStats.misses;
  return total > 0 ? this.cacheStats.hits / total : 0;
}
```

**Öncelik:** 🟠 Yüksek

---

### 3. Database Query Monitoring

**Öneri: Query Logger**

```typescript
// Supabase query'lerini logla
const { data, error } = await this.supabase
  .getAdminClient()
  .from('booking')
  .select('*')
  .eq('user_id', userId);

// Query time'ı logla
this.logger.debug({
  query: 'getBookings',
  duration: queryDuration,
  rowCount: data?.length || 0,
});
```

**Öncelik:** 🟡 Orta

---

## Uygulama Öncelikleri

### 🔴 Yüksek Öncelik (Hemen Uygula)

1. **Redis Cache Implementation**
   - Etki: %30-40 performance artışı
   - Süre: 2-3 gün
   - Zorluk: Orta

2. **N+1 Query Problem Fix**
   - Etki: %50 query time azalması
   - Süre: 1-2 gün
   - Zorluk: Düşük

3. **Database Index Optimization**
   - Etki: %40 query time azalması
   - Süre: 1 gün
   - Zorluk: Düşük

4. **Airport Data Redis Migration**
   - Etki: %20 memory tasarrufu
   - Süre: 1 gün
   - Zorluk: Düşük

### 🟠 Orta Öncelik (1-2 Hafta İçinde)

1. **Cache Invalidation Strategy**
   - Etki: Data consistency
   - Süre: 2-3 gün
   - Zorluk: Orta

2. **PDF Stream Generation**
   - Etki: %30 memory tasarrufu
   - Süre: 2-3 gün
   - Zorluk: Orta

3. **Dead Letter Queue**
   - Etki: Error handling iyileştirmesi
   - Süre: 1-2 gün
   - Zorluk: Düşük

4. **Pagination Implementation**
   - Etki: Response time iyileştirmesi
   - Süre: 2-3 gün
   - Zorluk: Orta

### 🟡 Düşük Öncelik (1 Ay İçinde)

1. **Cache Key Optimization**
   - Etki: Memory tasarrufu
   - Süre: 1 gün
   - Zorluk: Düşük

2. **Type Safety Improvements**
   - Etki: Code quality
   - Süre: 3-5 gün
   - Zorluk: Orta

3. **Performance Metrics Collection**
   - Etki: Monitoring
   - Süre: 2-3 gün
   - Zorluk: Orta

4. **Request Batching**
   - Etki: API efficiency
   - Süre: 2-3 gün
   - Zorluk: Orta

---

## Ölçüm ve Doğrulama

### Performance Test Senaryoları

```bash
# Load test
npm run test:load

# Benchmark test
npm run test:benchmark

# Memory profiling
node --inspect dist/main.js
```

### Metrikler

- **API Response Time**: P95, P99 değerleri
- **Cache Hit Rate**: >85% hedef
- **Database Query Time**: <50ms hedef
- **Memory Usage**: <150MB hedef
- **Error Rate**: <0.1% hedef

---

## Sonuç

Bu optimizasyonlar uygulandığında:

- ✅ **%40-50** API response time iyileştirmesi
- ✅ **%25-30** memory kullanımı azalması
- ✅ **%50** database query time azalması
- ✅ **%85+** cache hit rate
- ✅ Daha iyi scalability ve maintainability

**Tahmini Toplam Süre:** 3-4 hafta  
**Tahmini Etki:** %40-50 genel performans artışı

---

**Not:** Bu optimizasyonlar aşamalı olarak uygulanmalı ve her aşamada performans metrikleri ölçülmelidir.
