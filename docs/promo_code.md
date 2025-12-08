# Promosyon Kodu Dokümantasyonu

## Genel Promosyon Kodları (Tüm Kullanıcılar İçin)

### 1. SUMMER2025 - Yaz Kampanyası

- **Tip:** Yüzde indirim (%20)
- **Minimum alışveriş:** 500 TRY
- **Maksimum indirim:** 200 TRY
- **Kullanım limiti:** 1000 kez
- **Geçerlilik:** 31 Aralık 2025'e kadar
- **Uygulanabilir:** Tüm ürünler

### 2. WELCOME50 - Hoş Geldin İndirimi

- **Tip:** Sabit tutar (50 TRY)
- **Minimum alışveriş:** 200 TRY
- **Para birimi:** TRY
- **Kullanım limiti:** 5000 kez
- **Geçerlilik:** 30 Haziran 2026'ya kadar
- **Uygulanabilir:** Tüm ürünler

### 3. EURO10 - Avrupa Özel İndirimi

- **Tip:** Sabit tutar (10 EUR)
- **Minimum alışveriş:** 500 TRY
- **Para birimi:** EUR (TRY'ye otomatik dönüştürülür)
- **Kullanım limiti:** 2000 kez
- **Geçerlilik:** 31 Aralık 2025'e kadar
- **Uygulanabilir:** Sadece uçuşlar

### 4. BLACKFRIDAY - Black Friday Özel

- **Tip:** Yüzde indirim (%30)
- **Minimum alışveriş:** 1000 TRY
- **Maksimum indirim:** 500 TRY
- **Kullanım limiti:** 500 kez
- **Geçerlilik:** 20-30 Kasım 2025
- **Uygulanabilir:** Tüm ürünler

### 5. QUICK15 - Hızlı Rezervasyon

- **Tip:** Yüzde indirim (%15)
- **Minimum alışveriş:** 100 TRY
- **Maksimum indirim:** 150 TRY
- **Kullanım limiti:** Sınırsız
- **Geçerlilik:** 31 Aralık 2026'ya kadar
- **Uygulanabilir:** Tüm ürünler

## Kullanıcıya Özel Promosyon Kodları

**Test kullanıcısı için:** `t8zmusxtu2@mrotzis.com`

### 1. VIP25 - VIP Üye Özel İndirimi

- **Tip:** Yüzde indirim (%25)
- **Minimum alışveriş:** 300 TRY
- **Maksimum indirim:** 250 TRY
- **Geçerlilik:** 31 Aralık 2026'ya kadar
- **Uygulanabilir:** Tüm ürünler

### 2. BIRTHDAY100 - Doğum Günü Özel

- **Tip:** Sabit tutar (100 TRY)
- **Minimum alışveriş:** 500 TRY
- **Geçerlilik:** 31 Aralık 2026'ya kadar
- **Uygulanabilir:** Tüm ürünler

### 3. LOYALTY15 - Sadakat Bonusu

- **Tip:** Yüzde indirim (%15)
- **Minimum alışveriş:** 200 TRY
- **Maksimum indirim:** 150 TRY
- **Kullanım limiti:** 3 kez (usage_count ile takip edilir)
- **Geçerlilik:** 30 Haziran 2026'ya kadar
- **Uygulanabilir:** Sadece uçuşlar

---

## Flight Booking Callback URL Örnekleri

### Gerçek Veritabanı Örneği

| Özellik | Değer |
|---------|-------|
| **Transaction ID** | `35b1b597-1e2f-4f80-9ce0-ee3fe68ae219` |
| **Order ID** | `IB_1765181662034_K86286` |
| **Booking Number** | `PX041539` |
| **Status** | `CONFIRMED` |
| **Product Type** | `flight` |
| **Return Code** | `00` (Başarılı) |
| **Promo Code** | `WELCOME50` |

### Örnek Callback URL'ler

#### 1. Başarılı Ödeme ve Rezervasyon

```
http://localhost:3001/payment?status=success&transactionId=35b1b597-1e2f-4f80-9ce0-ee3fe68ae219&success=true&productType=flight&reservationNumber=PX041539
```

**Parametreler:**

- `status=success` - İşlem başarılı
- `transactionId=35b1b597-1e2f-4f80-9ce0-ee3fe68ae219` - PAX transaction ID
- `success=true` - Boolean başarı durumu
- `productType=flight` - Ürün tipi
- `reservationNumber=PX041539` - Rezervasyon numarası (booking_number)

#### 2. Ödeme Başarılı Ama Rezervasyon Oluşturulamadı (Commit Error)

```
http://localhost:3001/payment?status=commiterror&transactionId=35b1b597-1e2f-4f80-9ce0-ee3fe68ae219&success=false&productType=flight&returnCode=00&error=Ödeme%20başarılı%20ancak%20rezervasyon%20oluşturulamadı
```

**Parametreler:**

- `status=commiterror` - Commit hatası
- `success=false` - Rezervasyon oluşturulamadı
- `returnCode=00` - Ödeme başarılı ama commit başarısız
- `error=...` - Hata mesajı

#### 3. Ödeme Başarısız

```
http://localhost:3001/payment?status=failed&transactionId=35b1b597-1e2f-4f80-9ce0-ee3fe68ae219&success=false&productType=flight&returnCode=05&message=Kart%20reddedildi
```

**Parametreler:**

- `status=failed` - İşlem başarısız
- `success=false` - Ödeme başarısız
- `returnCode=05` - Banka hata kodu
- `message=...` - Hata mesajı

### Önemli Notlar

- `productType` her durumda gönderilir (flight, hotel, car).
- `reservationNumber` sadece başarılı durumda gönderilir.
- `transactionId` her durumda gönderilir (PAX transaction ID).
- `status` değerleri: `success`, `commiterror`, `failed`.

---

## Hotel Booking Callback URL Örnekleri

### Gerçek Veritabanı Örneği (COMMIT_ERROR)

| Özellik | Değer |
|---------|-------|
| **Transaction ID** | `834b4a76-0c52-4050-a2ba-efedd707e8d4` |
| **Order ID** | `IB_1765181524794_E55397` |
| **Status** | `COMMIT_ERROR` |
| **Product Type** | `hotel` |
| **Return Code** | `00` (Ödeme başarılı ama commit başarısız) |
| **Promo Code** | `WELCOME50` |

### Örnek Callback URL'ler

#### 1. Başarılı Ödeme ve Rezervasyon

```
http://localhost:3001/payment?status=success&transactionId=834b4a76-0c52-4050-a2ba-efedd707e8d4&success=true&productType=hotel&reservationNumber=HTL123456
```

**Parametreler:**

- `status=success` - İşlem başarılı
- `transactionId=834b4a76-0c52-4050-a2ba-efedd707e8d4` - PAX transaction ID
- `success=true` - Boolean başarı durumu
- `productType=hotel` - Ürün tipi
- `reservationNumber=HTL123456` - Rezervasyon numarası

#### 2. Ödeme Başarılı Ama Rezervasyon Oluşturulamadı (COMMIT_ERROR)

```
http://localhost:3001/payment?status=commiterror&transactionId=834b4a76-0c52-4050-a2ba-efedd707e8d4&success=false&productType=hotel&returnCode=00&error=Ödeme%20başarılı%20ancak%20rezervasyon%20oluşturulamadı
```

**Parametreler:**

- `status=commiterror` - Commit hatası
- `success=false` - Rezervasyon oluşturulamadı
- `returnCode=00` - Ödeme başarılı ama commit başarısız
- `error=...` - Hata mesajı

#### 3. Ödeme Başarısız

```
http://localhost:3001/payment?status=failed&transactionId=834b4a76-0c52-4050-a2ba-efedd707e8d4&success=false&productType=hotel&returnCode=05&message=Kart%20reddedildi
```

**Parametreler:**

- `status=failed` - İşlem başarısız
- `success=false` - Ödeme başarısız
- `returnCode=05` - Banka hata kodu
- `message=...` - Hata mesajı

### Gerçek Veritabanı Callback URL (COMMIT_ERROR)

```
http://localhost:3001/payment?status=commiterror&transactionId=834b4a76-0c52-4050-a2ba-efedd707e8d4&success=false&productType=hotel&returnCode=00&error=Ödeme%20başarılı%20ancak%20rezervasyon%20oluşturulamadı
```

### Başarılı Senaryo Örneği

```
http://localhost:3001/payment?status=success&transactionId=427244c2-cd6e-426d-a0f0-853924ee484b&success=true&productType=hotel&reservationNumber=HTL987654
```

### Önemli Notlar

- `productType=hotel` her durumda gönderilir.
- `reservationNumber` sadece başarılı durumda (`status=success`) gönderilir.
- `transactionId` her durumda gönderilir (PAX transaction ID).
- `status` değerleri: `success`, `commiterror`, `failed`.
- Hotel için `COMMIT_ERROR` durumunda `booking_number` null olabilir; bu durumda `reservationNumber` gönderilmez.

---

## Car (Yolcu360) Booking Callback URL Örnekleri

### Gerçek Veritabanı Örnekleri

#### Örnek 1: SUCCESS (Promo Code ile)

| Özellik | Değer |
|---------|-------|
| **Transaction ID** | `YLP_241026` |
| **Order ID** | `IB_1765181849907_B71150` |
| **Status** | `SUCCESS` |
| **Product Type** | `car` |
| **Promo Code** | `WELCOME50` |
| **Return Code** | `00` (Başarılı) |

**Gerçek Callback URL:**

```
http://localhost:3001/payment?status=success&transactionId=YLP_241026&success=true&productType=car&reservationNumber=YLP_241026
```

#### Örnek 2: SUCCESS (Promo Code olmadan)

| Özellik | Değer |
|---------|-------|
| **Transaction ID** | `YLP_241030` |
| **Order ID** | `IB_1765182557236_K76594` |
| **Status** | `SUCCESS` |
| **Product Type** | `car` |
| **Return Code** | `00` (Başarılı) |

**Gerçek Callback URL:**

```
http://localhost:3001/payment?status=success&transactionId=YLP_241030&success=true&productType=car&reservationNumber=YLP_241030
```

#### Örnek 3: FAILED

| Özellik | Değer |
|---------|-------|
| **Transaction ID** | `YLP_240758` |
| **Order ID** | `IB_1765142151634_Q43842` |
| **Status** | `FAILED` |
| **Product Type** | `car` |
| **Promo Code** | `WELCOME50` |
| **Return Code** | `00` |

**Gerçek Callback URL:**

```
http://localhost:3001/payment?status=failed&transactionId=YLP_240758&success=false&productType=car&returnCode=00&message=Rezervasyon%20başarısız
```

### Senaryo Örnekleri

#### 1. Başarılı Ödeme ve Rezervasyon (SUCCESS)

```
http://localhost:3001/payment?status=success&transactionId=YLP_241030&success=true&productType=car&reservationNumber=YLP_241030
```

**Parametreler:**

- `status=success` - İşlem başarılı
- `transactionId=YLP_241030` - Yolcu360 transaction ID
- `success=true` - Boolean başarı durumu
- `productType=car` - Ürün tipi
- `reservationNumber=YLP_241030` - Rezervasyon numarası (transaction_id ile aynı)

#### 2. Ödeme Başarılı Ama Rezervasyon Oluşturulamadı (COMMIT_ERROR)

```
http://localhost:3001/payment?status=commiterror&transactionId=YLP_241030&success=false&productType=car&returnCode=00&error=Ödeme%20başarılı%20ancak%20rezervasyon%20oluşturulamadı
```

**Parametreler:**

- `status=commiterror` - Commit hatası
- `success=false` - Rezervasyon oluşturulamadı
- `returnCode=00` - Ödeme başarılı ama commit başarısız
- `error=...` - Hata mesajı

#### 3. Ödeme Başarısız (FAILED)

```
http://localhost:3001/payment?status=failed&transactionId=YLP_240758&success=false&productType=car&returnCode=00&message=Rezervasyon%20başarısız
```

**Parametreler:**

- `status=failed` - İşlem başarısız
- `success=false` - Ödeme/rezervasyon başarısız
- `returnCode=00` - Banka hata kodu
- `message=...` - Hata mesajı

### Önemli Notlar

- Yolcu360 için `transaction_id` (örn: `YLP_241030`) aynı zamanda `reservationNumber` olarak kullanılır.
- `productType=car` her durumda gönderilir.
- `reservationNumber` sadece başarılı durumda (`status=success`) gönderilir ve `transaction_id` ile aynıdır.
- `transactionId` her durumda gönderilir (Yolcu360 transaction ID).
- `status` değerleri: `success`, `commiterror`, `failed`.
- Yolcu360'da `booking_number` genellikle null olur; `transaction_id` rezervasyon numarası olarak kullanılır.
- Bu URL'ler frontend'de ödeme sonucu sayfasına yönlendirme için kullanılır.
