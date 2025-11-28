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
- **Kimlik Doğrulama**: Supabase Auth ve JWT tabanlı authentication
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
│   ├── decorators/            # Custom decorators (@CurrentUser)
│   ├── enums/                 # Error codes enum
│   ├── filters/               # Global exception filter
│   ├── interceptors/          # Request ID, Response, Debug interceptors
│   ├── logger/                # Winston logger service
│   ├── services/              # Supabase service
│   └── utils/                 # Error handler utilities
├── auth/                      # Authentication modülü
├── pax/                       # Paximum API entegrasyonu
├── payment/                   # Garanti VPOS ödeme entegrasyonu
├── airport/                   # Havalimanı arama servisi
├── foursquare/               # Foursquare Places API
└── health/                    # Health check endpoints
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
- `AuthModule` - JWT authentication
- `PaxModule` - Paximum API entegrasyonu
- `PaymentModule` - Ödeme işlemleri
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

**Controller**: `SupabaseAuthController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/auth/signup` | Email/password ile kayıt | ❌ |
| POST | `/auth/signin` | Email/password ile giriş | ❌ |
| POST | `/auth/signout` | Çıkış yap | ✅ |
| POST | `/auth/refresh` | Token yenile | ✅ |
| POST | `/auth/magic-link` | Magic link gönder | ❌ |
| GET | `/auth/user` | Kullanıcı bilgileri | ✅ |

**Servisler**:
- `AuthService` - JWT token işlemleri
- `SupabaseService` - Supabase client wrapper

**Özellikler**:
- Supabase Auth entegrasyonu
- JWT token yönetimi
- Magic link desteği
- Global signout (scope: 'global')

### 3. PAX Module

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

**Özel Özellikler**:
- `set-reservation-info` endpoint'i Supabase'e transaction kaydı yapar
- Transaction ID ve expiresOn bilgileri `backend.pre_transactionid` tablosuna kaydedilir

### 4. Payment Module

**Dosya**: `src/payment/payment.module.ts`

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
- `PaymentService` - Ödeme işlem mantığı
- `PaymentConfigService` - Garanti VPOS konfigürasyonu

**Özellikler**:
- 3D Secure ödeme akışı
- Direkt ödeme (sales/refund)
- Hash hesaplama (3D Secure ve Direct için farklı algoritmalar)
- XML request/response parsing
- Test kartları desteği
- Callback redirect (payment-result.html)

**Transaction Types**:
- `sales` - Satış işlemi
- `refund` - İade işlemi

**Security Levels**:
- `3D` - 3D Secure ile ödeme
- `NON3D` - 3D Secure olmadan ödeme

### 5. Airport Module

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

### 6. Foursquare Module

**Dosya**: `src/foursquare/foursquare.module.ts`

**Controller**: `FoursquareController`

**Endpoint'ler**:

| Method | Endpoint | Açıklama | Cache |
|--------|----------|----------|-------|
| GET | `/places/nearby` | Yakındaki yerleri listele | ✅ (30 dk) |

**Servisler**:
- `FoursquareService` - Foursquare Places API client

**Özellikler**:
- Foursquare Places API v2025-06-17 entegrasyonu
- Bearer token authentication
- Sıralama seçenekleri (POPULARITY, RATING, DISTANCE)
- Kategori filtreleme
- Mesafeye göre gruplama (walkingDistance, nearbyLandmarks)
- 30 dakika cache

### 7. Health Module

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

## Endpoint Detayları

### PAX API Endpoints

#### 1. Token Yenileme

**Endpoint**: `POST /token`

**Açıklama**: PAX API token'ını manuel olarak yeniler. Normalde otomatik yönetilir.

**Request Body**: Yok

**Response**:
```json
{
  "message": "Token başarıyla yenilendi",
  "hasToken": true
}
```

**Flow**:
1. `TokenManagerService.getValidToken()` çağrılır
2. Cache'te token varsa ve geçerliyse döner
3. Yoksa `TokenService.getToken()` ile yeni token alınır
4. Token cache'e kaydedilir (TTL: token expiration time)

#### 2. Kalkış Noktası Arama

**Endpoint**: `POST /departure`

**Açıklama**: Uçuş için kalkış noktası arama.

