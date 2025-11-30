# iBilet API - Frontend Entegrasyon Rehberi

Bu dokümantasyon, iBilet web uygulaması için NestJS API entegrasyonunu açıklar.  
Tüm işlemler API üzerinden yapılır, frontend'e Supabase kurulumu gerekmez.

## İçindekiler

1. [Genel Bilgiler](#genel-bilgiler)
2. [Auth İşlemleri](#auth-işlemleri)
3. [CMS Endpoint'leri (Public)](#cms-endpointleri-public)
4. [İletişim Formu](#iletişim-formu)
5. [User Endpoint'leri (Protected)](#user-endpointleri-protected)
6. [Hata Yönetimi](#hata-yönetimi)
7. [Next.js Entegrasyon Örneği](#nextjs-entegrasyon-örneği)

---

## Genel Bilgiler

### Base URL

```
Production: https://api.ibilet.com
Development: http://localhost:3000
```

### Headers

Tüm isteklerde:

```typescript
{
  'Content-Type': 'application/json'
}
```

Protected endpoint'ler için ek olarak:

```typescript
{
  'Authorization': 'Bearer {access_token}'
}
```

### Response Format

Tüm API yanıtları aynı formatta döner:

```typescript
// Başarılı yanıt
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı" // opsiyonel
}

// Hata yanıtı
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Hata açıklaması"
}
```

---

## Auth İşlemleri

### Kayıt Ol

```http
POST /auth/signup
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "full_name": "Ahmet Yılmaz"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_metadata": { "full_name": "Ahmet Yılmaz" }
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "xxx",
      "expires_in": 3600
    }
  }
}
```

### Giriş Yap

```http
POST /auth/signin
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "xxx",
      "expires_in": 3600
    }
  }
}
```

### Token Yenile

```http
POST /auth/refresh
```

**Request Body:**

```json
{
  "refresh_token": "xxx"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "new_xxx",
      "expires_in": 3600
    }
  }
}
```

### Çıkış Yap

```http
POST /auth/signout
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "success": true,
  "message": "Çıkış başarılı"
}
```

### Magic Link Gönder

```http
POST /auth/magic-link
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "redirectTo": "https://yoursite.com/auth/callback"
}
```

### Kullanıcı Bilgisi

```http
GET /auth/user
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_metadata": { ... }
    }
  }
}
```

---

## CMS Endpoint'leri (Public)

Bu endpoint'ler için auth gerekmez.

### Bloglar

#### Blog Listesi

```http
GET /cms/blogs?category=travel&limit=10&offset=0
```

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| category | string | Kategori filtresi (opsiyonel) |
| limit | number | Sayfa başına kayıt (opsiyonel) |
| offset | number | Atlama sayısı (opsiyonel) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "En İyi Tatil Rotaları",
      "slug": "en-iyi-tatil-rotalari",
      "excerpt": "2024 yılının en popüler...",
      "cover_image_url": "https://...",
      "category": "travel",
      "tags": ["tatil", "yaz"],
      "published_at": "2024-01-15T10:00:00Z",
      "view_count": 1250
    }
  ]
}
```

#### Blog Detayı

```http
GET /cms/blogs/:slug
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "En İyi Tatil Rotaları",
    "slug": "en-iyi-tatil-rotalari",
    "content": "<p>Blog içeriği...</p>",
    "excerpt": "...",
    "cover_image_url": "https://...",
    "author": "Ahmet Yılmaz",
    "category": "travel",
    "tags": ["tatil", "yaz"],
    "published_at": "2024-01-15T10:00:00Z",
    "view_count": 1251
  }
}
```

### Kampanyalar

#### Kampanya Listesi

```http
GET /cms/campaigns?type=flight&limit=6
```

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| type | string | `flight`, `hotel`, `both` |
| limit | number | Limit (opsiyonel) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Yaz Kampanyası",
      "slug": "yaz-kampanyasi",
      "description": "Tüm yurt içi uçuşlarda %20 indirim",
      "type": "flight",
      "cover_image_url": "https://...",
      "discount_percentage": 20,
      "promo_code": "YAZ2024",
      "start_date": "2024-06-01T00:00:00Z",
      "end_date": "2024-08-31T23:59:59Z",
      "priority": 10
    }
  ]
}
```

#### Kampanya Detayı

```http
GET /cms/campaigns/:slug
```

### İndirim Kodları

#### Aktif İndirimler

```http
GET /cms/discounts
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "HOSGELDIN",
      "name": "Hoş Geldin İndirimi",
      "description": "İlk rezervasyonunuzda geçerli",
      "type": "percentage",
      "value": 10,
      "min_purchase_amount": 500,
      "applies_to": "all",
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-12-31T23:59:59Z"
    }
  ]
}
```

#### İndirim Kodu Doğrula

```http
GET /cms/discounts/validate/:code
```

**Response (Başarılı):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "HOSGELDIN",
    "type": "percentage",
    "value": 10,
    "min_purchase_amount": 500,
    "max_discount_amount": 200,
    "applies_to": "all"
  }
}
```

**Response (Hatalı):**

```json
{
  "success": false,
  "code": "DISCOUNT_INVALID",
  "message": "Geçersiz indirim kodu"
}
```

### Trend Oteller

```http
GET /cms/trends/hotels?limit=6
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rixos Premium Belek",
      "location": "Belek, Antalya",
      "city": "Antalya",
      "country": "Türkiye",
      "description": "5 yıldızlı lüks otel...",
      "image_url": "https://...",
      "star_rating": 5,
      "price_from": 2500,
      "currency": "TRY",
      "amenities": ["Havuz", "Spa", "Fitness"]
    }
  ]
}
```

### Trend Uçuşlar

```http
GET /cms/trends/flights?limit=6
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "origin_city": "İstanbul",
      "origin_code": "IST",
      "destination_city": "Antalya",
      "destination_code": "AYT",
      "airline": "Turkish Airlines",
      "airline_logo_url": "https://...",
      "image_url": "https://...",
      "price_from": 799,
      "currency": "TRY",
      "flight_duration": "1s 15dk",
      "is_direct": true
    }
  ]
}
```

---

## İletişim Formu

```http
POST /contact
```

**Request Body:**

```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "+905551234567",
  "subject": "Rezervasyon Hakkında",
  "message": "Rezervasyonumla ilgili bilgi almak istiyorum...",
  "category": "booking",
  "booking_reference": "PX123456"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| name | string | ✅ | İsim |
