# Bildirim API - Frontend Kullanım Kılavuzu

> **Oluşturma Tarihi:** 9 Aralık 2025  
> **Base URL:** `/user/notifications`  
> **Authentication:** Tüm endpoint'ler Protected (Token zorunlu)  
> **Admin Yetkisi:** Bildirim gönderme endpoint'leri için admin yetkisi gereklidir

## İçindekiler

- [Genel Bilgiler](#genel-bilgiler)
- [Endpoint'ler](#endpointler)
  - [Bildirimleri Listele](#1-bildirimleri-listele)
  - [Bildirimi Okundu Olarak İşaretle](#2-bildirimi-okundu-olarak-işaretle)
  - [Tüm Bildirimleri Okundu Olarak İşaretle](#3-tüm-bildirimleri-okundu-olarak-işaretle)
  - [Kullanıcıya Özel Bildirim Gönder (Admin-only)](#4-kullanıcıya-özel-bildirim-gönder-admin-only)
  - [Genel Bildirim Gönder (Admin-only)](#5-genel-bildirim-gönder-admin-only)
- [Response Formatları](#response-formatları)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Hata Yönetimi](#hata-yönetimi)
- [Admin Yetkisi Kontrolü](#admin-yetkisi-kontrolü)

---

## Genel Bilgiler

### Base URL
```
https://api.ibilet.com/user/notifications
```

### Authentication
Tüm bildirim endpoint'leri **Protected**'tır. Bearer token ile authentication gereklidir.

**Header:**
```
Authorization: Bearer <access_token>
```

### Admin Yetkisi
Bildirim gönderme endpoint'leri (`POST /user/notifications` ve `POST /user/notifications/general`) için **admin yetkisi** gereklidir. Admin olmayan kullanıcılar bu endpoint'lere erişmeye çalıştığında `403 Forbidden` hatası alır.

### Response Format
Tüm başarılı response'lar aşağıdaki formatta döner:
```typescript
{
  success: true,
  data: any,
  unreadCount?: number  // Bildirim listesi için
}
```

### Hata Formatı
```typescript
{
  success: false,
  code: string,
  message: string
}
```

---

## Endpoint'ler

### 1. Bildirimleri Listele

**Endpoint:** `GET /user/notifications`

**Açıklama:** Kullanıcının bildirimlerini listeler. Okunmamış bildirimleri filtreleyebilir ve limit uygulayabilirsiniz.

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `unread_only` | boolean | Hayır | `false` | Sadece okunmamış bildirimleri getir |
| `limit` | number | Hayır | - | Maksimum kayıt sayısı |

**Örnek İstekler:**

```typescript
// Tüm bildirimleri getir
GET /user/notifications

// Sadece okunmamış bildirimleri getir
GET /user/notifications?unread_only=true

// Limit ile
GET /user/notifications?limit=10

// Okunmamış + Limit
GET /user/notifications?unread_only=true&limit=5
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      user_id: "user-uuid",
      title: "Rezervasyonunuz onaylandı",
      message: "Rezervasyon numaranız: ABC123",
      type: "booking",
      action_url: "/bookings/123",
      data: {
        booking_id: "123",
        status: "confirmed"
      },
      is_read: false,
      read_at: null,
      created_at: "2025-12-09T10:00:00Z"
    },
    // ...
  ],
  unreadCount: 3
}
```

---

### 2. Bildirimi Okundu Olarak İşaretle

**Endpoint:** `PUT /user/notifications/:id/read`

**Açıklama:** Belirli bir bildirimi okundu olarak işaretler.

**Path Parametreleri:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `id` | string (UUID) | Evet | Bildirim ID'si |

**Örnek İstek:**

```typescript
PUT /user/notifications/123e4567-e89b-12d3-a456-426614174000/read
```

**Response:**
```typescript
{
  success: true,
  message: "Bildirim okundu olarak işaretlendi"
}
```

---

### 3. Tüm Bildirimleri Okundu Olarak İşaretle

**Endpoint:** `PUT /user/notifications/read-all`

**Açıklama:** Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretler.

**Örnek İstek:**

```typescript
PUT /user/notifications/read-all
```

**Response:**
```typescript
{
  success: true,
  message: "Tüm bildirimler okundu olarak işaretlendi"
}
```

---

### 4. Kullanıcıya Özel Bildirim Gönder (Admin-only)

**Endpoint:** `POST /user/notifications`

**Açıklama:** Belirli bir kullanıcıya bildirim gönderir. **Sadece admin kullanıcılar** bu endpoint'i kullanabilir.

**Request Body:**

```typescript
{
  user_id: string;        // UUID - Zorunlu
  title: string;          // Zorunlu
  message?: string;        // Opsiyonel
  type?: NotificationType; // Opsiyonel: 'booking' | 'promotion' | 'system' | 'reminder' | 'alert'
  action_url?: string;    // Opsiyonel
  data?: Record<string, any>; // Opsiyonel - JSON objesi
}
```

**NotificationType Enum:**
```typescript
enum NotificationType {
  BOOKING = 'booking',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  REMINDER = 'reminder',
  ALERT = 'alert'
}
```

**Örnek İstek:**

```typescript
POST /user/notifications
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Rezervasyonunuz onaylandı",
  "message": "Rezervasyon numaranız: ABC123",
  "type": "booking",
  "action_url": "/bookings/123",
  "data": {
    "booking_id": "123",
    "status": "confirmed"
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "notification-uuid",
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Rezervasyonunuz onaylandı",
    message: "Rezervasyon numaranız: ABC123",
    type: "booking",
    action_url: "/bookings/123",
    data: {
      booking_id: "123",
      status: "confirmed"
    },
    is_read: false,
    read_at: null,
    created_at: "2025-12-09T10:00:00Z"
  }
}
```

**Hata Durumları:**

- `403 Forbidden`: Admin yetkisi yok
- `404 Not Found`: Hedef kullanıcı bulunamadı
- `400 Bad Request`: Geçersiz request body

---

### 5. Genel Bildirim Gönder (Admin-only)

**Endpoint:** `POST /user/notifications/general`

**Açıklama:** Tüm kullanıcılara genel bildirim gönderir. **Sadece admin kullanıcılar** bu endpoint'i kullanabilir.

**Request Body:**

```typescript
{
  title: string;          // Zorunlu
  message?: string;        // Opsiyonel
  type?: NotificationType; // Opsiyonel
  action_url?: string;     // Opsiyonel
  data?: Record<string, any>; // Opsiyonel - JSON objesi
}
```

**Örnek İstek:**

```typescript
POST /user/notifications/general
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "Yeni kampanya!",
  "message": "Tüm uçuşlarda %20 indirim fırsatı",
  "type": "promotion",
  "action_url": "/campaigns/summer-sale",
  "data": {
    "campaign_id": "123",
    "discount": 20
  }
}
```

**Response:**
```typescript
{
  success: true,
  message: "Genel bildirim gönderildi",
  totalUsers: 150,
  sentCount: 150
}
```

**Not:** Büyük kullanıcı listeleri için bildirimler 1000'lik chunk'lar halinde gönderilir. `sentCount` başarıyla gönderilen bildirim sayısını gösterir.

**Hata Durumları:**

- `403 Forbidden`: Admin yetkisi yok
- `500 Internal Server Error`: Bildirim gönderim hatası

---

## Response Formatları

### Bildirim Objesi

```typescript
interface Notification {
  id: string;                    // UUID
  user_id: string;               // UUID
  title: string;                 // Bildirim başlığı
  message: string | null;        // Bildirim mesajı
  type: NotificationType | null; // Bildirim tipi
  action_url: string | null;     // Tıklanınca yönlendirilecek URL
  data: Record<string, any> | null; // Ek veri (JSON)
  is_read: boolean;              // Okundu mu?
  read_at: string | null;        // Okunma zamanı (ISO 8601)
  created_at: string;            // Oluşturulma zamanı (ISO 8601)
}
```

---

## Kullanım Örnekleri

### React/Next.js Örneği

```typescript
// utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ibilet.com';

export async function getNotifications(
  token: string,
  options?: { unreadOnly?: boolean; limit?: number }
) {
  const params = new URLSearchParams();
  if (options?.unreadOnly) params.append('unread_only', 'true');
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`${API_BASE_URL}/user/notifications?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Bildirimler getirilemedi');
  }

  return response.json();
}

export async function markNotificationAsRead(token: string, notificationId: string) {
  const response = await fetch(
    `${API_BASE_URL}/user/notifications/${notificationId}/read`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Bildirim güncellenemedi');
  }

  return response.json();
}

export async function markAllNotificationsAsRead(token: string) {
  const response = await fetch(`${API_BASE_URL}/user/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Bildirimler güncellenemedi');
  }

  return response.json();
}

// Admin-only: Kullanıcıya özel bildirim gönder
export async function sendNotification(
  token: string,
  data: {
    user_id: string;
    title: string;
    message?: string;
    type?: 'booking' | 'promotion' | 'system' | 'reminder' | 'alert';
    action_url?: string;
    data?: Record<string, any>;
  }
) {
  const response = await fetch(`${API_BASE_URL}/user/notifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Bildirim gönderilemedi');
  }

  return response.json();
}

// Admin-only: Genel bildirim gönder
export async function sendGeneralNotification(
  token: string,
  data: {
    title: string;
    message?: string;
    type?: 'booking' | 'promotion' | 'system' | 'reminder' | 'alert';
    action_url?: string;
    data?: Record<string, any>;
  }
) {
  const response = await fetch(`${API_BASE_URL}/user/notifications/general`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Genel bildirim gönderilemedi');
  }

  return response.json();
}
```

### React Hook Örneği

```typescript
// hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { getNotifications, markNotificationAsRead } from '@/utils/api';

export function useNotifications(token: string, unreadOnly = false) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);
        const response = await getNotifications(token, { unreadOnly });
        setNotifications(response.data);
        setUnreadCount(response.unreadCount || 0);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchNotifications();
    }
  }, [token, unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(token, notificationId);
      // Local state'i güncelle
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Bildirim okundu olarak işaretlenemedi:', err);
    }
  };

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    refetch: () => {
      // Yeniden yükleme fonksiyonu
    },
  };
}
```

### Admin Panel Kullanım Örneği

```typescript
// components/admin/SendNotificationForm.tsx
'use client';

import { useState } from 'react';
import { sendNotification, sendGeneralNotification } from '@/utils/api';

export function SendNotificationForm({ token }: { token: string }) {
  const [isGeneral, setIsGeneral] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    message: '',
    type: 'system' as const,
    action_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isGeneral) {
        const { user_id, ...generalData } = formData;
        await sendGeneralNotification(token, generalData);
      } else {
        await sendNotification(token, formData);
      }
      setSuccess(true);
      // Form'u temizle
      setFormData({
        user_id: '',
        title: '',
        message: '',
        type: 'system',
        action_url: '',
      });
    } catch (err: any) {
      setError(err.message || 'Bildirim gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>
          <input
            type="checkbox"
            checked={isGeneral}
            onChange={(e) => setIsGeneral(e.target.checked)}
          />
          Genel bildirim (tüm kullanıcılara)
        </label>
      </div>

      {!isGeneral && (
        <div>
          <label>Kullanıcı ID</label>
          <input
            type="text"
            value={formData.user_id}
            onChange={(e) =>
              setFormData({ ...formData, user_id: e.target.value })
            }
            required
            placeholder="123e4567-e89b-12d3-a456-426614174000"
          />
        </div>
      )}

      <div>
        <label>Başlık *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label>Mesaj</label>
        <textarea
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          rows={3}
        />
      </div>

      <div>
        <label>Tip</label>
        <select
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value as any,
            })
          }
        >
          <option value="booking">Rezervasyon</option>
          <option value="promotion">Kampanya</option>
          <option value="system">Sistem</option>
          <option value="reminder">Hatırlatma</option>
          <option value="alert">Uyarı</option>
        </select>
      </div>

      <div>
        <label>Aksiyon URL</label>
        <input
          type="text"
          value={formData.action_url}
          onChange={(e) =>
            setFormData({ ...formData, action_url: e.target.value })
          }
          placeholder="/bookings/123"
        />
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Bildirim başarıyla gönderildi!</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Bildirim Gönder'}
      </button>
    </form>
  );
}
```

---

## Hata Yönetimi

### Hata Kodları

| Kod | HTTP Status | Açıklama |
|-----|-------------|----------|
| `TOKEN_MISSING` | 401 | Token bulunamadı |
| `TOKEN_INVALID` | 401 | Geçersiz veya süresi dolmuş token |
| `ADMIN_REQUIRED` | 403 | Admin yetkisi gereklidir |
| `USER_NOT_FOUND` | 404 | Kullanıcı bulunamadı |
| `NOTIFICATIONS_ERROR` | 400/500 | Bildirim işlemi hatası |
| `USERS_FETCH_ERROR` | 500 | Kullanıcı listesi alınamadı |

### Hata Yakalama Örneği

```typescript
try {
  const response = await sendNotification(token, {
    user_id: 'user-uuid',
    title: 'Test Bildirimi',
  });
  console.log('Başarılı:', response);
} catch (error: any) {
  if (error.message.includes('403') || error.message.includes('ADMIN_REQUIRED')) {
    console.error('Admin yetkisi gerekli!');
    // Kullanıcıyı admin panel'e yönlendir veya uyarı göster
  } else if (error.message.includes('404') || error.message.includes('USER_NOT_FOUND')) {
    console.error('Kullanıcı bulunamadı!');
  } else {
    console.error('Beklenmeyen hata:', error);
  }
}
```

---

## Admin Yetkisi Kontrolü

### Admin Yetkisi Nasıl Kontrol Edilir?

Backend'de admin kontrolü şu şekilde yapılır:

1. **User Metadata Kontrolü:** Supabase user metadata'da `is_admin: true` olmalı
2. **Environment Variable Kontrolü:** `.env` dosyasında `ADMIN_EMAILS` değişkeninde email listesi tanımlı olmalı

### Frontend'de Admin Kontrolü

Frontend'de admin kontrolü için kullanıcının user metadata'sını kontrol edebilirsiniz:

```typescript
// utils/auth.ts
export function isAdmin(user: any): boolean {
  // User metadata'dan kontrol
  if (user?.user_metadata?.is_admin === true) {
    return true;
  }
  
  // Veya backend'den admin kontrolü yapan bir endpoint kullanabilirsiniz
  return false;
}

