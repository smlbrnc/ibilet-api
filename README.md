# iBilet Internal Core API

iBilet uçak ve otel rezervasyon sistemi için NestJS tabanlı internal API. Paximum API entegrasyonu ile flight ve hotel operasyonlarını yönetir.

## 📋 İçindekiler

- [Teknoloji Stack](#teknoloji-stack)
- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Kurulum](#kurulum)
- [Çalıştırma](#çalıştırma)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Endpoint'ler](#endpointler)
- [Logging](#logging)
- [Error Handling](#error-handling)
- [Security](#security)
- [Development](#development)

## 🚀 Teknoloji Stack

- **Framework**: NestJS 10.3.0
- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20+
- **Authentication**: JWT (Passport)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI 7.2
- **Cache**: In-memory (cache-manager 5.4)
- **Security**: Helmet 7.1, Rate Limiting (@nestjs/throttler)
- **Health Check**: @nestjs/terminus
- **Logging**: Winston 3.11 (daily rotate file)
- **HTTP Client**: Native Fetch API

## ✨ Özellikler

### Core Features
- ✅ **Paximum API Entegrasyonu**: Flight ve hotel operasyonları için tam entegrasyon
- ✅ **JWT Authentication**: Passport-JWT ile güvenli authentication
- ✅ **Global Error Handling**: Standartlaştırılmış hata yönetimi
- ✅ **Request/Response Interceptors**: Otomatik request tracking ve response normalization
- ✅ **Rate Limiting**: Global ve endpoint-specific rate limiting
- ✅ **Swagger Dokümantasyonu**: Otomatik API dokümantasyonu
- ✅ **Health Check Endpoints**: Sistem ve PAX API health monitoring
- ✅ **Security Headers**: Helmet ile güvenlik başlıkları

### Advanced Features
- ✅ **Winston Logging**: Production-grade structured logging
  - Console + File logging
  - Daily log rotation (combined: 14d, error: 30d, debug: 7d)
  - Otomatik sıkıştırma (gzip)
  - Token masking (güvenlik)
- ✅ **Smart Token Management**: 
  - Otomatik token refresh
  - In-memory token caching
  - Expiry threshold (5 dakika)
- ✅ **Response Caching**:
  - Departure/Arrival: 1 saat
  - Check-in Dates: 30 dakika
- ✅ **Debug Mode**: Development'ta PAX raw response gösterimi

## 🏗 Mimari

### Proje Yapısı

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── auth/                      # JWT authentication
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── jwt-auth.guard.ts
│   └── jwt.strategy.ts
├── common/                    # Shared utilities
│   ├── decorators/            # Custom decorators (@CurrentUser)
│   ├── enums/                 # Error codes enum
│   ├── filters/               # Global exception filter
│   ├── interceptors/          # Request ID, Response, Debug
│   ├── logger/                # Winston logger service
│   └── utils/                 # Error handler utilities
├── config/                    # Configuration management
│   └── configuration.ts       # Environment-based config
├── health/                    # Health check endpoints
│   ├── health.controller.ts
│   └── health.module.ts
└── pax/                       # Paximum API integration
    ├── pax.module.ts
    ├── pax.controller.ts      # Main PAX endpoints
    ├── pax-http.service.ts    # HTTP client with logging
    ├── token.service.ts       # Token acquisition
    ├── token-manager.service.ts # Token caching & refresh
    ├── booking/               # Booking endpoints
    │   ├── booking.controller.ts
    │   ├── booking.module.ts
    │   └── dto/               # Booking DTOs
    ├── dto/                   # Request/Response DTOs
    └── enums/                 # PAX enums (PassengerType, ProductType, etc.)
```

### Global Interceptors

1. **RequestIdInterceptor**: Her request'e unique UUID ekler
2. **ResponseInterceptor**: Başarılı response'ları standart formata çevirir
3. **DebugInterceptor**: Development'ta PAX raw response'ları gösterir

### Global Filters

- **HttpExceptionFilter**: Tüm hataları standart formata dönüştürür

## 📦 Kurulum

### Gereksinimler

- Node.js 20+ 
- npm 9+

### 1. Dependencies'i yükle

```bash
npm install
```

### 2. Environment dosyasını oluştur

```bash
cp .env.example .env.development
```

### 3. .env.development dosyasını düzenle

```env
# ==============================================
# iBilet Internal Core API - Development Config
# ==============================================

# Uygulama Ayarları
NODE_ENV=development
API_URL=https://api-dev.ibilet.com
PORT=3000

# PAX API (Paximum) Ayarları
PAX_BASE_URL=http://service.stage.paximum.com/v2/api
PAX_AGENCY=PXM25847
PAX_USER=USR1
PAX_PASSWORD=!23

# JWT (JSON Web Token) Ayarları
JWT_SECRET=ibilet-dev-secret-2025-paximum-integration-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS (Cross-Origin Resource Sharing) Ayarları
CORS_ORIGINS=http://localhost:3001,https://app-dev.ibilet.com

# Rate Limiting (Hız Sınırlama) Ayarları
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## 🏃 Çalıştırma

### Development

```bash
npm run start:dev
```

Watch mode ile çalışır, kod değişikliklerinde otomatik restart.

### Production

```bash
npm run build
npm run start:prod
```

### Other Commands

```bash
npm run start        # Normal start
npm run start:debug  # Debug mode
npm run format       # Code formatting
npm run lint         # Linting
```

## 📚 API Dokümantasyonu

Server başlatıldıktan sonra Swagger dokümantasyonuna şu adresten ulaşabilirsiniz:

**🔗 http://localhost:3000/api/docs**

### Swagger Özellikleri

- ✅ Tüm endpoint'ler dokümante edilmiş
- ✅ Request/Response örnekleri
- ✅ DTO validasyon kuralları
- ✅ Bearer token authentication
- ✅ Try it out fonksiyonu

## 🔌 Endpoint'ler

### PAX API - Paximum Raw Endpoints

**Base Path**: `/`

| Method | Endpoint | Açıklama | Cache |
|--------|----------|----------|-------|
| POST | `/token` | Token yenileme (manuel) | - |
| POST | `/departure` | Kalkış noktası arama | 1 saat |
| POST | `/arrival` | Varış noktası arama | 1 saat |
| POST | `/checkin-dates` | Check-in tarihleri | 30 dk |
| POST | `/price-search` | Fiyat arama (Flight/Hotel) | - |
| POST | `/get-offers` | Teklifleri getir | - |
| POST | `/product-info` | Ürün bilgisi | - |
| POST | `/offer-details` | Teklif detayları | - |
| POST | `/fare-rules` | Uçuş ücret kuralları | - |

### PAX BOOKING - Paximum Booking Endpoints

**Base Path**: `/booking`

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

### Health Check

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | Genel health check (disk, memory) |
| GET | `/health/pax` | PAX API connectivity check |

## 📝 Logging

Uygulama Winston tabanlı production-grade logging kullanır.

### Log Dosyaları

Loglar `logs/` dizininde saklanır:

- **`combined-YYYY-MM-DD.log`** - Tüm loglar (info ve üzeri) - **14 gün** saklanır
- **`error-YYYY-MM-DD.log`** - Sadece hatalar - **30 gün** saklanır
- **`debug-YYYY-MM-DD.log`** - Debug logları - **7 gün** saklanır

### Log Özellikleri

- ✅ Daily rotation (günlük döndürme)
- ✅ Otomatik sıkıştırma (gzip)
- ✅ Maksimum dosya boyutu: 20MB
- ✅ JSON formatında structured logging
- ✅ Console'da renkli output (development)
- ✅ Context tracking (hangi servisten geldiği)
- ✅ Request/Response tracking
- ✅ Token masking (güvenlik için)

### Log Seviyeleri

- **ERROR**: Hatalar ve exception'lar
- **WARN**: Uyarılar
- **INFO**: Genel bilgi logları (production default)
- **DEBUG**: Development için detaylı loglar (development default)
- **VERBOSE**: Çok detaylı loglar

### Örnek Log Çıktısı

**Console (Development):**
```
2025-11-22 12:00:00 [info] [PaxHttpService] PAX API REQUEST
{
  "requestId": "uuid",
  "endpoint": "http://service.stage.paximum.com/v2/api/productservice/pricesearch",
  "method": "POST"
}
```

**File (JSON):**
```json
{
  "timestamp": "2025-11-22 12:00:00",
  "level": "info",
  "context": "PaxHttpService",
  "message": "PAX API REQUEST",
  "requestId": "uuid",
  "endpoint": "http://service.stage.paximum.com/v2/api/productservice/pricesearch",
  "method": "POST",
  "requestBody": { ... },
  "requestHeaders": { "Authorization": "Bearer eyJhbG...4tY2" }
}
```

### Log Monitoring

```bash
# Tüm logları takip et
tail -f logs/combined-*.log

# Sadece hataları takip et
tail -f logs/error-*.log

# Debug loglarını takip et
tail -f logs/debug-*.log
```

## ⚠️ Error Handling

### Response Formatları

#### Başarılı Response

```json
{
  "success": true,
  "data": { 
    "flights": [...],
    "meta": { ... }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Development'ta Debug Mode

```json
{
  "success": true,
  "data": { ... },
  "debug": {
    "provider": "PAXIMUM",
    "raw": { /* PAX API'den gelen orjinal response */ }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Hata Response

```json
{
  "success": false,
  "code": "PRICE_SEARCH_ERROR",
  "message": "Fiyat arama başarısız",
  "details": {
    "paxError": "Invalid date format"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Codes

#### General Errors
- `INTERNAL_SERVER_ERROR` - Sunucu hatası
- `BAD_REQUEST` - Geçersiz istek
- `UNAUTHORIZED` - Yetkisiz erişim
- `TOKEN_EXPIRED` - Token süresi dolmuş
- `TOKEN_REFRESH_ERROR` - Token yenileme hatası

#### PAX API Errors
- `DEPARTURE_SEARCH_ERROR` - Kalkış noktası arama hatası
- `ARRIVAL_SEARCH_ERROR` - Varış noktası arama hatası
- `CHECKIN_DATES_ERROR` - Check-in tarihleri hatası
- `PRICE_SEARCH_ERROR` - Fiyat arama hatası
- `GET_OFFERS_ERROR` - Teklif getirme hatası
- `PRODUCT_INFO_ERROR` - Ürün bilgisi hatası
- `OFFER_DETAILS_ERROR` - Teklif detayları hatası
- `FARE_RULES_ERROR` - Ücret kuralları hatası

#### Booking Errors
- `BEGIN_TRANSACTION_ERROR` - Rezervasyon başlatma hatası
- `ADD_SERVICES_ERROR` - Hizmet ekleme hatası
- `REMOVE_SERVICES_ERROR` - Hizmet kaldırma hatası
- `SET_RESERVATION_INFO_ERROR` - Rezervasyon bilgileri hatası
- `COMMIT_TRANSACTION_ERROR` - Rezervasyon onaylama hatası
- `RESERVATION_DETAIL_ERROR` - Rezervasyon detay hatası
- `RESERVATION_LIST_ERROR` - Rezervasyon listesi hatası
- `CANCELLATION_PENALTY_ERROR` - İptal cezası hatası
- `CANCEL_RESERVATION_ERROR` - Rezervasyon iptal hatası

#### Rate Limit
- `TOO_MANY_REQUESTS` - Çok fazla istek

## 🔒 Security

### Implemented Security Measures

1. **Helmet**: HTTP güvenlik başlıkları
   - XSS Protection
   - Content Security Policy
   - HSTS
   - Frame Options

2. **Rate Limiting**: 
   - Global: 100 request / 60 saniye
   - Endpoint-specific limitler

3. **CORS**: Yapılandırılabilir origin whitelist

4. **Input Validation**: 
   - class-validator ile DTO validasyonu
   - Whitelist: Sadece tanımlı alanlar kabul edilir
   - Transform: Otomatik type dönüşümü

5. **Token Masking**: Loglarda token'lar maskelenir
   ```
   Authorization: Bearer eyJhbG...4tY2 → Bearer eyJhbG...Xtyd
   ```

6. **JWT Authentication**: 
   - Secret key ile imzalı token'lar
   - Configurable expiry
   - Passport-JWT strategy

## 🔧 Development

### Proje Ayarları

**TypeScript Config:**
- Strict mode aktif
- ES2021 target
- ESM + CommonJS interop

**ESLint:**
- TypeScript ESLint
- Prettier entegrasyonu

**Prettier:**
- Single quotes
- 2 spaces
- Trailing commas

### Code Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint
```

### Environment Files

- `.env.development` - Development ortamı
- `.env.production` - Production ortamı
- `.env.example` - Template dosya

### Git Ignore

Otomatik ignore edilen dosyalar:
- `node_modules/`
- `dist/`
- `logs/`
- `.env*` (`.env.example` hariç)
- `*.log`

## 📄 Lisans

Proprietary - iBilet

## 📞 İletişim

İç kullanım için oluşturulmuştur.

---

**Built with ❤️ by iBilet Team**