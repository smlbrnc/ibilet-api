# Ngrok ile Local Development Setup

## 📋 Adım Adım Kurulum

### 1. Ngrok'u Başlatın

```bash
ngrok http 3000
```

Ngrok size şu formatta bir URL verecek:
```
Forwarding: https://8911471cf511.ngrok-free.app -> http://localhost:3000
```

**Önemli:** Her ngrok başlatışında URL değişir. Çalışan URL'i kullanın!

### 2. .env.development Dosyasını Güncelleyin

Ngrok'tan aldığınız **çalışan** URL'yi `.env.development` dosyasına ekleyin:

```env
API_URL=https://8911471cf511.ngrok-free.app
```

**⚠️ UYARI:** Eski/offline URL'leri kullanmayın! Her ngrok başlatışında yeni URL alın ve `.env.development` dosyasını güncelleyin.

**Önemli:** Her ngrok başlatışında URL değişir, bu yüzden her seferinde güncellemeniz gerekir.

### 3. API'yi Yeniden Başlatın

```bash
npm run start:dev
```

### 4. Test Edin

```bash
# Ngrok üzerinden health check (çalışan URL'i kullanın!)
curl https://8911471cf511.ngrok-free.app/health

# Localhost üzerinden test sayfası
open http://localhost:3000/payment.html
```

## ⚠️ Önemli Notlar

1. **API Önce Başlamalı:** Ngrok'u başlatmadan önce API'nin `localhost:3000`'de çalıştığından emin olun.

2. **502 Bad Gateway Hatası:** 
   - API çalışmıyor olabilir → `npm run start:dev` ile başlatın
   - Port uyuşmazlığı → Ngrok'un doğru portu forward ettiğinden emin olun

3. **URL Değişimi:**
   - Ücretsiz ngrok planında her başlatışta URL değişir
   - `.env.development` dosyasını her seferinde güncelleyin
   - Veya ngrok'un sabit domain özelliğini kullanın (ücretli plan)

4. **Ngrok Web UI:**
   - `http://127.0.0.1:4040` adresinden ngrok web arayüzüne erişebilirsiniz
   - Buradan tüm istekleri görebilir ve debug edebilirsiniz

## 🔍 Sorun Giderme

### 502 Bad Gateway
```bash
# API'nin çalıştığını kontrol edin
curl http://localhost:3000/health

# Port kontrolü
lsof -ti:3000
```

### Ngrok URL Değişti
1. Yeni URL'i kopyalayın
2. `.env.development` dosyasını güncelleyin
3. API'yi yeniden başlatın

### Callback Çalışmıyor
1. Ngrok'un çalıştığını kontrol edin
2. `.env.development` dosyasındaki `API_URL`'in doğru olduğundan emin olun
3. API log'larını kontrol edin
4. Ngrok web UI'den (`http://127.0.0.1:4040`) callback isteklerini kontrol edin