// Kullanım
const user = await supabase.auth.getUser();
if (isAdmin(user.data.user)) {
  // Admin panel'i göster
} else {
  // Normal kullanıcı arayüzü
}
```

### Admin Panel Erişim Kontrolü

```typescript
// middleware/admin.ts (Next.js)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user?.user_metadata?.is_admin) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

---

## Önemli Notlar

1. **Bildirim Durumu:** Tüm yeni bildirimler `is_read: false` olarak oluşturulur (aktif/okunmamış durumda)

2. **Genel Bildirim Performansı:** Genel bildirimler büyük kullanıcı listeleri için 1000'lik chunk'lar halinde gönderilir. Response'da `sentCount` alanı başarıyla gönderilen bildirim sayısını gösterir.

3. **Admin Yetkisi:** Bildirim gönderme endpoint'leri sadece admin kullanıcılar tarafından kullanılabilir. Normal kullanıcılar bu endpoint'lere erişmeye çalıştığında `403 Forbidden` hatası alır.

4. **Bildirim Tipleri:** Bildirim tipleri (`type`) opsiyoneldir ancak frontend'de filtreleme ve görselleştirme için kullanılabilir:
   - `booking`: Rezervasyon ile ilgili bildirimler
   - `promotion`: Kampanya ve promosyon bildirimleri
   - `system`: Sistem bildirimleri
   - `reminder`: Hatırlatma bildirimleri
   - `alert`: Uyarı bildirimleri