**Request Body** (`DepartureRequestDto`):
```json
{
  "query": "istanbul",
  "productType": 3
}
```

**Cache**: ✅ 1 saat

**Response**: PAX API response (body)

**Flow**:
1. Cache kontrolü
2. Token al (otomatik)
3. PAX API'ye POST isteği
4. Response cache'e kaydet
5. Response döndür

#### 3. Varış Noktası Arama

**Endpoint**: `POST /arrival`

**Açıklama**: Uçuş için varış noktası veya otel konaklama yeri arama.

**Request Body** (`ArrivalRequestDto`):
```json
{
  "query": "dubai",
  "productType": 3  // 3: Uçak, 2: Otel
}
```

**Cache**: ✅ 1 saat

**Response**: PAX API response (body)

#### 4. Check-in Tarihleri

**Endpoint**: `POST /checkin-dates`

**Açıklama**: Otel için check-in tarihlerini getirir.

**Request Body** (`CheckinDatesRequestDto`):
```json
{
  "productId": "105841",
  "productType": 2
}
```

**Cache**: ✅ 30 dakika

#### 5. Fiyat Arama

**Endpoint**: `POST /price-search`

**Açıklama**: Uçak veya otel için fiyat arama.

**Request Body**: `FlightPriceSearchDto` veya `HotelPriceSearchDto`

**Cache**: ❌

**Özellikler**:
- Uçak için: departure, arrival, departureDate, returnDate
- Otel için: productId, checkInDate, checkOutDate, roomCount, adultCount

#### 6. Teklifleri Getir

**Endpoint**: `POST /get-offers`

**Açıklama**: Uçak veya otel tekliflerini getirir.

**Request Body** (`GetOffersRequestDto`):
```json
{
  "productType": 3,  // 3: Uçak, 2: Otel
  "searchId": "uuid",
  "offerIds": ["offer1", "offer2"],  // Uçak için array
  "offerId": "offer1",  // Otel için string
  "productId": "105841",  // Otel için
  "currency": "TRY",
  "culture": "en-US"
}
```

**Özellikler**:
- Uçak için `offerIds` array olarak gönderilir
- Otel için `offerId` string ve `productId` gerekir

#### 7. Teklif Detayları

**Endpoint**: `POST /get-offer-details`

**Açıklama**: Teklif detayları ve ürün bilgisini birlikte getirir.

**Request Body** (`GetOfferDetailsRequestDto`):
```json
{
  "productType": 3,
  "searchId": "uuid",
  "offerId": "offer1",
  "currency": "TRY",
  "culture": "en-US"
}
```

**Özellikler**:
- Otomatik olarak `getProductInfo: true` eklenir
- Hem teklif hem ürün bilgisi tek response'da döner

#### 8. Ürün Bilgisi

**Endpoint**: `POST /product-info`

**Açıklama**: Ürün detay bilgilerini getirir.

**Request Body** (`ProductInfoRequestDto`):
```json
{
  "productId": "105841",
  "productType": 2,
  "currency": "EUR",
  "culture": "tr-TR"
}
```

#### 9. Ücret Kuralları

**Endpoint**: `POST /fare-rules`

**Açıklama**: Uçuş ücret kurallarını getirir.

**Request Body** (`FareRulesRequestDto`):
```json
{
  "transactionId": "uuid",  // veya
  "reservationNumber": "RES123"
}
```

**Özellikler**:
- `transactionId` veya `reservationNumber` zorunlu
- Path parameter olarak `{reservationNumber}` kullanılabilir

### Booking Endpoints

#### 1. Rezervasyon Başlat

**Endpoint**: `POST /booking/begin-transaction`

**Açıklama**: Yeni bir rezervasyon transaction'ı başlatır.

**Request Body** (`BeginTransactionRequestDto`):
```json
{
  "productType": 3,
  "offerId": "offer1",
  "searchId": "uuid"
}
```

**Response**: Transaction ID ve expiresOn bilgileri

#### 2. Ekstra Hizmet Ekle

**Endpoint**: `POST /booking/add-services`

**Açıklama**: Rezervasyona ekstra hizmet ekler (bagaj, yemek, vb.).

