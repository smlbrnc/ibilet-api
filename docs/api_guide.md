# iBilet API - Geliştirici Kılavuzu

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** 6 Aralık 2025  
> **Framework:** NestJS 10.3.0  
> **Node:** 20+

## İçindekiler

- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Proje Yapısı](#proje-yapısı)
- [Geliştirme Ortamı](#geliştirme-ortamı)
- [API Modülleri](#api-modülleri)
- [Veri Akışları](#veri-akışları)
- [Ortak Kullanımlar](#ortak-kullanımlar)
- [Hata Yönetimi](#hata-yönetimi)
- [Test ve Debugging](#test-ve-debugging)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

---

## Hızlı Başlangıç

### Kurulum

```bash
# Repoyu klonla
git clone <repo-url>
cd api

# Dependencies yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env.development

# .env.development dosyasını düzenle
# Gerekli API key'leri ve credentials'ları ekle

# Development modda başlat
npm run start:dev
```

### İlk API Çağrısı

```bash
# Health check
curl http://localhost:3000/health

# API root
curl http://localhost:3000
```

### Swagger Dokümantasyonu

Tarayıcıdan şu adrese git:

```
http://localhost:3000/docs
```

---

## Proje Yapısı

### Klasör Organizasyonu

```
api/
├── src/                      # Kaynak kodlar
│   ├── main.ts              # Uygulama giriş noktası
│   ├── app.module.ts        # Root modül
│   ├── config/              # Konfigürasyon
│   ├── common/              # Paylaşılan kodlar
│   │   ├── decorators/      # Custom decorator'lar
│   │   ├── filters/         # Exception filter'lar
│   │   ├── interceptors/    # Request/Response interceptor'lar
│   │   ├── logger/          # Winston logger
│   │   ├── services/        # Paylaşılan servisler (Supabase)
│   │   └── utils/           # Utility fonksiyonlar
│   ├── auth/                # Authentication (Supabase)
│   ├── user/                # Kullanıcı yönetimi
│   ├── pax/                 # Paximum API (Uçak/Otel)
│   ├── payment/             # Garanti VPOS
│   ├── email/               # Resend Email
│   ├── sms/                 # Netgsm SMS
│   ├── pdf/                 # PDF oluşturma
│   ├── cms/                 # CMS (Blog, Kampanya)
│   ├── contact/             # İletişim formu
│   ├── airport/             # Havalimanı arama
│   ├── foursquare/          # Foursquare Places
│   ├── yolcu360/            # Yolcu360 Araç Kiralama
│   └── health/              # Health check
├── docs/                     # Dokümantasyon
├── logs/                     # Winston log dosyaları
├── public/                   # Static dosyalar
├── storage/                  # PDF storage, fontlar
├── dist/                     # Build output
└── node_modules/            # Dependencies
```

### Modül Anatomy

Her modül standart NestJS yapısını takip eder:

```
module-name/
├── dto/                     # Data Transfer Objects
├── enums/                   # Enum tanımları
├── constants/               # Sabitler
├── utils/                   # Modül-specific utility'ler
├── templates/               # Template dosyaları (email, sms, pdf)
├── module.controller.ts     # HTTP endpoint'ler
├── module.service.ts        # İş mantığı
└── module.module.ts         # Modül tanımı
```

---

## Geliştirme Ortamı

### Environment Variables

#### Gerekli Environment Dosyaları

- `.env.development` - Development ortamı
- `.env.production` - Production ortamı
- `.env.example` - Template (commit edilir)

#### Temel Değişkenler

```env
# Uygulama
NODE_ENV=development
API_URL=https://api-dev.ibilet.com
PORT=3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# PAX (Paximum)
PAX_BASE_URL=http://service.stage.paximum.com/v2/api
PAX_AGENCY=PXM25847
PAX_USER=USR1
PAX_PASSWORD=password

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=İbilet <noreply@mail.ibilet.com>

# SMS (Netgsm)
NETGSM_USERNAME=username
NETGSM_PASSWORD=password

# Payment (Garanti VPOS)
PAYMENT_MERCHANT_ID=xxx
PAYMENT_TERMINAL_ID=xxx
PAYMENT_STORE_KEY=xxx
PAYMENT_PROVISION_PASSWORD=xxx

# CORS
CORS_ORIGINS=http://localhost:3001,https://app-dev.ibilet.com

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### npm Scripts

```bash
# Development
npm run start:dev          # Watch mode
npm run start:debug        # Debug mode

# Build
npm run build             # Production build

# Production
npm run start:prod        # Production'da çalıştır

# Code Quality
npm run format            # Prettier ile format
npm run lint              # ESLint ile lint
```

### Debugging

#### VS Code Debug Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeArgs": [
        "--nolazy",
        "-r",
        "ts-node/register"
      ],
      "args": [
        "${workspaceFolder}/src/main.ts"
      ],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

---

## API Modülleri

### 1. Auth Module

**Kullanım:** Supabase Authentication

#### Örnek: Kullanıcı Kaydı

```typescript
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "metadata": {
    "full_name": "John Doe",
    "phone": "+905551234567",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "nationality": "TR",
    "tc_kimlik_no": "12345678900"
  }
}
```

#### Token Yönetimi

```typescript
// Header ile token gönder
Authorization: Bearer <access_token>

// Token yenileme
POST /auth/refresh
{
  "refresh_token": "<refresh_token>"
}
```

#### AuthGuard ve CurrentUser Kullanımı

**Global Guard:**
- Tüm endpoint'ler varsayılan olarak protected
- `app.module.ts`'de global guard olarak tanımlı

**Public Endpoint'ler:**
```typescript
@Public()
@Post('signin')
async signin(@Body() dto: SigninDto) {
  // AuthGuard bypass edilir
}
```

**Protected Endpoint'ler:**
```typescript
@Get('profile')
async getProfile(@CurrentUser() user: any) {
  // user.id direkt kullanılabilir
  // Token validation AuthGuard tarafından yapıldı
  return this.userService.getProfile(user.id);
}
```

**Not:** Artık manuel token parsing yapmaya gerek yok. AuthGuard otomatik olarak:
1. Token'ı header'dan alır
2. Supabase'de validate eder
3. User bilgisini `request.user` olarak inject eder
4. `@CurrentUser()` decorator ile erişilebilir hale getirir

### 2. PAX Module (Uçak/Otel Arama)

**Kullanım:** Paximum API entegrasyonu

#### Flight Price Search

```typescript
POST /price-search
Content-Type: application/json

{
  "productType": 3,          // 3=Flight, 2=Hotel
  "culture": "tr-TR",
  "currency": "TRY",
  "flights": [
    {
      "departureLocations": ["IST"],
      "arrivalLocations": ["SAW"],
      "departureDate": "2025-01-15",
      "adult": 1,
      "child": 0,
      "infant": 0
    }
  ]
}
```

#### Token Yönetimi (Otomatik)

PAX API token'ı otomatik yönetilir:

- `TokenManagerService` token'ı cache'ler
- Expiry kontrolü yapar (5 dk threshold)
- Gerektiğinde otomatik yeniler
- Geliştiricinin yapması gereken bir şey yok

### 3. Booking Module

**Kullanım:** Rezervasyon işlemleri

#### Rezervasyon Akışı

```typescript
// 1. Begin Transaction
POST /booking/begin-transaction
{
  "offerId": "...",
  "currency": "TRY"
}
// Response: { transactionId }

// 2. Set Reservation Info
POST /booking/set-reservation-info
{
  "transactionId": "...",
  "passengers": [...],
  "contactInfo": {...}
}
// Response: { transactionId, expiresOn }
// Not: Otomatik olarak pre_transactionid ve booking tablosuna kaydedilir

// 3. Payment Initiate
POST /payment/initiate
{
  "transactionId": "...",
  "amount": 1000,
  "customerEmail": "user@example.com",
  "customerIp": "127.0.0.1",
  "cardInfo": {...}
}
// Response: { orderId, formData, redirectUrl }

// 4. 3D Secure Callback (Otomatik)
POST /payment/callback
// Banka callback'i - Otomatik commit-transaction çağrılır

// 5. Get Booking Status
GET /user/bookings/:id
```

### 4. Payment Module

**Kullanım:** Garanti VPOS ödeme

#### 3D Secure Ödeme

```typescript
POST /payment/initiate
Content-Type: application/json

{
  "transactionId": "xxx",
  "amount": 1000,
  "currencyCode": "949",     // 949=TRY
  "productType": "flight",
  "customerEmail": "user@example.com",
  "customerIp": "127.0.0.1",
  "cardInfo": {
    "cardNumber": "4111111111111111",
    "cardExpiry": "12/25",
    "cardCvv2": "123",
    "cardHolderName": "JOHN DOE"
  }
}

// Response:
{
  "success": true,
  "data": {
    "orderId": "IB2025120612345",
    "formData": {...},        // Form post için data
    "redirectUrl": "https://sanalposprov.garanti.com.tr/..."
  }
}
```

#### Callback Flow

```
User → Frontend → API /payment/initiate
                    ↓
                  VPOS 3D Secure Page
                    ↓
                  Bank Callback → API /payment/callback
                    ↓
                  PAX commit-transaction
                    ↓
                  Queue: PDF + Email + SMS
                    ↓
                  Frontend redirect with result
```

### 5. Email & SMS Module

**Kullanım:** Bildirim gönderimi

#### Email Gönderme

```typescript
POST /resend/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Hello!</p>",
  "attachments": [
    {
      "content": "base64_content",
      "filename": "booking.pdf",
      "contentType": "application/pdf"
    }
  ]
}
```

#### SMS Gönderme

```typescript
POST /sms/send
Content-Type: application/json

{
  "no": "5551234567",
  "msg": "Rezervasyon numaranız: ABC123",
  "msgheader": "IBGROUP",
  "encoding": "TR"
}
```

#### Queue-based Notifications

Booking onayı sonrası otomatik:

```typescript
// payment.service.ts içinde
await this.notificationQueue.add('send-booking-confirmation', {
  reservationDetails,
  transactionId,
  reservationNumber,
  bookingId
});

// Queue processor paralel çalıştırır:
// 1. PDF oluştur
// 2. Email gönder (PDF ile)
// 3. SMS gönder
```

### 6. PDF Module

**Kullanım:** Rezervasyon PDF'i oluşturma

```typescript
GET /pdf/booking/:bookingId
// veya
GET /pdf/reservation/:reservationNumber

// Response: PDF file (application/pdf)
```

**Özellikler:**
- Otomatik cache (pdf_path booking tablosunda)
- Flight ve Hotel için ayrı template'ler
- PDFKit ile oluşturulur
- `storage/pdfs/` klasörüne kaydedilir

### 7. User Module

**Kullanım:** Kullanıcı profil yönetimi

#### Profil Güncelleme

```typescript
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe Updated",
  "phone": "+905551234567",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "nationality": "TR"
}
```

#### Yolcu Ekleme

```typescript
POST /user/travellers
Authorization: Bearer <token>

{
  "type": "adult",
  "firstName": "Jane",
  "lastName": "Doe",
  "tc_kimlik_no": "12345678900",
  "passport_no": null,
  "date_of_birth": "1995-05-15",
  "gender": "female",
  "nationality": "TR",
  "is_primary": false
}
```

### 8. CMS Module

**Kullanım:** Blog, kampanya, indirim yönetimi

```typescript
// Blog listesi
GET /cms/blogs?category=travel&limit=10

// Kampanyalar
GET /cms/campaigns?type=flight

// İndirim doğrulama
GET /cms/discounts/validate/SUMMER2025

// Trend oteller
GET /cms/trends/hotels?limit=6
```

### 9. Yolcu360 Module (Araç Kiralama)

**Kullanım:** Yolcu360 API entegrasyonu

#### Araç Arama

```typescript
POST /yolcu360/search
{
  "pickupLocationId": "123",
  "dropoffLocationId": "123",
  "pickupDateTime": "2025-01-15T10:00:00",
  "dropoffDateTime": "2025-01-20T10:00:00",
  "driverAge": 30
}

// Response: { searchID, vehicles: [...] }
```

#### Araç Seçimi ve Ödeme

```typescript
// 1. Araç seç ve kaydet
POST /yolcu360/car-selection/:code?searchID=xxx

// 2. Sipariş oluştur
POST /yolcu360/order
{
  "searchID": "xxx",
  "code": "xxx",
  "driver": {...},
  "additionalDrivers": [...]
}

// 3. Ödeme
POST /yolcu360/payment/pay
{
  "transactionId": "xxx"
}
```

---

## Veri Akışları

### 1. Authentication Flow

```
1. Frontend: POST /auth/signup
   → AuthService.signup()
   → Supabase Auth API
   → user_profiles insert
   ← { user, session }

2. Frontend: POST /auth/signin
   → AuthService.signin()
   → Supabase Auth API
   ← { user, session: { access_token, refresh_token } }

3. Frontend: Authenticated Request
   Headers: { Authorization: "Bearer <access_token>" }
   → AuthGuard (Global)
   → Token validation (Supabase)
   → request.user = user (otomatik inject)
   → Controller
   → @CurrentUser() decorator ile user.id alınır
   → Business logic
```

**Yeni Özellikler:**
- ✅ **Global AuthGuard**: Tüm endpoint'ler varsayılan olarak protected
- ✅ **@Public() Decorator**: Public endpoint'leri işaretlemek için
- ✅ **@CurrentUser() Decorator**: User bilgisini direkt almak için

### 2. Booking Flow (Complete)

```
┌─────────────┐
│  1. Search  │
│  /price-    │
│   search    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Select   │
│  /get-      │
│   offers    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. Begin    │
│  Transaction│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. Set      │
│  Reservation│
│   Info      │
└──────┬──────┘
       │ Otomatik: pre_transactionid + booking insert
       ▼
┌─────────────┐
│ 5. Payment  │
│   Initiate  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 6. 3D       │
│  Secure     │
│   VPOS      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 7. Callback │
│  /payment/  │
│   callback  │
└──────┬──────┘
       │
       ├─► commit-transaction (PAX)
       │
       ├─► reservation-detail (PAX)
       │
       ├─► Queue: PDF + Email + SMS
       │
       └─► Booking status update (DB)
```

### 3. Notification Flow

```
Payment Success
   │
   ▼
Queue Job Added
   │
   ├─► PDF Generation (PDFService)
   │   ├─► Build PDF
   │   ├─► Save to storage/
   │   └─► Update booking.pdf_path
   │
   ├─► Email Send (EmailService - Paralel)
   │   ├─► Build HTML template
   │   ├─► Attach PDF
   │   ├─► Resend API
   │   └─► Log to booking_email
   │
   └─► SMS Send (NetgsmService - Paralel)
       ├─► Build SMS message
       ├─► Netgsm API
       └─► Log to booking_sms
```

---

## Ortak Kullanımlar

### DTO Oluşturma

```typescript
// dto/create-user.dto.ts
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minimum: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  full_name?: string;
}
```

### Service Pattern

```typescript
// module.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class ModuleService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ModuleService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  async getData() {
    try {
      this.logger.log('Getting data...');
      // Business logic
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Error getting data', error: error.message });
      this.throwError('GET_DATA_ERROR', 'Data could not be fetched', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

### Supabase Kullanımı

```typescript
// Servis içinde
constructor(private readonly supabase: SupabaseService) {}

// Admin client (Service role - tam yetki)
const adminClient = this.supabase.getAdminClient();
const { data, error } = await adminClient
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single();

// Anon client (Row Level Security aktif)
const anonClient = this.supabase.getAnonClient();
const { data, error } = await anonClient.auth.getUser(token);
```

### AuthGuard ve CurrentUser Kullanımı

**Controller'da:**
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('user')
@UseGuards(AuthGuard) // Controller seviyesinde (opsiyonel, global zaten var)
export class UserController {
  // Protected endpoint
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    // user.id, user.email, vb. direkt kullanılabilir
    return this.userService.getProfile(user.id);
  }

  // Public endpoint
  @Public()
  @Get('check')
  async checkEmail(@Query('email') email: string) {
    // AuthGuard bypass edilir
    return this.userService.checkEmail(email);
  }
}
```

**Service'de:**
```typescript
// Artık token parametresi yerine userId kullan
async getProfile(userId: string) {
  // Direkt userId ile işlem yap
  const { data } = await this.supabase.getAdminClient()
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}
```

### Logger Kullanımı

```typescript
// Constructor'da context set et
constructor(private readonly logger: LoggerService) {
  this.logger.setContext('ServiceName');
}

// Log levels
this.logger.log('Info message');
this.logger.log({ message: 'Structured log', userId, action: 'create' });

this.logger.error('Error message');
this.logger.error({ message: 'Error occurred', error: error.message, userId });

this.logger.warn('Warning message');
this.logger.warn({ message: 'Deprecated method used', method: 'oldMethod' });

this.logger.debug('Debug message');
this.logger.debug({ message: 'Request details', body, params });
```

### Cache Kullanımı

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

// Cache'e yaz
await this.cacheManager.set('key', value, TTL_IN_MS);

// Cache'den oku
const cached = await this.cacheManager.get('key');
if (cached) return cached;

// Cache'i sil
await this.cacheManager.del('key');
```

---

## Hata Yönetimi

### Global Exception Filter

Tüm hatalar standart formata dönüştürülür:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "requestId": "uuid",
  "timestamp": "2025-12-06T..."
}
```

### Custom Error Throwing

```typescript
// Service içinde
throw new HttpException(
  { 
    success: false, 
    code: 'CUSTOM_ERROR', 
    message: 'Custom error message' 
  },
  HttpStatus.BAD_REQUEST
);
```

### Error Codes (Örnekler)

- `UNAUTHORIZED` - Token geçersiz veya yok
- `BOOKING_NOT_FOUND` - Rezervasyon bulunamadı
- `PAYMENT_INITIATE_ERROR` - Ödeme başlatılamadı
- `EMAIL_SEND_ERROR` - Email gönderilemedi
- `PAX_API_ERROR` - PAX API hatası
- `VALIDATION_ERROR` - DTO validation hatası

---

## Test ve Debugging

### Log Dosyaları

```bash
# Tüm logları görüntüle
tail -f logs/combined-*.log

# Sadece hataları görüntüle
tail -f logs/error-*.log

# Debug logları
tail -f logs/debug-*.log
```

### Swagger ile Test

1. `http://localhost:3000/docs` adresine git
2. Endpoint'i seç
3. "Try it out" butonuna tıkla
4. Request body'yi doldur
5. "Execute" ile çalıştır
6. Response'u incele

### cURL Örnekler

```bash
# Health check
curl http://localhost:3000/health

# Auth signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Authenticated request
curl http://localhost:3000/user/profile \
  -H "Authorization: Bearer <token>"

# PAX price search
curl -X POST http://localhost:3000/price-search \
  -H "Content-Type: application/json" \
  -d @search-request.json
```

---

## Deployment

### Production Build

```bash
# Build
npm run build

# Build çıktısı dist/ klasöründe

# Production'da çalıştır
NODE_ENV=production node dist/main
```

### Environment Hazırlığı

1. `.env.production` dosyasını oluştur
2. Production credentials'ları ekle
3. `NODE_ENV=production` set et
4. API_URL'i production URL'e ayarla

### Health Check

Production'da health check'leri kullan:

```bash
# Genel health
curl https://api.ibilet.com/health

# PAX API connectivity
curl https://api.ibilet.com/health/pax
```

### Log Monitoring

Production'da log dosyalarını monitor et:

- `combined-*.log`: Tüm loglar (14 gün tutulur)
- `error-*.log`: Sadece hatalar (30 gün tutulur)
- `debug-*.log`: Debug logları (7 gün tutulur)

Loglar otomatik gzip ile sıkıştırılır ve rotate edilir.

---

## Best Practices

### 1. Kod Organizasyonu

- Her modül için ayrı klasör
- DTO'ları ayrı dosyalarda tut
- Sabit değerleri `constants/` klasöründe tanımla
- Enum'ları `enums/` klasöründe topla
- Utility fonksiyonları `utils/` altında grupla

### 2. Error Handling

- Hata mesajlarını kullanıcı dostu yap
- Error code'ları standart kullan
- Hataları mutlaka logla
- Stack trace'i sadece development'ta göster
- Sensitive bilgileri loglama (password, token)

### 3. Security

- Token'ları environment variable'da tut
- Hassas bilgileri loglarda maskele
- Rate limiting kullan (varsayılan: 100 req/60s)
- Input validation yap (class-validator)
- CORS origin'leri sınırla

### 4. Performance

- Cache kullan (departure, arrival, checkin-dates)
- Token'ları cache'le (TokenManagerService)
- Paralel işlemler için Promise.all kullan
- Database query'lerini optimize et
- Büyük dosyalar için stream kullan

### 5. Logging

- Context set et (servis adı)
- Structured logging kullan (JSON object)
- Log level'ları doğru kullan:
  - `log`: Normal işlemler
  - `error`: Hatalar
  - `warn`: Uyarılar
  - `debug`: Detaylı debug bilgisi

### 6. Testing

- Unit test'ler yaz
- Integration test'ler yaz
- Swagger'da "Try it out" ile manuel test yap
- Production'a geçmeden staging'de test et

### 7. Documentation

- Swagger decorator'larını eksiksiz kullan
- README'yi güncel tut
- API değişikliklerini dokümante et
- Örnek request/response body'leri ekle

---

## Yardımcı Komutlar

```bash
# Log temizleme
rm -rf logs/*.log logs/*.gz

# Build temizleme
rm -rf dist/

# Node modules temizleme ve yeniden kurulum
rm -rf node_modules/
npm install

# TypeScript type check
npx tsc --noEmit

# Prettier format check
npm run format

# ESLint check
npm run lint
```

---

## Kaynaklar

- [NestJS Dokümantasyonu](https://docs.nestjs.com/)
- [Swagger/OpenAPI Spec](https://swagger.io/specification/)
- [Supabase Docs](https://supabase.com/docs)
- [Winston Logger](https://github.com/winstonjs/winston)
- [class-validator](https://github.com/typestack/class-validator)

---

**Sorularınız için:** İç geliştirme ekibi ile iletişime geçin.