| email | string | ✅ | Email |
| phone | string | ❌ | Telefon |
| subject | string | ✅ | Konu |
| message | string | ✅ | Mesaj |
| category | enum | ❌ | `general`, `booking`, `refund`, `complaint`, `suggestion`, `other` |
| booking_reference | string | ❌ | Rezervasyon numarası |

**Response:**

```json
{
  "success": true,
  "message": "Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.",
  "data": {
    "id": "uuid"
  }
}
```

---

## User Endpoint'leri (Protected)

Bu endpoint'ler için `Authorization: Bearer {access_token}` header'ı gereklidir.

### Profil

#### Profil Getir

```http
GET /user/profile
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ahmet Yılmaz",
    "phone": "+905551234567",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "nationality": "TR",
    "passport_number": "U12345678",
    "passport_expiry": "2030-01-01",
    "tc_kimlik_no": "12345678901",
    "avatar_url": "https://...",
    "address": "Atatürk Cad. No:1",
    "city": "İstanbul",
    "country": "Türkiye",
    "preferred_language": "tr",
    "preferred_currency": "TRY",
    "marketing_consent": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Profil Güncelle

```http
PUT /user/profile
Authorization: Bearer {access_token}
```

**Request Body:**

```json
{
  "full_name": "Ahmet Yılmaz",
  "phone": "+905551234567",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "nationality": "TR",
  "address": "Yeni Adres",
  "city": "İstanbul",
  "marketing_consent": true
}
```

### Favoriler

#### Favori Listesi

```http
GET /user/favorites?type=flight
Authorization: Bearer {access_token}
```

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| type | string | `flight`, `hotel`, `destination` (opsiyonel) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "flight",
      "title": "İstanbul - Antalya Uçuşu",
      "description": "Ekonomi sınıfı, direkt uçuş",
      "image_url": "https://...",
      "data": {
        "origin": "IST",
        "destination": "AYT",
        "date": "2024-06-15"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Favorilere Ekle

```http
POST /user/favorites
Authorization: Bearer {access_token}
```

**Request Body:**

```json
{
  "type": "flight",
  "title": "İstanbul - Antalya Uçuşu",
  "description": "Ekonomi sınıfı, direkt uçuş",
  "image_url": "https://...",
  "data": {
    "origin": "IST",
    "destination": "AYT",
    "date": "2024-06-15",
    "price": 799
  }
}
```

#### Favori Sil

```http
DELETE /user/favorites/:id
Authorization: Bearer {access_token}
```

### Kayıtlı Yolcular

#### Yolcu Listesi

```http
GET /user/travellers
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "traveller_type": "adult",
      "title": "mr",
      "first_name": "Ahmet",
      "last_name": "Yılmaz",
      "date_of_birth": "1990-01-15",
      "gender": "male",
      "nationality": "TR",
      "passport_number": "U12345678",
      "passport_expiry": "2030-01-01",
      "tc_kimlik_no": "12345678901",
      "email": "ahmet@example.com",
      "phone": "+905551234567",
      "is_primary": true
    }
  ]
}
```

#### Yolcu Detayı

```http
GET /user/travellers/:id
Authorization: Bearer {access_token}
```

#### Yolcu Ekle

```http
POST /user/travellers
Authorization: Bearer {access_token}
```

**Request Body:**

```json
{
  "traveller_type": "adult",
  "title": "mr",
  "first_name": "Mehmet",
  "last_name": "Yılmaz",
  "date_of_birth": "1995-05-20",
  "gender": "male",
  "nationality": "TR",
  "passport_number": "U87654321",
  "passport_expiry": "2028-06-15",
  "tc_kimlik_no": "98765432109",
  "email": "mehmet@example.com",
  "phone": "+905559876543",
  "is_primary": false
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| traveller_type | enum | ✅ | `adult`, `child`, `infant` |
| title | enum | ❌ | `mr`, `mrs`, `ms`, `miss` |
| first_name | string | ✅ | Ad |
| last_name | string | ✅ | Soyad |
| date_of_birth | date | ❌ | Doğum tarihi |
| gender | enum | ❌ | `male`, `female` |
| nationality | string | ❌ | Uyruk kodu (TR, DE, US...) |
| passport_number | string | ❌ | Pasaport numarası |
| passport_expiry | date | ❌ | Pasaport geçerlilik tarihi |
| passport_country | string | ❌ | Pasaport ülkesi |
| tc_kimlik_no | string | ❌ | TC Kimlik No |
| email | string | ❌ | Email |
| phone | string | ❌ | Telefon |
| is_primary | boolean | ❌ | Ana yolcu mu? |

#### Yolcu Güncelle

```http
PUT /user/travellers/:id
Authorization: Bearer {access_token}
```

**Request Body:** (Tüm alanlar opsiyonel)

```json
{
  "phone": "+905551112233",
  "passport_expiry": "2029-01-01"
}
```

#### Yolcu Sil

```http
DELETE /user/travellers/:id
Authorization: Bearer {access_token}
```

### Bildirimler

#### Bildirim Listesi

```http
GET /user/notifications?unread_only=true&limit=20
Authorization: Bearer {access_token}
```

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| unread_only | boolean | Sadece okunmamışlar |
| limit | number | Limit |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Rezervasyonunuz Onaylandı",
      "message": "PX123456 numaralı rezervasyonunuz başarıyla tamamlandı.",
      "type": "booking",
      "action_url": "/bookings/PX123456",
      "is_read": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

#### Bildirimi Okundu İşaretle

```http
PUT /user/notifications/:id/read
Authorization: Bearer {access_token}
```

#### Tüm Bildirimleri Okundu İşaretle

```http
PUT /user/notifications/read-all
Authorization: Bearer {access_token}
```

### Ödeme Geçmişi

#### İşlem Listesi

```http
GET /user/transactions?limit=10&offset=0
Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_id": "uuid",
      "transaction_type": "payment",
      "amount": 2500.00,
      "currency": "TRY",
      "status": "completed",
      "payment_method": "credit_card",
      "card_last_four": "4567",
      "order_id": "ORD123456",
      "invoice_number": "INV-2024-001",
      "invoice_url": "https://...",
      "description": "PX123456 - Uçuş Rezervasyonu",
      "completed_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-15T09:58:00Z"
    }
  ]
}
```

#### İşlem Detayı

```http
GET /user/transactions/:id
Authorization: Bearer {access_token}
```

### Kullanıcı İndirim Kodları

#### Kullanıcıya Özel İndirimler

```http
GET /user/discounts?active_only=true
Authorization: Bearer {access_token}
```

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| active_only | boolean | Sadece aktif olanlar |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "OZEL2024",
      "name": "Özel İndirim",
      "description": "Size özel %15 indirim",
      "type": "percentage",
      "value": 15,
      "min_purchase_amount": 1000,
      "max_discount_amount": 500,
      "applies_to": "flight",
      "is_used": false,
      "expires_at": "2024-06-30T23:59:59Z"
    }
  ]
}
```

#### Kullanıcı İndirim Kodu Doğrula

```http
GET /user/discounts/validate/:code
Authorization: Bearer {access_token}
```

---

## Hata Yönetimi

### HTTP Status Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 400 | Geçersiz istek |
| 401 | Yetkisiz erişim |
| 404 | Bulunamadı |
| 429 | Rate limit aşıldı |
| 500 | Sunucu hatası |

### Hata Kodları

| Kod | Açıklama |
|-----|----------|
| `SIGNUP_ERROR` | Kayıt hatası |
| `SIGNIN_ERROR` | Giriş hatası |
| `SIGNOUT_ERROR` | Çıkış hatası |
| `REFRESH_ERROR` | Token yenileme hatası |
| `UNAUTHORIZED` | Yetkisiz erişim |
| `PROFILE_ERROR` | Profil işlem hatası |
| `FAVORITES_ERROR` | Favori işlem hatası |
| `TRAVELLERS_ERROR` | Yolcu işlem hatası |
| `NOTIFICATIONS_ERROR` | Bildirim işlem hatası |
| `TRANSACTIONS_ERROR` | İşlem hatası |
| `DISCOUNT_INVALID` | Geçersiz indirim kodu |
| `BLOG_NOT_FOUND` | Blog bulunamadı |
| `CAMPAIGN_NOT_FOUND` | Kampanya bulunamadı |

---

## Next.js Entegrasyon Örneği

### API Client - `lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }

    return data;
  }

  // Auth
  async signup(email: string, password: string, metadata?: Record<string, any>) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, metadata }),
    });
  }

  async signin(email: string, password: string) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signout() {
    return this.request('/auth/signout', { method: 'POST' });
  }

  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getUser() {
    return this.request('/auth/user');
  }

  // CMS
  async getBlogs(params?: { category?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/cms/blogs${query ? `?${query}` : ''}`);
  }

  async getBlog(slug: string) {
    return this.request(`/cms/blogs/${slug}`);
  }

  async getCampaigns(params?: { type?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/cms/campaigns${query ? `?${query}` : ''}`);
  }

  async getTrendHotels(limit = 6) {
    return this.request(`/cms/trends/hotels?limit=${limit}`);
  }

  async getTrendFlights(limit = 6) {
    return this.request(`/cms/trends/flights?limit=${limit}`);
  }

  async validateDiscount(code: string) {
    return this.request(`/cms/discounts/validate/${code}`);
  }

  // Contact
  async sendContact(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    phone?: string;
    category?: string;
    booking_reference?: string;
  }) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateProfile(data: Record<string, any>) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFavorites(type?: string) {
    return this.request(`/user/favorites${type ? `?type=${type}` : ''}`);
  }

  async addFavorite(data: { type: string; title: string; data: any }) {
    return this.request('/user/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeFavorite(id: string) {
    return this.request(`/user/favorites/${id}`, { method: 'DELETE' });
  }

  async getTravellers() {
    return this.request('/user/travellers');
  }

  async addTraveller(data: Record<string, any>) {
    return this.request('/user/travellers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTraveller(id: string, data: Record<string, any>) {
    return this.request(`/user/travellers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeTraveller(id: string) {
    return this.request(`/user/travellers/${id}`, { method: 'DELETE' });
  }

  async getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
    const query = new URLSearchParams({
      ...(params?.unreadOnly && { unread_only: 'true' }),
      ...(params?.limit && { limit: params.limit.toString() }),
    }).toString();
    return this.request(`/user/notifications${query ? `?${query}` : ''}`);
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/user/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsAsRead() {
    return this.request('/user/notifications/read-all', { method: 'PUT' });
  }

  async getTransactions(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/user/transactions${query ? `?${query}` : ''}`);
  }

  async getUserDiscounts(activeOnly = true) {
    return this.request(`/user/discounts?active_only=${activeOnly}`);
  }
}

export const api = new ApiClient(API_URL);
```

### Auth Context - `contexts/AuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage'dan session'ı yükle
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setSession(parsed);
      api.setToken(parsed.access_token);
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.getUser();
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      // Token geçersiz, temizle
      localStorage.removeItem('session');
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signin = async (email: string, password: string) => {
    const response = await api.signin(email, password);
    if (response.success && response.data) {
      const { user, session } = response.data;
      setUser(user);
      setSession(session);
      api.setToken(session.access_token);
      localStorage.setItem('session', JSON.stringify(session));
    }
  };

  const signup = async (email: string, password: string, metadata?: Record<string, any>) => {
    const response = await api.signup(email, password, metadata);
    if (response.success && response.data) {
      const { user, session } = response.data;
      setUser(user);
      if (session) {
        setSession(session);
        api.setToken(session.access_token);
        localStorage.setItem('session', JSON.stringify(session));
      }
    }
  };

  const signout = async () => {
    try {
      await api.signout();
    } finally {
      setUser(null);
      setSession(null);
      api.setToken(null);
      localStorage.removeItem('session');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signin, signup, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Kullanım Örnekleri

#### Sign In Form

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signin(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Şifre"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  );
}
```

#### Protected Page

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <h1>Profilim</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

#### Trend Hotels Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface TrendHotel {
  id: string;
  name: string;
  location: string;
  image_url: string;
  price_from: number;
  currency: string;
  star_rating: number;
}

export function TrendHotels() {
  const [hotels, setHotels] = useState<TrendHotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTrendHotels(6).then((response) => {
      if (response.success && response.data) {
        setHotels(response.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <section>
      <h2>Popüler Oteller</h2>
      <div className="grid grid-cols-3 gap-4">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="card">
            <img src={hotel.image_url} alt={hotel.name} />
            <h3>{hotel.name}</h3>
            <p>{hotel.location}</p>
            <span>{'⭐'.repeat(hotel.star_rating)}</span>
            <p>{hotel.price_from} {hotel.currency}'den başlayan</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Endpoint Özeti

### Public Endpoint'ler (Auth Gerektirmez)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/signup` | Kayıt ol |
| POST | `/auth/signin` | Giriş yap |
| POST | `/auth/refresh` | Token yenile |
| POST | `/auth/magic-link` | Magic link gönder |
| GET | `/cms/blogs` | Blog listesi |
| GET | `/cms/blogs/:slug` | Blog detayı |
| GET | `/cms/campaigns` | Kampanya listesi |
| GET | `/cms/campaigns/:slug` | Kampanya detayı |
| GET | `/cms/discounts` | İndirim listesi |
| GET | `/cms/discounts/validate/:code` | İndirim doğrula |
| GET | `/cms/trends/hotels` | Trend oteller |
| GET | `/cms/trends/flights` | Trend uçuşlar |
| POST | `/contact` | İletişim formu |

### Protected Endpoint'ler (Auth Gerektirir)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/signout` | Çıkış yap |
| GET | `/auth/user` | Kullanıcı bilgisi |
| GET | `/user/profile` | Profil getir |
| PUT | `/user/profile` | Profil güncelle |
| GET | `/user/favorites` | Favoriler |
| POST | `/user/favorites` | Favori ekle |
| DELETE | `/user/favorites/:id` | Favori sil |
| GET | `/user/travellers` | Yolcu listesi |
| GET | `/user/travellers/:id` | Yolcu detayı |
| POST | `/user/travellers` | Yolcu ekle |
| PUT | `/user/travellers/:id` | Yolcu güncelle |
| DELETE | `/user/travellers/:id` | Yolcu sil |
| GET | `/user/notifications` | Bildirimler |
| PUT | `/user/notifications/:id/read` | Bildirimi okundu işaretle |
| PUT | `/user/notifications/read-all` | Tümünü okundu işaretle |
| GET | `/user/transactions` | Ödeme geçmişi |
| GET | `/user/transactions/:id` | İşlem detayı |
| GET | `/user/discounts` | Kullanıcı indirimleri |
| GET | `/user/discounts/validate/:code` | Kullanıcı indirimi doğrula |