**Request Body** (`AddServicesRequestDto`):
```json
{
  "transactionId": "uuid",
  "services": [...]
}
```

#### 3. Hizmet Kaldır

**Endpoint**: `POST /booking/remove-services`

**Açıklama**: Rezervasyondan hizmet kaldırır.

**Request Body** (`RemoveServicesRequestDto`):
```json
{
  "transactionId": "uuid",
  "serviceIds": ["service1", "service2"]
}
```

#### 4. Rezervasyon Bilgileri Ayarla

**Endpoint**: `POST /booking/set-reservation-info`

**Açıklama**: Yolcu bilgilerini ayarlar ve Supabase'e kaydeder.

**Request Body** (`SetReservationInfoRequestDto`):
```json
{
  "transactionId": "uuid",
  "passengers": [...],
  "contactInfo": {...}
}
```

**Özel Özellikler**:
- PAX API response'u Supabase'e kaydedilir
- `backend.pre_transactionid` tablosuna kayıt:
  - `transaction_id`
  - `expires_on`
  - `success`
  - `body` (tam response)
- Hata durumunda bile Supabase'e kayıt yapılır (success: false)

**Response**: Transaction body (normalized)

#### 5. Rezervasyonu Onayla

**Endpoint**: `POST /booking/commit-transaction`

**Açıklama**: Rezervasyonu onaylar ve rezervasyon numarası alır.

**Request Body** (`CommitTransactionRequestDto`):
```json
{
  "transactionId": "uuid"
}
```

**Response**: Reservation number ve detaylar

#### 6. Rezervasyon Detayı

**Endpoint**: `POST /booking/reservation-detail`

**Açıklama**: Rezervasyon detaylarını getirir.

**Request Body** (`ReservationDetailRequestDto`):
```json
{
  "ReservationNumber": "RES123"
}
```

**Özellikler**:
- Endpoint path'inde `{reservationNumber}` placeholder kullanılır

#### 7. Rezervasyon Listesi

**Endpoint**: `POST /booking/reservation-list`

**Açıklama**: Kullanıcının rezervasyon listesini getirir.

**Request Body** (`ReservationListRequestDto`):
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

#### 8. İptal Cezası

**Endpoint**: `POST /booking/cancellation-penalty`

**Açıklama**: İptal ceza tutarını sorgular.

**Request Body** (`CancellationPenaltyRequestDto`):
```json
{
  "reservationNumber": "RES123"
}
```

#### 9. Rezervasyon İptal

**Endpoint**: `POST /booking/cancel-reservation`

**Açıklama**: Rezervasyonu iptal eder.

**Request Body** (`CancelReservationRequestDto`):
```json
{
  "reservationNumber": "RES123",
  "reason": "İptal nedeni"
}
```

### Payment Endpoints

#### 1. 3D Secure Ödeme Başlat

**Endpoint**: `POST /payment`

**Açıklama**: 3D Secure ile ödeme formu oluşturur.

**Request Body** (`PaymentRequestDto`):
```json
{
  "amount": 1000.00,
  "currencyCode": "949",
  "transactionType": "sales",
  "installmentCount": "",
  "customerEmail": "user@example.com",
  "customerIp": "192.168.1.1",
  "companyName": "iBilet",
  "cardInfo": {
    "cardNumber": "4506347055611234",
    "cardExpireDateMonth": "12",
    "cardExpireDateYear": "25",
    "cardCvv2": "000",
    "cardHolderName": "TEST USER"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ödeme formu başarıyla oluşturuldu",
  "data": {
    "orderId": "IB20250101123456",
    "formData": {
      "Mode": "TEST",
      "Version": "v0.01",
      "Terminal": {...},
      "Customer": {...},
      "Card": {...},
      "Order": {...}
    },
    "redirectUrl": "https://sanalposprov.garanti.com.tr/VPServlet"
  }
}
```

**Flow**:
1. Order ID oluştur (`IB` prefix ile)
2. Hash hesapla (3D Secure algoritması)
3. Form data hazırla
4. Response döndür (frontend form submit edecek)

#### 2. Direkt Ödeme/İade

**Endpoint**: `POST /payment/direct`