5. **Action URL:** `action_url` alanı bildirime tıklandığında kullanıcıyı yönlendirecek URL'i içerir. Frontend'de bu URL'e göre routing yapılabilir.

---

## Örnek Senaryolar

### Senaryo 0: Belirli Bir Kullanıcıya Özel Bildirim Gönderme

```typescript
// smlbrnc@gmail.com kullanıcısına özel bildirim gönder
// Kullanıcı ID: a1601855-d30c-482b-abe0-8b0a93f99abc

const response = await sendNotification(adminToken, {
  user_id: 'a1601855-d30c-482b-abe0-8b0a93f99abc',
  title: 'Hoş Geldiniz!',
  message: 'iBilet ailesine katıldığınız için teşekkür ederiz. İlk rezervasyonunuzda %10 indirim kazanın!',
  type: 'promotion',
  action_url: '/campaigns/welcome',
  data: {
    discount_percentage: 10,
    valid_until: '2025-12-31',
    campaign_code: 'WELCOME10',
  },
});

console.log('Bildirim gönderildi:', response);
```

**cURL Örneği:**

```bash
curl -X POST https://api.ibilet.com/user/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "a1601855-d30c-482b-abe0-8b0a93f99abc",
    "title": "Hoş Geldiniz!",
    "message": "iBilet ailesine katıldığınız için teşekkür ederiz. İlk rezervasyonunuzda %10 indirim kazanın!",
    "type": "promotion",
    "action_url": "/campaigns/welcome",
    "data": {
      "discount_percentage": 10,
      "valid_until": "2025-12-31",
      "campaign_code": "WELCOME10"
    }
  }'
```

