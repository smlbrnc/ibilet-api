# iBilet API - Detaylı Analiz Dokümantasyonu

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Mimari Yapı](#mimari-yapı)
3. [Modül Analizi](#modül-analizi)
4. [Endpoint Detayları](#endpoint-detayları)
5. [Servis Katmanı](#servis-katmanı)
6. [Güvenlik ve Middleware](#güvenlik-ve-middleware)
7. [Veri Akışı](#veri-akışı)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Cache Stratejisi](#cache-stratejisi)
10. [Logging Sistemi](#logging-sistemi)

---

## Genel Bakış

iBilet Internal Core API, NestJS framework'ü kullanılarak geliştirilmiş bir backend servisidir. Ana işlevleri:

- **Paximum API Entegrasyonu**: Uçak ve otel rezervasyon operasyonları
- **Ödeme İşlemleri**: Garanti VPOS entegrasyonu ile 3D Secure ödeme
- **Kimlik Doğrulama**: Supabase Auth tabanlı authentication
- **Kullanıcı Yönetimi**: Profil, favoriler, yolcular, bildirimler
- **CMS**: Blog, kampanya, indirim kodları, trend içerikler
- **Bildirim Servisleri**: SMS (Netgsm) ve Email (Resend) entegrasyonları
- **PDF Oluşturma**: Rezervasyon PDF'leri
- **Yardımcı Servisler**: Havalimanı arama, Foursquare Places API entegrasyonu

### Teknoloji Stack

- **Framework**: NestJS 10.3.0
- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20+
- **Database**: Supabase (PostgreSQL)
- **Cache**: In-memory cache-manager
- **HTTP Client**: Native Fetch API (Pax), Axios (Payment, Foursquare)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **PDF Generation**: PDFKit

---

## Mimari Yapı

### Proje Hiyerarşisi

```
src/
├── app.module.ts              # Root module - Tüm modüllerin import edildiği yer
├── main.ts                    # Application bootstrap - Middleware, guards, interceptors
├── config/                    # Konfigürasyon yönetimi
│   └── configuration.ts       # Environment-based config loader
├── common/                    # Paylaşılan utilities
│   ├── decorators/            # Custom decorators (CurrentUser)
│   ├── enums/                 # Global error codes
│   ├── filters/               # Global exception filter
│   ├── interceptors/          # Request ID, Response, Debug interceptors
│   ├── logger/                # Winston logger service
│   ├── services/              # Supabase service
│   └── utils/                 # Error handler utilities
├── auth/                      # Supabase Authentication modülü
│   ├── constants/             # Auth hata mesajları ve sabitler
│   ├── dto/                   # Auth DTO'ları
│   ├── enums/                 # Auth enum'ları
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── user/                      # Kullanıcı yönetimi modülü
│   ├── constants/             # User hata mesajları
│   ├── dto/                   # User DTO'ları
│   ├── enums/                 # User enum'ları
│   ├── user.controller.ts
│   ├── user.module.ts
│   └── user.service.ts
├── cms/                       # CMS modülü (Blog, Kampanya, İndirim, Trend)
│   ├── constants/             # CMS hata mesajları
│   ├── enums/                 # CMS enum'ları
│   ├── cms.controller.ts
│   ├── cms.module.ts
│   └── cms.service.ts
├── contact/                   # İletişim formu modülü
│   ├── dto/
│   ├── contact.controller.ts
│   ├── contact.module.ts
│   └── contact.service.ts
├── pax/                       # Paximum API entegrasyonu
│   ├── booking/               # Booking işlemleri
│   │   ├── dto/
│   │   ├── booking.controller.ts
│   │   ├── booking.module.ts
│   │   └── booking.service.ts
│   ├── dto/
│   ├── enums/
│   ├── pax.controller.ts
│   ├── pax.module.ts
│   ├── pax.service.ts
│   ├── pax-http.service.ts
│   ├── token.service.ts
│   └── token-manager.service.ts
├── payment/                   # Garanti VPOS ödeme entegrasyonu
│   ├── config/
│   ├── constants/
│   ├── dto/
│   ├── enums/
│   ├── utils/
│   ├── payment.controller.ts
│   ├── payment.module.ts
│   └── payment.service.ts
├── pdf/                       # PDF oluşturma modülü
│   ├── templates/
│   ├── pdf.controller.ts
│   ├── pdf.module.ts
│   └── pdf.service.ts
├── sms/                       # Netgsm SMS entegrasyonu
│   ├── constants/
│   ├── dto/
│   ├── templates/
│   ├── netgsm.service.ts
│   ├── sms.controller.ts
│   └── sms.module.ts
├── email/                     # Resend Email entegrasyonu
│   ├── constants/
│   ├── dto/
│   ├── templates/
│   ├── email.controller.ts
│   ├── email.module.ts
│   └── email.service.ts
├── airport/                   # Havalimanı arama servisi
│   ├── dto/
│   ├── airport.controller.ts
│   ├── airport.module.ts
│   └── airport.service.ts
├── foursquare/                # Foursquare Places API
│   ├── constants/
│   ├── dto/
│   ├── foursquare.controller.ts
│   ├── foursquare.module.ts
│   └── foursquare.service.ts
└── health/                    # Health check endpoints
    ├── health.controller.ts
    └── health.module.ts
```

### Global Middleware Pipeline

```
Request → Helmet (Security Headers)
       → CORS
       → RequestIdInterceptor (UUID ekleme)
       → ValidationPipe (DTO validation)
       → Controller
       → Service
       → ResponseInterceptor (Standart format)
       → HttpExceptionFilter (Error handling)
       → Response
```

---

## Modül Analizi

### 1. App Module (Root)

**Dosya**: `src/app.module.ts`

**Sorumluluklar**:
- Tüm modüllerin import edilmesi
- Global konfigürasyon (ConfigModule, CacheModule, ThrottlerModule)
- Global guard'ların tanımlanması

**İçe Aktarılan Modüller**:
- `AuthModule` - Supabase authentication
- `UserModule` - Kullanıcı yönetimi
- `CmsModule` - CMS içerikleri
- `ContactModule` - İletişim formu
- `PaxModule` - Paximum API entegrasyonu
- `PaymentModule` - Ödeme işlemleri
- `PdfModule` - PDF oluşturma
- `SmsModule` - SMS bildirimleri
- `EmailModule` - Email bildirimleri
- `HealthModule` - Health check
- `FoursquareModule` - Places API
- `AirportModule` - Havalimanı arama
- `SupabaseModule` - Supabase client

**Global Guards**:
- `ThrottlerGuard` - Rate limiting (100 req/60s)

**Global Interceptors**:
- `RequestIdInterceptor` - Her request'e UUID ekler
- `ResponseInterceptor` - Response'ları standart formata çevirir
- `DebugInterceptor` - Development'ta PAX raw response gösterir

**Global Filters**:
- `HttpExceptionFilter` - Tüm hataları standart formata dönüştürür

### 2. Auth Module

**Dosya**: `src/auth/auth.module.ts`

**Yapı**:
```
auth/
├── constants/
│   └── auth.constant.ts       # AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES
├── dto/
│   ├── index.ts
│   ├── magic-link.dto.ts
│   ├── refresh-token.dto.ts
│   ├── reset-password.dto.ts  # ResetPasswordDto, UpdatePasswordDto
│   ├── signin.dto.ts
│   └── signup.dto.ts
├── enums/
│   └── auth.enum.ts           # AuthProvider, EmailVerificationType, AuthErrorCode
├── auth.controller.ts
├── auth.module.ts
└── auth.service.ts
```

**Controller**: `AuthController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/auth/signup` | Email/password ile kayıt | ❌ |
| POST | `/auth/signin` | Email/password ile giriş | ❌ |
| POST | `/auth/signout` | Çıkış yap | ✅ |
| POST | `/auth/refresh` | Token yenile | ❌ |
| POST | `/auth/magic-link` | Magic link gönder | ❌ |
| POST | `/auth/reset-password` | Şifre sıfırlama emaili gönder | ❌ |
| POST | `/auth/update-password` | Şifreyi güncelle | ✅ |
| GET | `/auth/user` | Kullanıcı bilgileri | ✅ |
| GET | `/auth/confirm` | Email onay callback | ❌ |

**Servisler**:
- `AuthService` - Supabase Auth işlemleri
- `SupabaseService` - Supabase client wrapper

**Özellikler**:
- Supabase Auth entegrasyonu
- Magic link desteği
- Global signout (scope: 'global')
- Şifre sıfırlama ve güncelleme
- Email token doğrulama (signup, recovery, invite)
- Metadata'dan user_profiles tablosuna otomatik kayıt
- class-validator ile DTO validasyonu

### 3. User Module

**Dosya**: `src/user/user.module.ts`

**Yapı**:
```
user/
├── constants/
│   └── user.constant.ts       # USER_ERROR_MESSAGES, USER_SUCCESS_MESSAGES
├── dto/
│   ├── index.ts
│   ├── create-favorite.dto.ts
│   ├── create-traveller.dto.ts
│   ├── update-profile.dto.ts
│   └── update-traveller.dto.ts
├── enums/
│   └── user.enum.ts           # Gender, FavoriteType, TravellerType, NotificationType, etc.
├── user.controller.ts
├── user.module.ts
└── user.service.ts
```

**Controller**: `UserController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/user/check` | Email kayıtlı mı kontrol | ❌ |
| GET | `/user/profile` | Profil getir | ✅ |
| PUT | `/user/profile` | Profil güncelle | ✅ |
| GET | `/user/favorites` | Favorileri listele | ✅ |
| POST | `/user/favorites` | Favori ekle | ✅ |
| DELETE | `/user/favorites/:id` | Favori sil | ✅ |
| GET | `/user/travellers` | Yolcuları listele | ✅ |
| GET | `/user/travellers/:id` | Yolcu detayı | ✅ |
| POST | `/user/travellers` | Yolcu ekle | ✅ |
| PUT | `/user/travellers/:id` | Yolcu güncelle | ✅ |
| DELETE | `/user/travellers/:id` | Yolcu sil | ✅ |
| GET | `/user/notifications` | Bildirimleri listele | ✅ |
| PUT | `/user/notifications/:id/read` | Bildirimi okundu işaretle | ✅ |
| PUT | `/user/notifications/read-all` | Tümünü okundu işaretle | ✅ |
| GET | `/user/transactions` | Ödeme geçmişi | ✅ |
| GET | `/user/transactions/:id` | İşlem detayı | ✅ |
| GET | `/user/discounts` | Kullanıcı indirimleri | ✅ |
| GET | `/user/discounts/validate/:code` | İndirim doğrula | ✅ |

**Servisler**:
- `UserService` - Kullanıcı işlemleri

**Supabase Tabloları**:
- `user_profiles` - Kullanıcı profilleri
- `user_favorites` - Favoriler
- `user_travellers` - Kayıtlı yolcular
- `notifications` - Bildirimler
- `user_transaction` - Ödeme geçmişi
- `user_discount` - Kullanıcıya özel indirimler

### 4. CMS Module

**Dosya**: `src/cms/cms.module.ts`

**Yapı**:
```
cms/
├── constants/
│   └── cms.constant.ts        # CMS_ERROR_MESSAGES, CMS_DEFAULT_LIMITS
├── enums/
│   └── cms.enum.ts            # CampaignType, DiscountType, DiscountAppliesTo, BlogCategory
├── cms.controller.ts
├── cms.module.ts
└── cms.service.ts
```

**Controller**: `CmsController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/cms/blogs` | Blog listesi | ❌ |
| GET | `/cms/blogs/:slug` | Blog detayı | ❌ |
| GET | `/cms/campaigns` | Kampanya listesi | ❌ |
| GET | `/cms/campaigns/:slug` | Kampanya detayı | ❌ |
| GET | `/cms/discounts` | Aktif indirimler | ❌ |
| GET | `/cms/discounts/validate/:code` | İndirim kodu doğrula | ❌ |
| GET | `/cms/trends/hotels` | Trend oteller | ❌ |
| GET | `/cms/trends/flights` | Trend uçuşlar | ❌ |

**Servisler**:
- `CmsService` - CMS içerik işlemleri

**Supabase Tabloları**:
- `blogs` - Blog yazıları
- `campaigns` - Kampanyalar
- `discount` - Genel indirim kodları
- `trend_hotel` - Trend oteller
- `trend_flight` - Trend uçuşlar

### 5. Contact Module

**Dosya**: `src/contact/contact.module.ts`

**Yapı**:
```
contact/
├── dto/
│   └── create-contact.dto.ts  # ContactCategory enum, CreateContactDto
├── contact.controller.ts
├── contact.module.ts
└── contact.service.ts
```

**Controller**: `ContactController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/contact` | İletişim formu gönder | ❌ |

**Servisler**:
- `ContactService` - İletişim formu işlemleri

**Supabase Tabloları**:
- `contact` - İletişim formları

### 6. PAX Module

**Dosya**: `src/pax/pax.module.ts`

**Controller**: `PaxController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Cache |
|--------|----------|----------|-------|
| POST | `/token` | Token yenileme (manuel) | ❌ |
| POST | `/departure` | Kalkış noktası arama | ✅ (1 saat) |
| POST | `/arrival` | Varış noktası / Otel arama | ✅ (1 saat) |
| POST | `/checkin-dates` | Check-in tarihleri | ✅ (30 dk) |
| POST | `/price-search` | Fiyat arama (Uçak/Otel) | ❌ |
| POST | `/get-offers` | Teklifleri getir | ❌ |
| POST | `/get-offer-details` | Teklif detayları + ürün bilgisi | ❌ |
| POST | `/product-info` | Ürün bilgisi | ❌ |
| POST | `/fare-rules` | Uçuş ücret kuralları | ❌ |

**Servisler**:
- `PaxService` - İş mantığı ve cache yönetimi
- `PaxHttpService` - HTTP client wrapper (logging, error handling)
- `TokenManagerService` - Token cache ve otomatik yenileme
- `TokenService` - Token acquisition

**Özellikler**:
- Otomatik token yönetimi (5 dakika threshold)
- In-memory token caching
- Detaylı request/response logging
- IP ve kullanıcı tracking
- Cache stratejisi (departure/arrival: 1 saat, checkin-dates: 30 dk)

**Booking Controller**: `BookingController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/booking/begin-transaction` | Rezervasyon başlat |
| POST | `/booking/add-services` | Ekstra hizmet ekle |
| POST | `/booking/remove-services` | Hizmet kaldır |
| POST | `/booking/set-reservation-info` | Yolcu bilgileri ayarla |
| POST | `/booking/commit-transaction` | Rezervasyonu onayla |
| POST | `/booking/reservation-detail` | Rezervasyon detayı |
| POST | `/booking/reservation-list` | Rezervasyon listesi |
| POST | `/booking/cancellation-penalty` | İptal cezası sorgula |
| POST | `/booking/cancel-reservation` | Rezervasyonu iptal et |

**Servisler**:
- `BookingService` - Booking iş mantığı

**Özel Özellikler**:
- `set-reservation-info` endpoint'i Supabase'e transaction kaydı yapar
- Transaction ID ve expiresOn bilgileri `backend.pre_transactionid` tablosuna kaydedilir

### 7. Payment Module

**Dosya**: `src/payment/payment.module.ts`

**Yapı**:
```
payment/
├── config/
│   └── payment-config.service.ts
├── constants/
│   └── booking-status.constant.ts
├── dto/
├── enums/
│   ├── currency-codes.enum.ts
│   ├── error-codes.enum.ts
│   └── transaction-types.enum.ts
├── utils/
│   ├── hash-common.util.ts
│   ├── vpos-errors.util.ts
│   ├── vpos-hash-direct.util.ts
│   ├── vpos-hash.util.ts
│   ├── vpos-helpers.util.ts
│   ├── vpos-response-parser.util.ts
│   └── vpos-xml-builder.util.ts
├── payment.controller.ts
├── payment.module.ts
└── payment.service.ts
```

**Controller**: `PaymentController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | 3D Secure |
|--------|----------|----------|-----------|
| POST | `/payment` | 3D Secure ödeme başlat | ✅ |
| POST | `/payment/direct` | Direkt ödeme/iade (3D'siz) | ❌ |
| POST | `/payment/refund` | İade işlemi (3D'siz) | ❌ |
| POST | `/payment/callback` | 3D Secure callback | ✅ |
| GET | `/payment/status/:orderId` | İşlem durumu sorgula | ❌ |

**Servisler**:
- `PaymentService` - Ödeme işlem mantığı, callback işleme, bildirim gönderme
- `PaymentConfigService` - Garanti VPOS konfigürasyonu

**Özellikler**:
- 3D Secure ödeme akışı
- Direkt ödeme (sales/refund)
- Hash hesaplama (3D Secure ve Direct için farklı algoritmalar)
- XML request/response parsing
- Callback sonrası otomatik SMS ve Email bildirimi (paralel)
- Rezervasyon commit işlemi

### 8. PDF Module

**Dosya**: `src/pdf/pdf.module.ts`

**Yapı**:
```
pdf/
├── templates/
│   ├── common.ts
│   ├── flight-booking.pdf.template.ts
│   ├── hotel-booking.pdf.template.ts
│   └── index.ts
├── pdf.controller.ts
├── pdf.module.ts
└── pdf.service.ts
```

**Controller**: `PdfController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/pdf/reservation/:reservationNumber` | Rezervasyon numarası ile PDF |
| GET | `/pdf/booking/:bookingId` | Booking ID ile PDF |

**Servisler**:
- `PdfService` - PDF oluşturma işlemleri

**Özellikler**:
- PDFKit ile PDF oluşturma
- Uçuş ve otel rezervasyon template'leri
- Supabase'den booking verisi çekme
- Dinamik PDF içerik oluşturma

### 9. SMS Module

**Dosya**: `src/sms/sms.module.ts`

**Controller**: `SmsController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/sms/send` | SMS gönder |
| POST | `/sms/balance` | Bakiye sorgula |

**Servisler**:
- `NetgsmService` - Netgsm API entegrasyonu

**Sabitler** (`constants/netgsm.constant.ts`):
- `NETGSM_URLS` - API URL'leri
- `NETGSM_TIMEOUT` - Timeout değeri (15s)
- `SMS_SUCCESS_MESSAGES` - Başarı mesajları
- `SMS_ERROR_MESSAGES` - Hata mesajları
- `BALANCE_ERROR_MESSAGES` - Bakiye hata mesajları
- `SMS_SUCCESS_CODES` - Başarı kodları

**Özellikler**:
- SMS gönderme
- Bakiye sorgulama
- Rezervasyon onay SMS'i (`sendBookingConfirmation`)
- SMS log kaydetme (Supabase)

### 10. Email Module

**Dosya**: `src/email/email.module.ts`

**Controller**: `EmailController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/resend/send` | Email gönder |

**Servisler**:
- `EmailService` - Resend API entegrasyonu

**Sabitler** (`constants/email.constant.ts`):
- `EMAIL_TIMEOUT` - Timeout değeri (10s)
- `DEFAULT_FROM_EMAIL` - Varsayılan gönderici

**Özellikler**:
- Email gönderme
- Rezervasyon onay email'i (`sendBookingConfirmation`)
- Email log kaydetme (Supabase)
- Timeout ile güvenli gönderim

### 11. Airport Module

**Dosya**: `src/airport/airport.module.ts`

**Controller**: `AirportController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/airport/nearest` | En yakın havalimanını bul |

**Servisler**:
- `AirportService` - Havalimanı arama mantığı

**Özellikler**:
- JSON dosyasından havalimanı verileri yükleme (airport.json)
- Haversine formülü ile mesafe hesaplama
- Tip filtreleme (large_airport, medium_airport, vb.)
- In-memory cache (module init'te yüklenir)

### 12. Foursquare Module

**Dosya**: `src/foursquare/foursquare.module.ts`

**Controller**: `FoursquareController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Cache |
|--------|----------|----------|-------|
| GET | `/places/nearby` | Yakındaki yerleri listele | ✅ (30 dk) |

**Servisler**:
- `FoursquareService` - Foursquare Places API client, cache yönetimi

**Sabitler** (`constants/foursquare.constant.ts`):
- `FOURSQUARE_API_VERSION` - API versiyonu
- `FOURSQUARE_DEFAULT_BASE_URL` - Base URL
- `DEFAULT_RADIUS` - Varsayılan yarıçap (2000m)
- `DEFAULT_LIMIT` - Varsayılan limit (12)
- `DEFAULT_SORT` - Varsayılan sıralama (POPULARITY)
- `WALKING_DISTANCE_COUNT` - Yürüme mesafesi sayısı (5)
- `NEARBY_CACHE_TTL` - Cache süresi (30dk)

**Özellikler**:
- Foursquare Places API v2025-06-17 entegrasyonu
- Bearer token authentication
- Sıralama seçenekleri (POPULARITY, RATING, DISTANCE)
- Kategori filtreleme
- Mesafeye göre gruplama (walkingDistance, nearbyLandmarks)
- 30 dakika cache (service katmanında)

### 13. Health Module

**Dosya**: `src/health/health.module.ts`

**Controller**: `HealthController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | Genel health check |
| GET | `/health/pax` | PAX API connectivity check |

**Özellikler**:
- Memory heap kontrolü (150MB threshold)
- Disk storage kontrolü (%90 threshold)
- PAX API durum kontrolü

---

## Servis Katmanı

### AuthService

**Dosya**: `src/auth/auth.service.ts`

**Sorumluluklar**:
- Supabase Auth işlemleri
- Kayıt, giriş, çıkış
- Token yenileme
- Magic link gönderme
- Şifre sıfırlama ve güncelleme
- Email token doğrulama
- Metadata'dan user_profiles'a kayıt

### UserService

**Dosya**: `src/user/user.service.ts`

**Sorumluluklar**:
- Profil CRUD işlemleri
- Favori CRUD işlemleri
- Yolcu CRUD işlemleri
- Bildirim işlemleri
- İşlem geçmişi
- Kullanıcı indirim kodları
- Email kayıt kontrolü

### CmsService

**Dosya**: `src/cms/cms.service.ts`

**Sorumluluklar**:
- Blog içerikleri
- Kampanya yönetimi
- İndirim kodu doğrulama
- Trend içerikler (otel, uçuş)

### ContactService

**Dosya**: `src/contact/contact.service.ts`

**Sorumluluklar**:
- İletişim formu kayıtları

### PaxService

**Dosya**: `src/pax/pax.service.ts`

**Sorumluluklar**:
- PAX API endpoint çağrıları
- Cache yönetimi (departure, arrival, checkin-dates)
- İş mantığı

**Metodlar**:
- `callEndpointWithCache<T>()` - Cache'li endpoint çağrısı
- Her endpoint için ayrı metod

### PaxHttpService

**Dosya**: `src/pax/pax-http.service.ts`

**Sorumluluklar**:
- PAX API'ye HTTP istekleri gönderme
- Token yönetimi (TokenManagerService ile)
- Request/Response logging
- Error handling ve parsing

### BookingService

**Dosya**: `src/pax/booking/booking.service.ts`

**Sorumluluklar**:
- Booking işlemleri
- Supabase entegrasyonu (transaction kayıtları)
- PAX API booking endpoint çağrıları

### TokenManagerService

**Dosya**: `src/pax/token-manager.service.ts`

**Sorumluluklar**:
- Token cache yönetimi
- Otomatik token yenileme
- Token expiration kontrolü

### PaymentService

**Dosya**: `src/payment/payment.service.ts`

**Sorumluluklar**:
- 3D Secure ödeme akışı
- Direkt ödeme/iade işlemleri
- Callback işleme ve rezervasyon commit
- Bildirim gönderme (SMS + Email paralel)
- Hash hesaplama
- XML request/response parsing

**Metodlar**:
- `initiate3DSecurePayment(dto)` - 3D Secure ödeme başlat
- `processDirectPayment(dto)` - Direkt ödeme/iade
- `processRefund(dto)` - İade işlemi
- `processCallbackWithBooking(dto)` - Callback işleme + rezervasyon commit
- `sendNotifications()` - SMS ve Email gönderimi (paralel)

### PdfService

**Dosya**: `src/pdf/pdf.service.ts`

**Sorumluluklar**:
- PDF oluşturma
- Booking verisi çekme
- Template rendering

### NetgsmService

**Dosya**: `src/sms/netgsm.service.ts`

**Sorumluluklar**:
- Netgsm API entegrasyonu
- SMS gönderme
- Bakiye sorgulama
- Rezervasyon onay SMS'i
- SMS log kaydetme

### EmailService

**Dosya**: `src/email/email.service.ts`

**Sorumluluklar**:
- Resend API entegrasyonu
- Email gönderme
- Rezervasyon onay email'i
- Email log kaydetme

### FoursquareService

**Dosya**: `src/foursquare/foursquare.service.ts`

**Sorumluluklar**:
- Foursquare Places API entegrasyonu
- Nearby places arama
- Cache yönetimi
- Response gruplama (walkingDistance, nearbyLandmarks)

---

## Güvenlik ve Middleware

### Global Security

1. **Helmet**: HTTP güvenlik başlıkları
   - XSS Protection
   - Content Security Policy
   - HSTS
   - Frame Options

2. **CORS**: Yapılandırılabilir origin whitelist
   - `CORS_ORIGINS` environment variable
   - Credentials: true

3. **Rate Limiting**: Global throttling
   - 100 request / 60 saniye
   - ThrottlerGuard (global)

4. **Input Validation**: DTO validation
   - class-validator
   - Whitelist: Sadece tanımlı alanlar
   - Transform: Otomatik type dönüşümü

### Interceptors

#### RequestIdInterceptor
- Her request'e unique UUID ekleme
- Response header'a `x-request-id` ekleme

#### ResponseInterceptor
- Response'ları standart formata çevirme
- Request ID ekleme

#### DebugInterceptor
- Development'ta PAX raw response'ları gösterme

### Filters

#### HttpExceptionFilter
- Tüm exception'ları yakalama
- Standart error formatına çevirme
- Request ID ekleme

---

## Veri Akışı

### PAX API Request Flow

```
Client Request
    ↓
PaxController
    ↓
PaxService (cache check)
    ↓
TokenManagerService.getValidToken()
    ↓
PaxHttpService.post()
    ↓
PAX API Request
    ↓
Response to Client
```

### Payment Flow (3D Secure with Booking)

```
Client Request (POST /payment)
    ↓
PaymentService.initiate3DSecurePayment()
    ↓
Form data response
    ↓
Client: Form submit to Garanti VPOS
    ↓
3D Secure doğrulama (bank)
    ↓
Callback (POST /payment/callback)
    ↓
PaymentService.processCallbackWithBooking()
    ↓
Commit Transaction (PAX API)
    ↓
Send Notifications (SMS + Email paralel)
    ↓
Redirect to /payment-result.html
```

### Booking Flow

```
1. Begin Transaction
   POST /booking/begin-transaction
   → Transaction ID al

2. Add Services (opsiyonel)
   POST /booking/add-services

3. Set Reservation Info
   POST /booking/set-reservation-info
   → Supabase'e transaction kaydı

4. Commit Transaction
   POST /booking/commit-transaction
   → Rezervasyon numarası

5. Send Notifications
   → SMS + Email (paralel)
```

### Auth Flow

```
1. Signup
   POST /auth/signup
   → Supabase Auth signup
   → user_profiles tablosuna metadata kaydı
   → Email onay linki gönderilir

2. Email Confirmation
   User clicks email link
   → GET /auth/confirm (backend)
   → Token doğrulama
   → Frontend'e yönlendirme (access_token ile)

3. Signin
   POST /auth/signin
   → Session (access_token, refresh_token)

4. Password Reset
   POST /auth/reset-password
   → Email gönderilir
   User clicks email link
   → Frontend'e yönlendirme
   POST /auth/update-password
   → Şifre güncellenir
```

---

## Hata Yönetimi

### Error Handler Utility

**Dosya**: `src/common/utils/error-handler.util.ts`

**Fonksiyon**: `handlePaxApiError(error, code, message)`

### Error Format

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Error message",
  "requestId": "uuid"
}
```

### Modül Bazlı Error Constants

- `src/auth/constants/auth.constant.ts` - Auth hataları
- `src/user/constants/user.constant.ts` - User hataları
- `src/cms/constants/cms.constant.ts` - CMS hataları
- `src/payment/constants/booking-status.constant.ts` - Payment hataları

---

## Cache Stratejisi

### Cache Manager

**Provider**: `@nestjs/cache-manager` (in-memory)

### Cache TTL'ler

| Endpoint | TTL |
|----------|-----|
| `/departure` | 1 saat |
| `/arrival` | 1 saat |
| `/checkin-dates` | 30 dakika |
| `/places/nearby` | 30 dakika |
| Token | JWT expiration time |

---

## Logging Sistemi

### Logger Service

**Dosya**: `src/common/logger/logger.service.ts`

**Provider**: Winston

### Log Dosyaları

**Konum**: `logs/`

- `combined-YYYY-MM-DD.log` - Tüm loglar (14 gün)
- `error-YYYY-MM-DD.log` - Hatalar (30 gün)
- `debug-YYYY-MM-DD.log` - Debug (7 gün)

---

## Supabase Tabloları

### Backend Schema

- `backend.booking` - Rezervasyon kayıtları
- `backend.pre_transactionid` - Ödeme öncesi transaction kayıtları
- `backend.booking_email` - Email logları
- `backend.booking_sms` - SMS logları

### Public Schema

**Admin Yönetimli (Herkes okuyabilir)**:
- `blogs` - Blog yazıları
- `campaigns` - Kampanyalar
- `discount` - Genel indirim kodları
- `trend_hotel` - Trend oteller
- `trend_flight` - Trend uçuşlar

**Herkes Yazabilir**:
- `contact` - İletişim formları

**Kullanıcıya Özel (RLS)**:
- `user_profiles` - Kullanıcı profilleri
- `user_favorites` - Favoriler
- `user_travellers` - Kayıtlı yolcular
- `notifications` - Bildirimler
- `user_transaction` - Ödeme geçmişi
- `user_discount` - Kullanıcıya özel indirimler

---

## Sonuç

iBilet Internal Core API, NestJS framework'ü kullanılarak geliştirilmiş, modüler yapıda bir backend servisidir. Ana özellikleri:

- ✅ Paximum API entegrasyonu (uçak/otel)
- ✅ Garanti VPOS ödeme entegrasyonu (3D Secure + Direct)
- ✅ Supabase Auth entegrasyonu (şifre sıfırlama, email onay dahil)
- ✅ Kullanıcı yönetimi (profil, favoriler, yolcular, bildirimler)
- ✅ CMS (blog, kampanya, indirim, trend içerikler)
- ✅ İletişim formu
- ✅ PDF oluşturma
- ✅ Netgsm SMS entegrasyonu
- ✅ Resend Email entegrasyonu
- ✅ Foursquare Places API entegrasyonu
- ✅ Havalimanı arama servisi
- ✅ Detaylı logging ve error handling
- ✅ Cache stratejisi
- ✅ Rate limiting ve güvenlik

API, production-ready özelliklerle donatılmış ve genişletilebilir bir mimariye sahiptir.