**Açıklama**: 3D Secure olmadan direkt ödeme veya iade yapar.

**Request Body** (`DirectPaymentRequestDto`):
```json
{
  "amount": 1000.00,
  "currencyCode": "949",
  "transactionType": "sales",  // veya "refund"
  "orderId": "IB20250101123456",  // refund için zorunlu
  "customerEmail": "user@example.com",
  "customerIp": "192.168.1.1",
  "cardInfo": {
    "cardNumber": "4506347055611234",
    "cardExpireDateMonth": "12",
    "cardExpireDateYear": "25",
    "cardCvv2": "000",
    "cardHolderName": "TEST USER"
  }
}
```

**Flow**:
1. Transaction type kontrolü (sales/refund)
2. Order ID kontrolü (refund için zorunlu)
3. Hash hesapla (Direct algoritması - cardNumber sales için gerekli)
4. XML request oluştur
5. Garanti VPOS API'ye POST isteği
6. XML response parse et
7. Formatted response döndür

**Response**:
```json
{
  "success": true,
  "message": "Ödeme işlemi başarıyla tamamlandı",
  "data": {
    "orderId": "IB20250101123456",
    "transaction": {
      "returnCode": "00",
      "authCode": "123456",
      "message": "İşlem başarılı",
      "amount": 1000.00,
      "currencyCode": "949"
    },
    "paymentDetails": {
      "hostRefNum": "123456789",
      "maskedPan": "450634******1234",
      "cardholderName": "TEST USER"
    },
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

#### 3. İade İşlemi

**Endpoint**: `POST /payment/refund`

**Açıklama**: Daha önce yapılmış ödemeye iade yapar.

**Request Body** (`RefundRequestDto`):
```json
{
  "orderId": "IB20250101123456",
  "refundAmount": 500.00,
  "currencyCode": "949",
  "customerEmail": "user@example.com",
  "customerIp": "192.168.1.1"
}
```

**Flow**:
1. Hash hesapla (cardNumber YOK - refund için)
2. XML request oluştur (provUserID: 'PROVRFN')
3. Garanti VPOS API'ye POST
4. Response parse et
5. Formatted response döndür

#### 4. Callback İşleme

**Endpoint**: `POST /payment/callback`

**Açıklama**: 3D Secure doğrulaması sonrası bankadan dönen callback'i işler.

**Request Body** (`CallbackRequestDto`):
```json
{
  "orderId": "IB20250101123456",
  "returnCode": "00",
  "authCode": "123456",
  "message": "İşlem başarılı",
  "amount": "1000.00",
  "currencyCode": "949",
  "hostRefNum": "123456789",
  "maskedPan": "450634******1234",
  "cardholderName": "TEST USER"
}
```

**Flow**:
1. Callback verilerini parse et
2. Success/failed kontrolü
3. URL parametreleri oluştur
4. `/payment-result.html` sayfasına redirect (302)

**Response**: Redirect (302) to `/payment-result.html?status=success&orderId=...`

#### 5. İşlem Durumu Sorgulama

**Endpoint**: `GET /payment/status/:orderId`

**Açıklama**: Belirli bir siparişin durumunu sorgular.

**Status**: ⚠️ Henüz implement edilmedi

**Response**: `BadRequestException` - "İşlem durumu sorgulama henüz implement edilmedi"

### Auth Endpoints

#### 1. Kayıt Ol

**Endpoint**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "name": "John Doe"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "session": {
      "access_token": "...",
      "refresh_token": "..."
    }
  }
}
```

#### 2. Giriş Yap

**Endpoint**: `POST /auth/signin`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**: Signup ile aynı format

#### 3. Çıkış Yap

**Endpoint**: `POST /auth/signout`

**Auth**: ✅ Bearer token gerekli

**Response**:
```json
{
  "success": true,
  "message": "Çıkış başarılı"
}
```

**Özellikler**:
- Global signout (scope: 'global')
- Tüm cihazlardan çıkış yapar

#### 4. Token Yenile

**Endpoint**: `POST /auth/refresh`

**Auth**: ✅ Bearer token gerekli

