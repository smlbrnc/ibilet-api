# iBilet API - Kullanılmayan Kodlar

> **Oluşturma Tarihi:** 6 Aralık 2025  
> **Proje:** iBilet Internal Core API v1.0

## İçindekiler

- [Özet](#özet)
- [Kullanılmayan Decorator'lar](#kullanılmayan-decoratorlar)
- [Kullanılmayan veya Kısmen Kullanılan Utility Fonksiyonlar](#kullanılmayan-veya-kısmen-kullanılan-utility-fonksiyonlar)
- [Implement Edilmemiş Fonksiyonlar](#implement-edilmemiş-fonksiyonlar)
- [Silinen Dokümantasyon Dosyaları](#silinen-dokümantasyon-dosyaları)
- [Öneriler](#öneriler)

---

## Özet

Bu dokümanda iBilet API projesinde kullanılmayan veya eksik kalan kodlar listelenmiştir. Tespit edilen kullanılmayan kodlar şunlardır:

- **1 Decorator**: `@CurrentUser` decorator'ı hiçbir controller'da kullanılmıyor
- **1 Utility Fonksiyon**: `getErrorDetails()` sadece Yolcu360 modülünde kullanılıyor, payment modülünde kullanılmıyor
- **1 TODO Fonksiyon**: `getTransactionStatus()` implement edilmemiş
- **2 Silinmiş Dosya**: Git status'te silinen 2 MD dosyası var

---

## Kullanılmayan Decorator'lar

### 1. CurrentUser Decorator

**Dosya:** `src/common/decorators/current-user.decorator.ts`

**Kod:**
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Durum:** ❌ Hiçbir controller'da kullanılmıyor

**Açıklama:** 
- Bu decorator, request'ten kullanıcı bilgisini çıkarmak için oluşturulmuş
- Ancak projede hiçbir endpoint'te `@CurrentUser()` şeklinde kullanılmıyor
- Bunun yerine tüm controller'larda `@Headers('authorization')` ile manuel token alınıp işleniyor

**Örnek Kullanım Yerleri:**
- `AuthController`: `@Headers('authorization')` kullanıyor
- `UserController`: `@Headers('authorization')` kullanıyor
- Diğer tüm controller'lar: Authorization header manuel parse ediliyor

**Neden Kullanılmıyor:**
- Projede Supabase Auth kullanılıyor ve her endpoint'te token `authorization?.replace('Bearer ', '')` ile parse ediliyor
- Guard veya middleware ile otomatik user injection yapılmıyor
- Manuel token yönetimi tercih edilmiş

**Öneri:**
1. **Seçenek A:** Decorator'ı tamamen sil (kullanılmadığı için)
2. **Seçenek B:** Guard + Middleware ekleyerek kullanılabilir hale getir:
   - `AuthGuard` oluştur
   - Token'ı validate et ve `request.user` olarak inject et
   - Tüm protected endpoint'lerde `@UseGuards(AuthGuard)` ve `@CurrentUser()` kullan

---

## Kullanılmayan veya Kısmen Kullanılan Utility Fonksiyonlar

### 1. getErrorDetails() Fonksiyonu

**Dosya:** `src/payment/utils/vpos-errors.util.ts`

**Kod:**
```typescript
export function getErrorDetails(errorCode: string): ErrorDetails {
  const message = VposErrorMessages[errorCode as VposErrorCode] || 'Bilinmeyen hata kodu';
  // ... (tam implementasyon dosyada mevcut)
}
```

**Durum:** ⚠️ Sadece `findeks.service.ts` içinde kullanılıyor, payment modülünde kullanılmıyor

**Açıklama:**
- Bu fonksiyon Garanti VPOS hata kodlarını detaylı bilgi ile döndürüyor
- Payment modülünde hiç kullanılmıyor
- Sadece Yolcu360 Findeks servisinde kullanılıyor

**Kullanım Yerleri:**
```bash
# grep sonucu:
src/yolcu360/findeks.service.ts:158:  message += this.formatErrorDetails(errorDetails.details);
src/yolcu360/findeks.service.ts:174:  private formatErrorDetails(
src/payment/utils/vpos-errors.util.ts:8:  export interface ErrorDetails {
src/payment/utils/vpos-errors.util.ts:33: export function getErrorDetails(errorCode: string): ErrorDetails {
```

**Öneri:**
1. **Seçenek A:** Payment modülünde de hata detaylarını kullanmaya başla:
   - `payment.service.ts` içinde hata durumlarında `getErrorDetails()` çağır
   - Kullanıcıya daha detaylı hata mesajları göster
   - Retry, isCritical gibi bilgileri kullan

2. **Seçenek B:** Fonksiyonu `common/utils` altına taşı (hem Payment hem Yolcu360 kullanıyor)

3. **Seçenek C:** Payment için ayrı error handler yaz, Yolcu360 için mevcut kalsın

---

## Implement Edilmemiş Fonksiyonlar

### 1. getTransactionStatus()

**Dosya:** `src/payment/payment.service.ts`  
**Satır:** 280-302

**Kod:**
```typescript
async getTransactionStatus(orderId: string) {
  try {
    this.logger.log('=== VPOS TRANSACTION STATUS REQUEST ===');
    this.logger.debug(`Order ID: ${orderId}`);

    // TODO: Garanti VPOS API'den inquiry XML request oluştur ve gönder
    // Inquiry için özel hash hesaplama ve XML builder gerekli
    // Şimdilik placeholder response döndürüyoruz

    throw new BadRequestException('İşlem durumu sorgulama henüz implement edilmedi');
  } catch (error) {
    // ...
  }
}
```

**Durum:** ❌ TODO olarak bırakılmış, implement edilmemiş

**Controller Endpoint:** 
```typescript
@Get('status/:orderId')
async getStatus(@Param('orderId') orderId: string) {
  return this.paymentService.getTransactionStatus(orderId);
}
```

**Açıklama:**
- Endpoint tanımlı ancak fonksiyon çalışmıyor
- Garanti VPOS Inquiry API çağrısı yapılması gerekiyor
- XML request builder ve hash hesaplama eksik

**Gereken İşlemler:**
1. Garanti VPOS Inquiry API dokümantasyonunu incele
2. `buildInquiryXml()` fonksiyonu yaz
3. Inquiry için hash hesaplama fonksiyonu ekle
4. `parseXmlResponse()` ile yanıtı parse et
5. Test et

**Öneri:**
- Ya endpoint'i kaldır ya da implement et
- Şu anda çalışmayan bir endpoint production'da olmamalı

---

## Silinen Dokümantasyon Dosyaları

Git status'e göre aşağıdaki dosyalar silinmiş:

### 1. `docs/ngrok-setup.md`

**Durum:** ❌ Silinmiş (Git tracked)

**Açıklama:**
- Ngrok setup dokümantasyonu silinmiş
- Bu dosya development ortamında webhook test için kullanılıyor olabilir
- Payment callback'leri test etmek için ngrok kullanılıyor mu?

**Öneri:**
- Eğer development'ta ngrok kullanılıyorsa dosyayı geri getir
- Kullanılmıyorsa git'ten tamamen kaldır: `git rm docs/ngrok-setup.md`

### 2. `docs/yolcu360-frontend-guide.md`

**Durum:** ❌ Silinmiş (Git tracked)

**Açıklama:**
- Yolcu360 frontend entegrasyon dokümantasyonu silinmiş
- Frontend geliştiriciler için önemli olabilir

**Öneri:**
- Frontend'de kullanılıyorsa geri getir
- Değilse git'ten kaldır: `git rm docs/yolcu360-frontend-guide.md`

**Commit Önerisi:**
```bash
# Gerçekten silinecekse:
git rm docs/ngrok-setup.md docs/yolcu360-frontend-guide.md
git commit -m "docs: Remove unused documentation files"
```

---

## Öneriler

### Öncelik 1: Kritik (Hemen Yapılmalı)

1. **getTransactionStatus() implement et veya endpoint'i kaldır**
   - Production'da çalışmayan endpoint olmamalı
   - Ya implement et ya da controller'dan kaldır

2. **Silinen dosyaları temizle**
   - `git rm` ile git'ten kaldır
   - Ya da geri getirip dokümante et

### Öncelik 2: Orta (İyileştirme)

3. **CurrentUser decorator'ı değerlendir**
   - Kullanılacaksa: Guard + Middleware ekle
   - Kullanılmayacaksa: Sil

4. **getErrorDetails() kullanımını genişlet**
   - Payment servisinde de kullan
   - Veya common/utils'e taşı

### Öncelik 3: Düşük (Opsiyonel)

5. **TokenService kullanımını gözden geçir**
   - Şu anda sadece TokenManagerService tarafından kullanılıyor
   - Bu normal bir pattern (internal service)
   - Değişiklik gerekmeyebilir

---

## Kod Temizlik Checklist

- [ ] `@CurrentUser` decorator'ı için karar ver (kullan veya sil)
- [ ] `getTransactionStatus()` fonksiyonunu implement et veya endpoint'i kaldır
- [ ] `getErrorDetails()` kullanımını genişlet veya taşı
- [ ] Silinen MD dosyalarını git'ten kaldır
- [ ] Kullanılmayan import'ları temizle (ESLint ile)
- [ ] Dead code detection tool'u kullan

---

## Ek Notlar

### Potansiyel Kullanılmayan İmportlar

ESLint ile detaylı tarama yapılması önerilir:

```bash
npm run lint
```

### Önerilen Araçlar

1. **ts-prune**: TypeScript projesinde kullanılmayan export'ları tespit eder
2. **depcheck**: Kullanılmayan dependencies'leri bulur
3. **ESLint unused-imports plugin**: Kullanılmayan import'ları bulur

---

**Son Güncelleme:** 6 Aralık 2025  
**Hazırlayan:** AI Code Analyzer