### Senaryo 1: Rezervasyon Onay Bildirimi

```typescript
// Rezervasyon onaylandığında kullanıcıya bildirim gönder
await sendNotification(adminToken, {
  user_id: booking.user_id,
  title: 'Rezervasyonunuz onaylandı',
  message: `Rezervasyon numaranız: ${booking.booking_number}`,
  type: 'booking',
  action_url: `/bookings/${booking.id}`,
  data: {
    booking_id: booking.id,
    booking_number: booking.booking_number,
    status: 'confirmed',
  },
});
```

### Senaryo 2: Kampanya Duyurusu

```typescript
// Tüm kullanıcılara kampanya bildirimi gönder
await sendGeneralNotification(adminToken, {
  title: 'Yaz Kampanyası Başladı!',
  message: 'Tüm uçuşlarda %25 indirim fırsatı. Hemen keşfet!',
  type: 'promotion',
  action_url: '/campaigns/summer-2025',
  data: {
    campaign_id: 'summer-2025',
    discount_percentage: 25,
    valid_until: '2025-08-31',
  },
});
```

### Senaryo 3: Sistem Bakım Bildirimi

```typescript
// Tüm kullanıcılara sistem bakım bildirimi
await sendGeneralNotification(adminToken, {
  title: 'Sistem Bakımı',
  message: '10 Aralık 2025, 02:00-04:00 saatleri arasında sistem bakımı yapılacaktır.',
  type: 'system',
  action_url: null,
  data: {
    maintenance_date: '2025-12-10',
    start_time: '02:00',
    end_time: '04:00',
  },
});
```

---

## Destek

Sorularınız için: [support@ibilet.com](mailto:support@ibilet.com)