**Request Body**:
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "access_token": "...",
      "refresh_token": "..."
    }
  }
}
```

#### 5. Magic Link Gönder

**Endpoint**: `POST /auth/magic-link`

**Request Body**:
```json
{
  "email": "user@example.com",
  "redirectTo": "https://app.ibilet.com/auth/callback"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Magic link gönderildi",
  "data": {...}
}
```

#### 6. Kullanıcı Bilgileri

**Endpoint**: `GET /auth/user`

**Auth**: ✅ Bearer token gerekli (Header: `Authorization: Bearer <token>`)

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      ...
    }
  }
}
```

### Airport Endpoint

#### En Yakın Havalimanı

**Endpoint**: `POST /airport/nearest`

**Request Body** (`NearestAirportRequestDto`):
```json
{
  "latitude": 41.0082,
  "longitude": 28.9784,
  "type": ["large_airport", "medium_airport"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "airport": {
      "type": "large_airport",
      "name": "Istanbul Airport",
      "lat": 41.2622,
      "lon": 28.7278
    },
    "distance": 23.45
  },
  "requestId": "uuid"
}
```

**Flow**:
1. Airport.json dosyasından havalimanı listesi yükle (module init)
2. Tip filtresi uygula (opsiyonel)
3. Haversine formülü ile mesafe hesapla
4. En yakın havalimanını bul
5. Response döndür

### Foursquare Endpoint

#### Yakındaki Yerler

**Endpoint**: `GET /places/nearby`

**Query Parameters** (`NearbyQueryDto`):
- `lat` (number, required) - Enlem
- `lng` (number, required) - Boylam
- `radius` (number, optional, default: 2000) - Arama yarıçapı (metre)
- `categories` (string, optional) - Kategori ID'leri (virgülle ayrılmış)
- `limit` (number, optional, default: 12) - Sonuç limiti
- `sort` (enum, optional, default: POPULARITY) - Sıralama (POPULARITY, RATING, DISTANCE)

**Cache**: ✅ 30 dakika

**Response**:
```json
{
  "success": true,
  "data": {
    "walkingDistance": [
      {
        "id": "fsq_id",
        "name": "Place Name",
        "lat": 41.0082,
        "lng": 28.9784,
        "distance": 150,
        "categoryId": 12345,
        "categoryName": "Restaurant",
        "address": "Address",
        "city": "Istanbul",
        "country": "Turkey",
        "popularity": 8.5,
        "rating": 4.5,
        "priceLevel": 2
      }
    ],
    "nearbyLandmarks": [...]
  },
  "requestId": "uuid"
}
```

**Flow**:
1. Cache kontrolü
2. Foursquare Places API'ye istek
3. Sonuçları mesafeye göre sırala
4. İlk 5'i `walkingDistance`, geri kalanını `nearbyLandmarks` olarak grupla
5. Cache'e kaydet (30 dk)
6. Response döndür

### Health Endpoints

#### Genel Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "info": {
    "memory_heap": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "memory_heap": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

**Kontroller**:
- Memory heap: 150MB threshold
- Disk storage: %90 threshold

#### PAX API Health Check

**Endpoint**: `GET /health/pax`

**Response**:
```json
{
  "status": "ok",
  "provider": "PAXIMUM"
}
```

---

## Servis Katmanı

### PaxHttpService

**Dosya**: `src/pax/pax-http.service.ts`

**Sorumluluklar**:
- PAX API'ye HTTP istekleri gönderme
- Token yönetimi (TokenManagerService ile)
- Request/Response logging
- Error handling ve parsing
- IP ve kullanıcı tracking

**Metodlar**:
- `post<T>(endpoint, body, options?)` - POST isteği gönder

**Logging**:
- REQUEST: Endpoint, method, body, headers (token masked)
- RESPONSE: Status code, response time, body
- ERROR: Error messages, stack trace
- BUSINESS ERROR: PAX API business error'ları

**Error Handling**:
- HTTP error'ları (status !== 200)
- Business error'ları (header.success === false)
- Response error'ları (error/errors field'ları)
- Unexpected error'lar

### TokenManagerService

**Dosya**: `src/pax/token-manager.service.ts`

**Sorumluluklar**:
- Token cache yönetimi
- Otomatik token yenileme
- Token expiration kontrolü

