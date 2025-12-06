# iBilet API - Endpoint Listesi ve Authentication Durumları

> **Oluşturma Tarihi:** 6 Aralık 2025  
> **Versiyon:** 1.0.0  
> **Güncelleme:** AuthGuard + OptionalAuthGuard Implementation Sonrası

## İçindekiler

- [Özet](#özet)
- [Authentication Tipleri](#authentication-tipleri)
- [Endpoint Listesi](#endpoint-listesi)
  - [Root](#root)
  - [Auth](#auth)
  - [User](#user)
  - [PAX (Uçak/Otel)](#pax-uçakotel)
  - [Booking](#booking)
  - [Payment](#payment)
  - [Email](#email)
  - [SMS](#sms)
  - [PDF](#pdf)
  - [CMS](#cms)
  - [Contact](#contact)
  - [Airport](#airport)
  - [Foursquare](#foursquare)
  - [Yolcu360](#yolcu360)
  - [Findeks](#findeks)
  - [Health](#health)

---

## Özet

**Toplam Endpoint Sayısı:** 80+  
**Protected (AuthGuard):** 30+  
**Public (@Public()):** 45+  
**Optional Auth (OptionalAuthGuard):** 1

### Authentication Dağılımı

| Tip | Sayı | Açıklama |
|-----|------|----------|
| 🔒 **Protected** | 30+ | Token zorunlu |
| 🌐 **Public** | 45+ | Token gerekmez |
| 🔓 **Optional** | 1 | Token varsa user bilgisi alınır, yoksa anonymous |

---

## Authentication Tipleri

### 1. 🔒 Protected (AuthGuard)
- **Kullanım:** `@UseGuards(AuthGuard)` veya Controller seviyesinde
- **Davranış:** Token zorunlu, yoksa `TOKEN_MISSING` hatası
- **User Bilgisi:** `@CurrentUser()` decorator ile alınır

### 2. 🌐 Public (@Public())
- **Kullanım:** `@Public()` decorator
- **Davranış:** Global AuthGuard bypass edilir, token gerekmez
- **User Bilgisi:** Yok

### 3. 🔓 Optional Auth (OptionalAuthGuard)
- **Kullanım:** `@Public() + @UseGuards(OptionalAuthGuard)`
- **Davranış:** Token varsa user bilgisi alınır, yoksa anonymous devam eder
- **User Bilgisi:** `@OptionalCurrentUser()` decorator ile alınır (undefined olabilir)

---

## Endpoint Listesi

### Root

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/` | 🌐 Public | Ana sayfa - API bilgileri |

---

### Auth

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/auth/signup` | 🌐 Public | Email/password ile kayıt ol |
| POST | `/auth/signin` | 🌐 Public | Email/password ile giriş yap |
| POST | `/auth/signout` | 🔒 Protected | Çıkış yap |
| POST | `/auth/refresh` | 🌐 Public | Token yenile |
| POST | `/auth/magic-link` | 🌐 Public | Magic link gönder |
| POST | `/auth/reset-password` | 🌐 Public | Şifre sıfırlama emaili gönder |
| POST | `/auth/update-password` | 🔒 Protected | Şifreyi güncelle |
| GET | `/auth/user` | 🔒 Protected | Kullanıcı bilgilerini getir |
| GET | `/auth/confirm` | 🌐 Public | Email onay linkini doğrula |
| GET | `/auth/oauth/:provider` | 🌐 Public | OAuth URL al (Google/Apple) |
| POST | `/auth/oauth/token` | 🌐 Public | ID Token ile giriş (Mobile Native) |

**Özet:**
- **Protected:** 3 endpoint (signout, update-password, user)
- **Public:** 8 endpoint

---

### User

**Controller Seviyesi:** `@UseGuards(AuthGuard)` (Tüm endpoint'ler varsayılan olarak protected)

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/user/check` | 🌐 Public | Email adresi kayıtlı mı kontrol et |
| GET | `/user/profile` | 🔒 Protected | Kullanıcı profilini getir |
| PUT | `/user/profile` | 🔒 Protected | Kullanıcı profilini güncelle |
| POST | `/user/avatar` | 🔒 Protected | Avatar yükle |
| DELETE | `/user/avatar` | 🔒 Protected | Avatar sil |
| GET | `/user/favorites` | 🔒 Protected | Favorileri listele |
| POST | `/user/favorites` | 🔒 Protected | Favorilere ekle |
| DELETE | `/user/favorites/:id` | 🔒 Protected | Favoriyi sil |
| GET | `/user/travellers` | 🔒 Protected | Kayıtlı yolcuları listele |
| GET | `/user/travellers/:id` | 🔒 Protected | Yolcu detayını getir |
| POST | `/user/travellers` | 🔒 Protected | Yeni yolcu ekle |
| PUT | `/user/travellers/:id` | 🔒 Protected | Yolcu bilgilerini güncelle |
| DELETE | `/user/travellers/:id` | 🔒 Protected | Yolcuyu sil |
| GET | `/user/notifications` | 🔒 Protected | Bildirimleri listele |
| PUT | `/user/notifications/:id/read` | 🔒 Protected | Bildirimi okundu olarak işaretle |
| PUT | `/user/notifications/read-all` | 🔒 Protected | Tüm bildirimleri okundu olarak işaretle |
| GET | `/user/bookings` | 🔒 Protected | Kullanıcının rezervasyonlarını listele |
| GET | `/user/bookings/:id` | 🔒 Protected | Rezervasyon detayını getir |
| GET | `/user/transactions` | 🔒 Protected | Ödeme geçmişini listele |
| GET | `/user/transactions/:id` | 🔒 Protected | İşlem detayını getir |
| GET | `/user/discounts` | 🔒 Protected | Kullanıcıya tanımlı indirim kodlarını listele |
| GET | `/user/discounts/validate/:code` | 🔒 Protected | Kullanıcıya özel indirim kodunu doğrula |
| GET | `/user/sessions` | 🔒 Protected | Aktif oturumları listele |
| DELETE | `/user/sessions/:id` | 🔒 Protected | Belirli bir oturumu sonlandır |
| DELETE | `/user/sessions` | 🔒 Protected | Mevcut oturum hariç tüm oturumları sonlandır |

**Özet:**
- **Protected:** 24 endpoint
- **Public:** 1 endpoint (check)

---

### PAX (Uçak/Otel)

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/token` | 🌐 Public | Token yenileme (manuel) |
| POST | `/departure` | 🌐 Public | Kalkış noktası arama |
| POST | `/arrival` | 🌐 Public | Varış noktası / Otel konaklama yeri arama |
| POST | `/checkin-dates` | 🌐 Public | Check-in tarihleri |
| POST | `/price-search` | 🌐 Public | Fiyat arama (Uçak/Otel) |
| POST | `/get-offers` | 🌐 Public | Teklifleri getir (Get Offers) |
| POST | `/get-offer-details` | 🌐 Public | Teklif detayları ve ürün bilgisi getir |
| POST | `/product-info` | 🌐 Public | Ürün bilgisi getir (Product Info) |
| POST | `/fare-rules` | 🌐 Public | Uçuş ücret kurallarını getir (Fare Rules) |

**Özet:**
- **Public:** 9 endpoint (Tümü public)

---

### Booking

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/booking/begin-transaction` | 🌐 Public | Rezervasyon başlat (Begin Transaction) |
| POST | `/booking/add-services` | 🌐 Public | Ekstra hizmet ekle (Add Services) |
| POST | `/booking/remove-services` | 🌐 Public | Hizmet kaldır (Remove Services) |
| POST | `/booking/set-reservation-info` | 🔓 Optional | Rezervasyon bilgilerini ayarla (Set Reservation Info) |
| POST | `/booking/commit-transaction` | 🌐 Public | Rezervasyonu onayla (Commit Transaction) |
| POST | `/booking/reservation-detail` | 🌐 Public | Rezervasyon detayını getir (Reservation Detail) |
| POST | `/booking/reservation-list` | 🌐 Public | Rezervasyon listesi getir (Reservation List) |
| POST | `/booking/cancellation-penalty` | 🌐 Public | İptal cezası sorgula (Cancellation Penalty) |
| POST | `/booking/cancel-reservation` | 🌐 Public | Rezervasyonu iptal et (Cancel Reservation) |
| GET | `/booking/:transactionId` | 🌐 Public | Booking durumunu getir ve güncelle |

**Özet:**
- **Public:** 8 endpoint
- **Optional Auth:** 1 endpoint (set-reservation-info)

**Not:** `set-reservation-info` endpoint'i token varsa user bilgisini alır ve `userId`'yi options'a ekler. Token yoksa anonymous olarak devam eder.

---

### Payment

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/payment` | 🌐 Public | 3D Secure ile ödeme işlemi başlatma |
| POST | `/payment/initiate` | 🌐 Public | Booking için ödeme başlat (3D Secure) |
| POST | `/payment/direct` | 🌐 Public | Direkt ödeme/iade işlemi (3D Secure olmadan) |
| POST | `/payment/refund` | 🌐 Public | İade işlemi (3D Secure olmadan) |
| POST | `/payment/callback` | 🌐 Public | VPOS callback işlemi (Bankadan dönen sonuç) |

**Özet:**
- **Public:** 5 endpoint (Tümü public - banka callback'leri için)

---

### Email

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/resend/send` | 🌐 Public | Resend Email Gönder |

**Özet:**
- **Public:** 1 endpoint

---

### SMS

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/sms/send` | 🌐 Public | SMS Gönder |
| POST | `/sms/balance` | 🌐 Public | Bakiye Sorgula |

**Özet:**
- **Public:** 2 endpoint

---

### PDF

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/pdf/reservation/:reservationNumber` | 🌐 Public | Rezervasyon PDF İndir |
| GET | `/pdf/booking/:bookingId` | 🌐 Public | Booking ID ile PDF İndir |

**Özet:**
- **Public:** 2 endpoint

---

### CMS

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/cms/blogs` | 🌐 Public | Blog listesini getir |
| GET | `/cms/blogs/:slug` | 🌐 Public | Blog detayını getir |
| GET | `/cms/campaigns` | 🌐 Public | Kampanya listesini getir |
| GET | `/cms/campaigns/:slug` | 🌐 Public | Kampanya detayını getir |
| GET | `/cms/discounts` | 🌐 Public | Aktif indirim kodlarını listele |
| GET | `/cms/discounts/validate/:code` | 🌐 Public | İndirim kodunu doğrula |
| GET | `/cms/trends/hotels` | 🌐 Public | Popüler otelleri getir |
| GET | `/cms/trends/flights` | 🌐 Public | Popüler uçuşları getir |
| GET | `/cms/pages` | 🌐 Public | Statik sayfa listesini getir |
| GET | `/cms/pages/:slug` | 🌐 Public | Statik sayfa detayını getir |

**Özet:**
- **Public:** 10 endpoint (Tümü public)

---

### Contact

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/contact` | 🌐 Public | İletişim formu gönder |

**Özet:**
- **Public:** 1 endpoint

---

### Airport

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/airport/nearest` | 🌐 Public | En yakın havalimanını bul |

**Özet:**
- **Public:** 1 endpoint

---

### Foursquare

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/places/nearby` | 🌐 Public | Yakındaki yerleri listele |

**Özet:**
- **Public:** 1 endpoint

---

### Yolcu360

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/yolcu360/locations` | 🌐 Public | Lokasyon arama (Autocomplete) |
| GET | `/yolcu360/locations/:placeId` | 🌐 Public | Lokasyon detayı (Koordinat bilgisi) |
| POST | `/yolcu360/search` | 🌐 Public | Araç arama |
| GET | `/yolcu360/search/:searchID/:code` | 🌐 Public | Araç arama sonucu detayı |
| POST | `/yolcu360/order` | 🌐 Public | Sipariş oluştur |
| GET | `/yolcu360/order/:orderId` | 🌐 Public | Sipariş detayı getir |
| POST | `/yolcu360/car-selection/:code` | 🌐 Public | Seçilen aracı veritabanına kaydet |
| GET | `/yolcu360/car-selection/:code` | 🌐 Public | Kaydedilen araç kaydını getir (code ile) |
| POST | `/yolcu360/payment/pay` | 🌐 Public | Yolcu360 Limit ödeme (3D Secure olmadan) |

**Özet:**
- **Public:** 9 endpoint (Tümü public)

---

### Findeks

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/findeks/check` | 🌐 Public | Kredi uygunluk kontrolü |
| POST | `/findeks/phone-list` | 🌐 Public | Müşteri telefon listesi |
| POST | `/findeks/report` | 🌐 Public | Findeks kredi raporu oluştur |
| POST | `/findeks/pin-confirm` | 🌐 Public | PIN kodu onayla |
| POST | `/findeks/pin-renew` | 🌐 Public | PIN kodu yenile |

**Özet:**
- **Public:** 5 endpoint (Tümü public - Findeks verification flow için)

---

### Health

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/health` | 🌐 Public | Genel health check |
| GET | `/health/pax` | 🌐 Public | PAX API connectivity check |

**Özet:**
- **Public:** 2 endpoint

---

## Özet Tablo

### Modül Bazında Dağılım

| Modül | Toplam | Protected | Public | Optional |
|-------|--------|-----------|--------|----------|
| **Root** | 1 | 0 | 1 | 0 |
| **Auth** | 11 | 3 | 8 | 0 |
| **User** | 25 | 24 | 1 | 0 |
| **PAX** | 9 | 0 | 9 | 0 |
| **Booking** | 10 | 0 | 8 | 1 |
| **Payment** | 5 | 0 | 5 | 0 |
| **Email** | 1 | 0 | 1 | 0 |
| **SMS** | 2 | 0 | 2 | 0 |
| **PDF** | 2 | 0 | 2 | 0 |
| **CMS** | 10 | 0 | 10 | 0 |
| **Contact** | 1 | 0 | 1 | 0 |
| **Airport** | 1 | 0 | 1 | 0 |
| **Foursquare** | 1 | 0 | 1 | 0 |
| **Yolcu360** | 9 | 0 | 9 | 0 |
| **Findeks** | 5 | 0 | 5 | 0 |
| **Health** | 2 | 0 | 2 | 0 |
| **TOPLAM** | **95** | **27** | **67** | **1** |

---

## Güvenlik Notları

### Protected Endpoint'ler
- Tüm User endpoint'leri (check hariç) protected
- Auth endpoint'lerinin çoğu public (signup, signin, refresh, vb.)
- Sadece signout, update-password ve user bilgisi protected

### Public Endpoint'ler
- PAX API endpoint'leri (arama, fiyat sorgulama)
- Booking endpoint'leri (rezervasyon işlemleri)
- Payment endpoint'leri (banka callback'leri için)
- CMS endpoint'leri (blog, kampanya, indirim)
- Yolcu360 ve Findeks endpoint'leri

### Optional Auth Endpoint'ler
- `POST /booking/set-reservation-info`: Token varsa user bilgisi alınır, yoksa anonymous devam eder

---

## Kullanım Örnekleri

### Protected Endpoint Kullanımı
```typescript
// Frontend'den
fetch('/user/profile', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
})
```

### Public Endpoint Kullanımı
```typescript
// Frontend'den (token gerekmez)
fetch('/price-search', {
  method: 'POST',
  body: JSON.stringify({ ... })
})
```

### Optional Auth Endpoint Kullanımı
```typescript
// Token ile (user bilgisi alınır)
fetch('/booking/set-reservation-info', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN' // Optional
  },
  body: JSON.stringify({ ... })
})

// Token olmadan (anonymous)
fetch('/booking/set-reservation-info', {
  method: 'POST',
  body: JSON.stringify({ ... })
})
```

---

**Son Güncelleme:** 6 Aralık 2025  
**Hazırlayan:** AI Code Analyzer

