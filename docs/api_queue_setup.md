# Queue Sistemi - Kurulum ve Kullanım

## 📦 Gereksinimler

Queue sistemi **Redis** kullanır. Redis kurulumu:

### macOS (Homebrew)
```bash
brew install redis
brew services start redis
```

### Docker
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

## ⚙️ Konfigürasyon

`.env` dosyasına Redis ayarlarını ekleyin:

```env
# Redis Configuration (Queue için)
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password  # Opsiyonel
```

## 🚀 Nasıl Çalışır?

### Flow

```
1. Payment Callback → Booking CONFIRMED
2. Bildirim job queue'ya eklenir ✅
3. HTTP Response frontend'e hemen gider 🚀
4. Queue worker job'ı işler:
   - PDF oluştur
   - Email gönder
   - SMS gönder
5. Tamamlandı ✅
```

### Avantajlar

- ✅ **Hızlı response:** Frontend maksimum 1-2 saniye içinde yanıt alır
- ✅ **Güvenilir:** Job başarısız olursa otomatik retry
- ✅ **Scalable:** Birden fazla worker çalıştırılabilir
- ✅ **Monitoring:** Bull board ile job'ları izleyebilirsiniz

## 📊 Queue Monitoring (Opsiyonel)

Bull Board ile queue'ları izleyin:

```bash
npm install @bull-board/api @bull-board/express
```

Sonra `main.ts`'de:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Queue monitoring (sadece development)
if (process.env.NODE_ENV === 'development') {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  
  createBullBoard({
    queues: [new BullAdapter(notificationQueue)],
    serverAdapter,
  });
  
  app.use('/admin/queues', serverAdapter.getRouter());
}
```

Ardından: `http://localhost:3000/admin/queues`

## 🔍 Log'lar

Queue işlemleri log'lanır:

```
[NotificationProcessor] Queue: Bildirim işlemi başlatıldı
[NotificationProcessor] Queue: PDF oluşturuldu
[NotificationProcessor] Queue: Rezervasyon onay emaili gönderildi
[NotificationProcessor] Queue: Rezervasyon onay SMS gönderildi
[NotificationProcessor] Queue: Bildirim işlemi tamamlandı
```

## ⚠️ Production

Production'da Redis'i cluster mode ile kullanın ve retry stratejileri ayarlayın:

```typescript
BullModule.registerQueue({
  name: 'notifications',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
}),
```

## 🧪 Test

```bash
# Redis çalışıyor mu kontrol et
redis-cli ping
# PONG

# Queue job'larını izle
npm run start:dev
# Log'larda "Queue:" ile başlayan mesajları takip edin
```