**Metodlar**:
- `getValidToken()` - Geçerli token döndür (cache'ten veya yeniden al)
- `refreshToken()` - Yeni token al ve cache'e kaydet
- `clearToken()` - Cache'ten token'ı temizle
- `getTokenStatus()` - Token durumunu getir

**Cache Stratejisi**:
- Key: `pax:token` ve `pax:token:exp`
- TTL: Token expiration time (JWT payload'dan)
- Threshold: 5 dakika (expire olmadan 5 dk önce yenile)

**Token Format**:
- JWT token (3 parça: header.payload.signature)
- Payload'dan `exp` alanı okunur
- Expiration time milisaniye cinsinden hesaplanır

### PaymentService

**Dosya**: `src/payment/payment.service.ts`

**Sorumluluklar**:
- 3D Secure ödeme akışı
- Direkt ödeme/iade işlemleri
- Callback işleme
- Hash hesaplama
- XML request/response parsing

**Metodlar**:
- `initiate3DSecurePayment(dto)` - 3D Secure ödeme başlat
- `processDirectPayment(dto)` - Direkt ödeme/iade
- `processRefund(dto)` - İade işlemi
- `handleCallback(dto)` - Callback işleme
- `getTransactionStatus(orderId)` - İşlem durumu (TODO)

**Hash Algoritmaları**:
- 3D Secure: `vpos-hash.util.ts` - SHA512 hash
- Direct: `vpos-hash-direct.util.ts` - SHA512 hash (farklı parametreler)

**XML İşlemleri**:
- Request builder: `vpos-xml-builder.util.ts`
- Response parser: `vpos-xml-builder.util.ts` (parseXmlResponse)

**Response Formatting**:
- 3D Secure: `format3DSecurePaymentResponse`
- Direct: `formatDirectPaymentResponse`
- Callback: `format3DSecureCallbackResponse`

### AirportService

**Dosya**: `src/airport/airport.service.ts`

**Sorumluluklar**:
- Havalimanı verilerini yükleme
- En yakın havalimanı bulma
- Mesafe hesaplama (Haversine)

**Metodlar**:
- `findNearestAirport(lat, lon, types?)` - En yakın havalimanını bul

**Veri Kaynağı**:
- `src/data/airport.json` - JSON dosyası (module init'te yüklenir)

**Algoritma**:
- Haversine formülü (Dünya yarıçapı: 6371 km)
- Tüm havalimanları üzerinde döngü
- Minimum mesafe bulma

### FoursquareService

**Dosya**: `src/foursquare/foursquare.service.ts`

**Sorumluluklar**:
- Foursquare Places API entegrasyonu
- Nearby places arama
- Response mapping

**Metodlar**:
- `getNearbyPlaces(params)` - Yakındaki yerleri getir

**API Detayları**:
- Base URL: `https://places-api.foursquare.com`
- Version: `2025-06-17` (X-Places-Api-Version header)
- Authentication: Bearer token
- Endpoint: `/places/search`

**Response Mapping**:
- `fsq_place_id` → `id`
- `latitude` → `lat`
- `longitude` → `lng`
- `categories[0]` → `categoryId`, `categoryName`
- `location` → `address`, `city`, `country`

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

**Dosya**: `src/common/interceptors/request-id.interceptor.ts`

**Sorumluluklar**:
- Her request'e unique UUID ekleme
- Response header'a `x-request-id` ekleme

**Flow**:
1. Request header'dan `x-request-id` kontrol et
2. Yoksa UUID oluştur
3. Request object'e `requestId` ekle
4. Response header'a `x-request-id` ekle

#### ResponseInterceptor

**Dosya**: `src/common/interceptors/response.interceptor.ts`

**Sorumluluklar**:
- Response'ları standart formata çevirme
- Request ID ekleme

**Format**:
```json
{
  "success": true,
  "data": {...},
  "requestId": "uuid"
}
```

**Özellikler**:
- Eğer response zaten `success` field'ına sahipse dokunmaz
- Aksi halde standart formata çevirir

#### DebugInterceptor

**Dosya**: `src/common/interceptors/debug.interceptor.ts`

**Sorumluluklar**:
- Development'ta PAX raw response'ları gösterme

**Özellikler**:
- Sadece development mode'da aktif
- PAX API response'larına `debug` field'ı ekler

### Filters

#### HttpExceptionFilter

**Dosya**: `src/common/filters/http-exception.filter.ts`

**Sorumluluklar**:
- Tüm exception'ları yakalama
- Standart error formatına çevirme
- Request ID ekleme

**Error Format**:
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Error message",
  "requestId": "uuid"
}
```

**Özellikler**:
- HttpException'ları yakalar
- Beklenmeyen error'ları yakalar
- Request ID ekler
- Status code'u korur

---

## Veri Akışı

### PAX API Request Flow

```
Client Request
    ↓
Controller (PaxController)
    ↓
TokenManagerService.getValidToken()
    ↓ (Cache kontrolü)
TokenService.getToken() [if needed]
    ↓
PaxHttpService.post()
    ↓
Token header'a ekleme
    ↓
PAX API Request (fetch)
    ↓
Response parsing
    ↓
Logging (Request/Response)
    ↓
Error handling
    ↓
Response to Client
```

### Payment Flow (3D Secure)

```
Client Request (POST /payment)
    ↓
PaymentService.initiate3DSecurePayment()
    ↓
Order ID oluştur
    ↓
Hash hesapla (3D Secure)
    ↓
Form data hazırla
    ↓
Response (form data + redirect URL)
    ↓
Client: Form submit to Garanti VPOS
    ↓
3D Secure doğrulama (bank)
    ↓
Callback (POST /payment/callback)
    ↓
PaymentService.handleCallback()
    ↓
Redirect to /payment-result.html
```

### Payment Flow (Direct)

```
Client Request (POST /payment/direct)
    ↓
PaymentService.processDirectPayment()
    ↓
Order ID kontrolü (refund için)
    ↓
Hash hesapla (Direct)
    ↓
XML request oluştur
    ↓
Garanti VPOS API POST
    ↓
XML response parse
    ↓
Formatted response
    ↓
Response to Client
```

### Booking Flow

```
1. Begin Transaction
   POST /booking/begin-transaction
   → Transaction ID al

2. Add Services (opsiyonel)
   POST /booking/add-services
   → Services eklendi

3. Set Reservation Info
   POST /booking/set-reservation-info
   → Yolcu bilgileri kaydedildi
   → Supabase'e transaction kaydı

4. Commit Transaction
   POST /booking/commit-transaction
   → Rezervasyon numarası alındı

5. Reservation Detail (opsiyonel)
   POST /booking/reservation-detail
   → Rezervasyon detayları
```

---

## Hata Yönetimi

### Error Codes

**General Errors**:
- `INTERNAL_SERVER_ERROR` - Sunucu hatası
- `BAD_REQUEST` - Geçersiz istek
- `UNAUTHORIZED` - Yetkisiz erişim
- `TOKEN_EXPIRED` - Token süresi dolmuş
- `TOKEN_REFRESH_ERROR` - Token yenileme hatası

**PAX API Errors**:
- `DEPARTURE_SEARCH_ERROR` - Kalkış noktası arama hatası
- `ARRIVAL_SEARCH_ERROR` - Varış noktası arama hatası
- `CHECKIN_DATES_ERROR` - Check-in tarihleri hatası
- `PRICE_SEARCH_ERROR` - Fiyat arama hatası
- `GET_OFFERS_ERROR` - Teklif getirme hatası
- `PRODUCT_INFO_ERROR` - Ürün bilgisi hatası
- `OFFER_DETAILS_ERROR` - Teklif detayları hatası
- `FARE_RULES_ERROR` - Ücret kuralları hatası

**Booking Errors**:
- `BEGIN_TRANSACTION_ERROR` - Rezervasyon başlatma hatası
- `ADD_SERVICES_ERROR` - Hizmet ekleme hatası
- `REMOVE_SERVICES_ERROR` - Hizmet kaldırma hatası
- `SET_RESERVATION_INFO_ERROR` - Rezervasyon bilgileri hatası
- `COMMIT_TRANSACTION_ERROR` - Rezervasyon onaylama hatası
- `RESERVATION_DETAIL_ERROR` - Rezervasyon detay hatası
- `RESERVATION_LIST_ERROR` - Rezervasyon listesi hatası
- `CANCELLATION_PENALTY_ERROR` - İptal cezası hatası
- `CANCEL_RESERVATION_ERROR` - Rezervasyon iptal hatası

**Payment Errors**:
- Payment modülünde özel error code'lar yok, HTTP status code kullanılıyor

**Rate Limit**:
- `TOO_MANY_REQUESTS` - Çok fazla istek

### Error Handler Utility

**Dosya**: `src/common/utils/error-handler.util.ts`

**Fonksiyon**: `handlePaxApiError(error, code, message)`

**Sorumluluklar**:
- PAX API error'larını parse etme
- Standart error formatına çevirme
- HttpException fırlatma

---

## Cache Stratejisi

### Cache Manager

**Provider**: `@nestjs/cache-manager` (in-memory)

**Global TTL**: 1 saat (3600000 ms)

### Cache Keys

- `pax:token` - PAX API token
- `pax:token:exp` - Token expiration time
- `pax:departure:{request}` - Departure search results (1 saat)
- `pax:arrival:{request}` - Arrival search results (1 saat)
- `pax:checkin-dates:{request}` - Check-in dates (30 dk)
- `foursquare:nearby:{query}` - Foursquare nearby places (30 dk)

### Cache TTL'ler

| Endpoint | TTL |
|----------|-----|
| `/departure` | 1 saat |
| `/arrival` | 1 saat |
| `/checkin-dates` | 30 dakika |
| `/places/nearby` | 30 dakika |
| Token | JWT expiration time |

### Cache Invalidation

- Token: Otomatik expiration (TTL)
- Search results: TTL sonrası otomatik silinir
- Manuel invalidation yok (şimdilik)

---

## Logging Sistemi

### Logger Service

**Dosya**: `src/common/logger/logger.service.ts`

**Provider**: Winston

**Log Levels**:
- ERROR - Hatalar ve exception'lar
- WARN - Uyarılar
- INFO - Genel bilgi logları (production default)
- DEBUG - Development için detaylı loglar (development default)
- VERBOSE - Çok detaylı loglar

### Log Dosyaları

**Konum**: `logs/`

**Dosyalar**:
- `combined-YYYY-MM-DD.log` - Tüm loglar (info ve üzeri) - **14 gün**
- `error-YYYY-MM-DD.log` - Sadece hatalar - **30 gün**
- `debug-YYYY-MM-DD.log` - Debug logları - **7 gün**

**Özellikler**:
- Daily rotation (günlük döndürme)
- Otomatik sıkıştırma (gzip)
- Maksimum dosya boyutu: 20MB
- JSON formatında structured logging
- Console'da renkli output (development)

### Log Format

**Console (Development)**:
```
2025-11-22 12:00:00 [info] [PaxHttpService] PAX API REQUEST
{
  "requestId": "uuid",
  "endpoint": "http://...",
  "method": "POST"
}
```

**File (JSON)**:
```json
{
  "timestamp": "2025-11-22 12:00:00",
  "level": "info",
  "context": "PaxHttpService",
  "message": "PAX API REQUEST",
  "requestId": "uuid",
  "endpoint": "http://...",
  "method": "POST",
  "requestBody": {...},
  "requestHeaders": {...}
}
```

### Token Masking

**Güvenlik**: Loglarda token'lar maskelenir

**Format**: `eyJhbG...4tY2` → `eyJhbG...Xtyd`

**Uygulama**: `PaxHttpService.maskToken()`

---

## Sonuç

iBilet Internal Core API, NestJS framework'ü kullanılarak geliştirilmiş, modüler yapıda bir backend servisidir. Ana özellikleri:

- ✅ Paximum API entegrasyonu (uçak/otel)
- ✅ Garanti VPOS ödeme entegrasyonu (3D Secure + Direct)
- ✅ Supabase Auth entegrasyonu
- ✅ Foursquare Places API entegrasyonu
- ✅ Havalimanı arama servisi
- ✅ Detaylı logging ve error handling
- ✅ Cache stratejisi
- ✅ Rate limiting ve güvenlik

API, production-ready özelliklerle donatılmış ve genişletilebilir bir mimariye sahiptir.

