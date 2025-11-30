# Supabase Frontend Entegrasyonu Rehberi

Bu dokümantasyon, iBilet web uygulaması için Supabase entegrasyonunu Next.js ile nasıl kullanacağınızı açıklar.

## İçindekiler

1. [Kurulum](#kurulum)
2. [Supabase Client Yapılandırması](#supabase-client-yapılandırması)
3. [Auth İşlemleri](#auth-işlemleri)
4. [Middleware ve Protected Routes](#middleware-ve-protected-routes)
5. [Veritabanı Tabloları](#veritabanı-tabloları)
6. [Public Veriler (Giriş Gerektirmeyen)](#public-veriler-giriş-gerektirmeyen)
7. [Protected Veriler (Giriş Gerektiren)](#protected-veriler-giriş-gerektiren)
8. [Real-time Subscriptions](#real-time-subscriptions)
9. [TypeScript Tipleri](#typescript-tipleri)

---

## Kurulum

### 1. Paketleri Yükle

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Environment Variables

`.env.local` dosyasına ekle:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bcrbwjjofwvaogpkwsgw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Supabase Client Yapılandırması

### `lib/supabase/client.ts` - Browser Client

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts` - Server Client

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component'te çağrıldıysa ignore et
          }
        },
      },
    }
  )
}
```

### `lib/supabase/middleware.ts` - Middleware Client

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected route'lar için kontrol
  const protectedPaths = ['/profile', '/bookings', '/favorites', '/notifications']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### `middleware.ts` - Root Middleware

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Auth İşlemleri

### Auth Hook - `hooks/useAuth.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Mevcut session'ı al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}
```

### Kayıt Ol (Sign Up)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      // Email onay linki gönderildi
      alert('Email adresinize onay linki gönderildi!')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="text"
        placeholder="Ad Soyad"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Şifre (min 6 karakter)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
      </button>
    </form>
  )
}
```

### Giriş Yap (Sign In)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/') // Ana sayfaya yönlendir
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignIn}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  )
}
```

### Çıkış Yap (Sign Out)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut}>
      Çıkış Yap
    </button>
  )
}
```

### Magic Link ile Giriş

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (!error) {
      setSent(true)
    }

    setLoading(false)
  }

  if (sent) {
    return <p>Email adresinize giriş linki gönderildi!</p>
  }

  return (
    <form onSubmit={handleMagicLink}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Magic Link Gönder'}
      </button>
    </form>
  )
}
```

### Auth Callback - `app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth hatası durumunda login sayfasına yönlendir
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
```

---

## Middleware ve Protected Routes

Protected sayfalar için middleware otomatik olarak giriş kontrolü yapar. Aşağıdaki path'ler korunmaktadır:

- `/profile` - Kullanıcı profili
- `/bookings` - Rezervasyonlar
- `/favorites` - Favoriler
- `/notifications` - Bildirimler

Giriş yapmamış kullanıcılar `/login` sayfasına yönlendirilir.

---

## Veritabanı Tabloları

### Public Tablolar (Herkes Okuyabilir)

| Tablo | Açıklama |
|-------|----------|
| `blogs` | Blog yazıları ve makaleler |
| `campaigns` | Kampanyalar ve promosyonlar |
| `discount` | Genel indirim kodları |
| `trend_hotel` | Popüler oteller |
| `trend_flight` | Popüler uçuşlar |
| `contact` | İletişim formu (INSERT only) |

### Protected Tablolar (Giriş Gerektirir)

| Tablo | Açıklama | Yetki |
|-------|----------|-------|
| `user_profiles` | Kullanıcı profili | Okuma/Yazma |
| `user_favorites` | Favoriler | Full CRUD |
| `notifications` | Bildirimler | Okuma |
| `user_transaction` | Ödeme geçmişi | Okuma |
| `user_discount` | Kullanıcı indirimleri | Okuma |
| `user_travellers` | Kayıtlı yolcular | Full CRUD |

---

## Public Veriler (Giriş Gerektirmeyen)

### Blogları Listele

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'

export default async function BlogsPage() {
  const supabase = await createClient()

  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Bloglar yüklenemedi:', error)
    return <p>Bir hata oluştu</p>
  }

  return (
    <div>
      <h1>Blog Yazıları</h1>
      {blogs?.map((blog) => (
        <article key={blog.id}>
          <h2>{blog.title}</h2>
          <p>{blog.excerpt}</p>
        </article>
      ))}
    </div>
  )
}
```

### Kampanyaları Listele

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .gte('end_date', new Date().toISOString())
    .order('priority', { ascending: false })

  return (
    <div>
      <h1>Kampanyalar</h1>
      {campaigns?.map((campaign) => (
        <div key={campaign.id}>
          <h2>{campaign.title}</h2>
          <p>{campaign.description}</p>
          {campaign.promo_code && (
            <span>Kod: {campaign.promo_code}</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Trend Oteller

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'

export default async function TrendHotels() {
  const supabase = await createClient()

  const { data: hotels } = await supabase
    .from('trend_hotel')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(6)

  return (
    <section>
      <h2>Popüler Oteller</h2>
      <div className="grid grid-cols-3 gap-4">
        {hotels?.map((hotel) => (
          <div key={hotel.id}>
            <img src={hotel.image_url} alt={hotel.name} />
            <h3>{hotel.name}</h3>
            <p>{hotel.location}</p>
            <span>{hotel.price_from} {hotel.currency}'den başlayan</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### Trend Uçuşlar

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'

export default async function TrendFlights() {
  const supabase = await createClient()

  const { data: flights } = await supabase
    .from('trend_flight')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(6)

  return (
    <section>
      <h2>Popüler Uçuşlar</h2>
      <div className="grid grid-cols-3 gap-4">
        {flights?.map((flight) => (
          <div key={flight.id}>
            <img src={flight.image_url} alt={`${flight.origin_city} - ${flight.destination_city}`} />
            <h3>{flight.origin_city} → {flight.destination_city}</h3>
            <span>{flight.price_from} {flight.currency}'den başlayan</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### İletişim Formu Gönder

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: 'general',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('contact')
      .insert([formData])

    if (!error) {
      setSuccess(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        category: 'general',
      })
    }

    setLoading(false)
  }

  if (success) {
    return <p>Mesajınız başarıyla gönderildi!</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Adınız"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="tel"
        placeholder="Telefon"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <select
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      >
        <option value="general">Genel</option>
        <option value="booking">Rezervasyon</option>
        <option value="refund">İade</option>
        <option value="complaint">Şikayet</option>
        <option value="suggestion">Öneri</option>
        <option value="other">Diğer</option>
      </select>
      <input
        type="text"
        placeholder="Konu"
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        required
      />
      <textarea
        placeholder="Mesajınız"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Gönder'}
      </button>
    </form>
  )
}
```

---

## Protected Veriler (Giriş Gerektiren)

### Kullanıcı Profili

```typescript
// Server Component - app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <h1>Profilim</h1>
      <p>Email: {profile?.email}</p>
      <p>Ad Soyad: {profile?.full_name}</p>
      <p>Telefon: {profile?.phone}</p>
    </div>
  )
}
```

### Profil Güncelleme

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'

interface ProfileData {
  full_name: string
  phone: string
  date_of_birth: string
  gender: string
  nationality: string
  address: string
  city: string
}

export function ProfileForm() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (data) {
      setProfile(data)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (!error) {
      alert('Profil güncellendi!')
    }

    setLoading(false)
  }

  if (!profile) return <p>Yükleniyor...</p>

  return (
    <form onSubmit={handleUpdate}>
      <input
        type="text"
        placeholder="Ad Soyad"
        value={profile.full_name || ''}
        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
      />
      <input
        type="tel"
        placeholder="Telefon"
        value={profile.phone || ''}
        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
      />
      <input
        type="date"
        placeholder="Doğum Tarihi"
        value={profile.date_of_birth || ''}
        onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
      />
      <select
        value={profile.gender || ''}
        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
      >
        <option value="">Cinsiyet Seçin</option>
        <option value="male">Erkek</option>
        <option value="female">Kadın</option>
        <option value="other">Diğer</option>
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}
```

### Kayıtlı Yolcular (Full CRUD)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'

interface Traveller {
  id: string
  traveller_type: 'adult' | 'child' | 'infant'
  title: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  nationality: string
  passport_number: string
  passport_expiry: string
  tc_kimlik_no: string
}

export function TravellersManager() {
  const { user } = useAuth()
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchTravellers()
  }, [user])

  const fetchTravellers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_travellers')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (data) setTravellers(data)
    setLoading(false)
  }

  // Yeni yolcu ekle
  const addTraveller = async (traveller: Omit<Traveller, 'id'>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_travellers')
      .insert([{ ...traveller, user_id: user!.id }])
      .select()
      .single()

    if (data) {
      setTravellers([data, ...travellers])
    }
    return { data, error }
  }

  // Yolcu güncelle
  const updateTraveller = async (id: string, updates: Partial<Traveller>) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_travellers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user!.id) // Güvenlik için user_id kontrolü

    if (!error) {
      setTravellers(travellers.map(t => t.id === id ? { ...t, ...updates } : t))
    }
    return { error }
  }

  // Yolcu sil
  const deleteTraveller = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_travellers')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)

    if (!error) {
      setTravellers(travellers.filter(t => t.id !== id))
    }
    return { error }
  }

  if (loading) return <p>Yükleniyor...</p>

  return (
    <div>
      <h2>Kayıtlı Yolcularım</h2>
      
      {travellers.map((traveller) => (
        <div key={traveller.id} className="traveller-card">
          <h3>{traveller.first_name} {traveller.last_name}</h3>
          <p>Tip: {traveller.traveller_type}</p>
          <p>Pasaport: {traveller.passport_number}</p>
          <button onClick={() => deleteTraveller(traveller.id)}>Sil</button>
        </div>
      ))}

      <TravellerForm onSubmit={addTraveller} />
    </div>
  )
}
```

### Favoriler

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'

interface Favorite {
  id: string
  type: 'flight' | 'hotel' | 'destination'
  title: string
  description: string
  image_url: string
  data: any
}

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchFavorites()
  }, [user])

  const fetchFavorites = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (data) setFavorites(data)
    setLoading(false)
  }

  const addFavorite = async (favorite: Omit<Favorite, 'id'>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_favorites')
      .insert([{ ...favorite, user_id: user!.id }])
      .select()
      .single()

    if (data) {
      setFavorites([data, ...favorites])
    }
    return { data, error }
  }

  const removeFavorite = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)

    if (!error) {
      setFavorites(favorites.filter(f => f.id !== id))
    }
    return { error }
  }

  const isFavorite = (type: string, data: any) => {
    return favorites.some(f => 
      f.type === type && JSON.stringify(f.data) === JSON.stringify(data)
    )
  }

  return { favorites, loading, addFavorite, removeFavorite, isFavorite }
}
```

### Bildirimler

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <div>
      <h1>Bildirimler ({unreadCount} okunmamış)</h1>
      {notifications?.map((notification) => (
        <div 
          key={notification.id}
          className={notification.is_read ? 'read' : 'unread'}
        >
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <span>{new Date(notification.created_at).toLocaleDateString('tr-TR')}</span>
        </div>
      ))}
    </div>
  )
}
```

### Bildirimi Okundu İşaretle

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export async function markAsRead(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('id', notificationId)

  return { error }
}
```

### Ödeme Geçmişi

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: transactions } = await supabase
    .from('user_transaction')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>Ödeme Geçmişim</h1>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th>Tutar</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.map((tx) => (
            <tr key={tx.id}>
              <td>{new Date(tx.created_at).toLocaleDateString('tr-TR')}</td>
              <td>{tx.description}</td>
              <td>{tx.amount} {tx.currency}</td>
              <td>{tx.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Kullanıcı İndirim Kodları

```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MyDiscountsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: discounts } = await supabase
    .from('user_discount')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  return (
    <div>
      <h1>İndirim Kodlarım</h1>
      {discounts?.map((discount) => (
        <div key={discount.id} className="discount-card">
          <h3>{discount.name}</h3>
          <code>{discount.code}</code>
          <p>
            {discount.type === 'percentage' 
              ? `%${discount.value} indirim`
              : `${discount.value} TL indirim`
            }
          </p>
          <span>
            Son kullanım: {new Date(discount.expires_at).toLocaleDateString('tr-TR')}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## Real-time Subscriptions

### Bildirimleri Canlı Dinle

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    // İlk verileri çek
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotifications(data)
      })

    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev])
          // Bildirim göster
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.message,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { notifications }
}
```

---

## TypeScript Tipleri

TypeScript tiplerini Supabase CLI ile otomatik oluşturabilirsiniz:

```bash
npx supabase gen types typescript --project-id bcrbwjjofwvaogpkwsgw > types/supabase.ts
```

Veya backend API'den TypeScript tiplerini alın:

```typescript
// types/supabase.ts
export type Database = {
  public: {
    Tables: {
      blogs: {
        Row: {
          id: string
          title: string
          slug: string
          content: string | null
          excerpt: string | null
          cover_image_url: string | null
          author: string | null
          category: string | null
          tags: string[] | null
          is_published: boolean
          published_at: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['blogs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['blogs']['Insert']>
      }
      // ... diğer tablolar
    }
  }
}
```

---

## API Endpoint'leri

Backend NestJS API üzerinden de auth işlemleri yapılabilir:

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/auth/signup` | POST | Kayıt ol |
| `/auth/signin` | POST | Giriş yap |
| `/auth/signout` | POST | Çıkış yap |
| `/auth/refresh` | POST | Token yenile |
| `/auth/magic-link` | POST | Magic link gönder |
| `/auth/user` | GET | Kullanıcı bilgileri |

### Backend API Örneği

```typescript
// Backend API ile giriş
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

const { data } = await response.json()
// data.user, data.session
```

---

## Güvenlik Önerileri

1. **RLS Aktif**: Tüm tablolarda Row Level Security aktif
2. **Service Role Key**: Sadece backend'de kullanılmalı, frontend'e asla eklenmemeli
3. **Anon Key**: Public key, frontend'de güvenle kullanılabilir
4. **Middleware**: Protected route'lar için mutlaka middleware kullanın
5. **Token Yenileme**: Session süreleri için refresh token mekanizmasını kullanın

---

## Sık Karşılaşılan Hatalar

### "Invalid JWT" Hatası
- Session süresi dolmuş olabilir
- `supabase.auth.refreshSession()` ile token yenileyin

### "Row Level Security" Hatası
- RLS politikaları kontrol edin
- Kullanıcı doğru authenticate olmuş mu kontrol edin

### "User not found" Hatası
- Session cookie'leri silinmiş olabilir
- Middleware'in doğru çalıştığından emin olun

