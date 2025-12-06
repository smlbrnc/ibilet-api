# Blog API - Frontend Kullanım Kılavuzu

> **Oluşturma Tarihi:** 6 Aralık 2025  
> **Base URL:** `/cms/blogs`  
> **Authentication:** Tüm endpoint'ler Public (Token gerekmez)

## İçindekiler

- [Genel Bilgiler](#genel-bilgiler)
- [Endpoint'ler](#endpointler)
  - [Blog Listesi](#1-blog-listesi)
  - [Blog Detayı](#2-blog-detayı)
  - [Blog Kategorileri](#3-blog-kategorileri)
  - [Kategoriye Göre Bloglar](#4-kategoriye-göre-bloglar)
  - [Öne Çıkan Bloglar](#5-öne-çıkan-bloglar)
  - [Son Yazılar](#6-son-yazılar)
- [Response Formatları](#response-formatları)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Hata Yönetimi](#hata-yönetimi)

---

## Genel Bilgiler

### Base URL
```
https://api.ibilet.com/cms/blogs
```

### Authentication
Tüm blog endpoint'leri **Public**'tir. Token gerekmez.

### Response Format
Tüm başarılı response'lar aşağıdaki formatta döner:
```typescript
{
  success: true,
  data: any,
  count?: number  // Pagination için
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

### 1. Blog Listesi

**Endpoint:** `GET /cms/blogs`

**Açıklama:** Tüm yayınlanmış blog yazılarını listeler. Kategori filtresi, sayfalama ve limit desteği vardır.

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `category` | string | Hayır | - | Blog yazısındaki kategori adı (örn: "Trendler", "İpuçları", "Destinasyonlar") |
| `limit` | number | Hayır | - | Sayfa başına kayıt sayısı |
| `offset` | number | Hayır | - | Atlama sayısı (pagination için) |

**Örnek İstekler:**

```typescript
// Tüm blogları getir
GET /cms/blogs

// Kategoriye göre filtrele
GET /cms/blogs?category=Trendler

// Sayfalama ile
GET /cms/blogs?limit=10&offset=0

// Kategori + Sayfalama
GET /cms/blogs?category=İpuçları&limit=5&offset=10
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "uuid",
      title: "2024'te Seyahat Trendleri",
      slug: "travel-tips-2024",
      content: "<p>...</p>",
      excerpt: "Bu yıl en popüler destinasyonlar...",
      cover_image_url: "/photos/camp-01y.webp",
      author: "ibilet Editör",
      category: "Trendler",
      tags: ["seyahat", "trendler", "2024"],
      read_time: 5,
      is_featured: true,
      is_published: true,
      published_at: "2024-11-15T00:00:00.000Z",
      view_count: 0,
      created_at: "2024-11-15T00:00:00.000Z",
      updated_at: "2024-11-15T00:00:00.000Z"
    }
  ],
  count: 6
}
```

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchBlogs = async (category?: string, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('limit', limit.toString());
  params.append('offset', ((page - 1) * limit).toString());

  const response = await fetch(`/cms/blogs?${params.toString()}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};
```

---

### 2. Blog Detayı

**Endpoint:** `GET /cms/blogs/:slug`

**Açıklama:** Slug'a göre tek bir blog yazısının detayını getirir. Her görüntülemede `view_count` otomatik artar.

**Path Parametreleri:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `slug` | string | Evet | Blog yazısının slug'ı (örn: "travel-tips-2024") |

**Örnek İstek:**

```typescript
GET /cms/blogs/travel-tips-2024
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "uuid",
    title: "2024'te Seyahat Trendleri",
    slug: "travel-tips-2024",
    content: "<p>2024 yılı seyahat dünyası...</p><h2>...</h2>",
    excerpt: "Bu yıl en popüler destinasyonlar...",
    cover_image_url: "/photos/camp-01y.webp",
    author: "ibilet Editör",
    category: "Trendler",
    tags: ["seyahat", "trendler", "2024"],
    read_time: 5,
    is_featured: true,
    is_published: true,
    published_at: "2024-11-15T00:00:00.000Z",
    view_count: 1,  // Her istekte artar
    created_at: "2024-11-15T00:00:00.000Z",
    updated_at: "2024-11-15T00:00:00.000Z"
  }
}
```

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchBlogBySlug = async (slug: string) => {
  const response = await fetch(`/cms/blogs/${slug}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};

// Next.js App Router ile
export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const blog = await fetchBlogBySlug(params.slug);
  return <div>{/* Blog içeriği */}</div>;
}
```

---

### 3. Blog Kategorileri

**Endpoint:** `GET /cms/blogs/categories`

**Açıklama:** Tüm blog kategorilerini listeler. Kategori kartları ve filtreleme için kullanılır.

**Query Parametreleri:** Yok

**Örnek İstek:**

```typescript
GET /cms/blogs/categories
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "destinations",
      title: "Destinasyon Rehberleri",
      subtitle: "Keşfet",
      description: "Popüler şehirler ve gizli hazineler.",
      image: "/photos/camp-04y.webp",
      created_at: "2024-11-15T00:00:00.000Z",
      updated_at: "2024-11-15T00:00:00.000Z"
    },
    {
      id: "tips",
      title: "Seyahat İpuçları",
      subtitle: "Öğren",
      description: "Deneyimli gezginlerden tavsiyeler.",
      image: "/photos/camp-02.webp",
      created_at: "2024-11-15T00:00:00.000Z",
      updated_at: "2024-11-15T00:00:00.000Z"
    },
    {
      id: "culture",
      title: "Kültür & Yemek",
      subtitle: "Yaşa",
      description: "Yerel lezzetler ve kültürel deneyimler.",
      image: "/photos/camp-01.webp",
      created_at: "2024-11-15T00:00:00.000Z",
      updated_at: "2024-11-15T00:00:00.000Z"
    }
  ]
}
```

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchBlogCategories = async () => {
  const response = await fetch('/cms/blogs/categories');
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};

// Kategori kartları için
const BlogCategories = async () => {
  const categories = await fetchBlogCategories();
  return (
    <div className="grid grid-cols-3 gap-4">
      {categories.map(category => (
        <Link key={category.id} href={`/blog/category/${category.id}`}>
          <img src={category.image} alt={category.title} />
          <h3>{category.title}</h3>
          <p>{category.subtitle}</p>
        </Link>
      ))}
    </div>
  );
};
```

---

### 4. Kategoriye Göre Bloglar

**Endpoint:** `GET /cms/blogs/categories/:id`

**Açıklama:** Kategori ID'sine göre blogları filtreler. `blog_category_mapping` tablosu üzerinden eşleştirme yapar.

**Path Parametreleri:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `id` | string | Evet | Kategori ID'si (örn: "destinations", "tips", "culture") |

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `limit` | number | Hayır | - | Sayfa başına kayıt sayısı |
| `offset` | number | Hayır | - | Atlama sayısı (pagination için) |

**Örnek İstekler:**

```typescript
// Destinasyon kategorisindeki tüm bloglar
GET /cms/blogs/categories/destinations

// Sayfalama ile
GET /cms/blogs/categories/tips?limit=5&offset=0
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "uuid",
      title: "Antalya Gezi Rehberi",
      slug: "antalya-guide",
      // ... diğer blog alanları
      category: "Destinasyonlar"  // Mapping'den gelen kategori adı
    }
  ],
  count: 2
}
```

**Kategori Mapping:**
- `destinations` → ["Destinasyonlar", "Keşif"]
- `tips` → ["İpuçları", "Trendler"]
- `culture` → ["Yemek", "Plajlar"]

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchBlogsByCategory = async (categoryId: string, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', ((page - 1) * limit).toString());

  const response = await fetch(`/cms/blogs/categories/${categoryId}?${params.toString()}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};

// Kategori sayfası için
export default async function CategoryPage({ params }: { params: { id: string } }) {
  const blogs = await fetchBlogsByCategory(params.id);
  return <div>{/* Blog listesi */}</div>;
}
```

---

### 5. Öne Çıkan Bloglar

**Endpoint:** `GET /cms/blogs/featured`

**Açıklama:** `is_featured: true` olan blogları getirir. Ana sayfa hero bölümü için kullanılır.

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `limit` | number | Hayır | 2 | Maksimum blog sayısı |

**Örnek İstekler:**

```typescript
// Varsayılan (2 blog)
GET /cms/blogs/featured

// Özel limit ile
GET /cms/blogs/featured?limit=3
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "uuid",
      title: "2024'te Seyahat Trendleri",
      slug: "travel-tips-2024",
      // ... diğer blog alanları
      is_featured: true
    },
    {
      id: "uuid",
      title: "Bütçe Dostu Seyahat",
      slug: "budget-travel",
      // ... diğer blog alanları
      is_featured: true
    }
  ]
}
```

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchFeaturedBlogs = async (limit = 2) => {
  const response = await fetch(`/cms/blogs/featured?limit=${limit}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};

// Ana sayfa hero bölümü için
const FeaturedBlogs = async () => {
  const blogs = await fetchFeaturedBlogs(2);
  return (
    <div className="grid grid-cols-2 gap-4">
      {blogs.map(blog => (
        <Link key={blog.id} href={`/blog/${blog.slug}`}>
          <img src={blog.cover_image_url} alt={blog.title} />
          <h2>{blog.title}</h2>
          <p>{blog.excerpt}</p>
        </Link>
      ))}
    </div>
  );
};
```

---

### 6. Son Yazılar

**Endpoint:** `GET /cms/blogs/recent`

**Açıklama:** En son yayınlanan blogları `published_at` tarihine göre sıralı getirir.

**Query Parametreleri:**

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
|-----------|-----|---------|------------|----------|
| `limit` | number | Hayır | 4 | Maksimum blog sayısı |

**Örnek İstekler:**

```typescript
// Varsayılan (4 blog)
GET /cms/blogs/recent

// Özel limit ile
GET /cms/blogs/recent?limit=6
```

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "uuid",
      title: "2024'te Seyahat Trendleri",
      slug: "travel-tips-2024",
      published_at: "2024-11-15T00:00:00.000Z",
      // ... diğer blog alanları
    },
    // ... diğer bloglar (tarihe göre sıralı)
  ]
}
```

**Frontend Kullanımı:**
```typescript
// React/Next.js örneği
const fetchRecentBlogs = async (limit = 4) => {
  const response = await fetch(`/cms/blogs/recent?limit=${limit}`);
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};

// Ana sayfa son yazılar bölümü için
const RecentBlogs = async () => {
  const blogs = await fetchRecentBlogs(4);
  return (
    <div className="grid grid-cols-4 gap-4">
      {blogs.map(blog => (
        <Link key={blog.id} href={`/blog/${blog.slug}`}>
          <img src={blog.cover_image_url} alt={blog.title} />
          <h3>{blog.title}</h3>
          <p>{blog.excerpt}</p>
          <span>{new Date(blog.published_at).toLocaleDateString('tr-TR')}</span>
        </Link>
      ))}
    </div>
  );
};
```

---

## Response Formatları

### Blog Objesi
```typescript
interface BlogPost {
  id: string;                    // UUID
  title: string;                 // Blog başlığı
  slug: string;                  // URL-friendly slug
  content: string;               // HTML içerik
  excerpt: string;               // Kısa açıklama
  cover_image_url: string;       // Kapak resmi URL'i
  author: string;                // Yazar adı
  category: string;              // Kategori adı (örn: "Trendler")
  tags: string[];                // Etiketler dizisi
  read_time: number;             // Okuma süresi (dakika)
  is_featured: boolean;          // Öne çıkan mı?
  is_published: boolean;         // Yayınlanmış mı?
  published_at: string;          // ISO 8601 tarih
  view_count: number;            // Görüntülenme sayısı
  created_at: string;            // ISO 8601 tarih
  updated_at: string;            // ISO 8601 tarih
}
```

### Kategori Objesi
```typescript
interface BlogCategory {
  id: string;                   // Kategori ID (örn: "destinations")
  title: string;                 // Kategori başlığı
  subtitle: string;              // Kısa alt başlık
  description: string;           // Kategori açıklaması
  image: string;                 // Kategori görseli URL'i
  created_at: string;            // ISO 8601 tarih
  updated_at: string;            // ISO 8601 tarih
}
```

---

## Kullanım Örnekleri

### TypeScript/React Hook Örneği
```typescript
// hooks/useBlogs.ts
import { useState, useEffect } from 'react';

interface UseBlogsOptions {
  category?: string;
  limit?: number;
  offset?: number;
}

export const useBlogs = (options?: UseBlogsOptions) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (options?.category) params.append('category', options.category);
        if (options?.limit) params.append('limit', options.limit.toString());
        if (options?.offset) params.append('offset', options.offset.toString());

        const response = await fetch(`/cms/blogs?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setBlogs(result.data);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [options?.category, options?.limit, options?.offset]);

  return { blogs, loading, error };
};
```

### Next.js Server Component Örneği
```typescript
// app/blog/page.tsx
export default async function BlogPage() {
  // Öne çıkan bloglar
  const featuredRes = await fetch(`${process.env.API_URL}/cms/blogs/featured?limit=2`);
  const featured = await featuredRes.json();

  // Son yazılar
  const recentRes = await fetch(`${process.env.API_URL}/cms/blogs/recent?limit=4`);
  const recent = await recentRes.json();

  // Kategoriler
  const categoriesRes = await fetch(`${process.env.API_URL}/cms/blogs/categories`);
  const categories = await categoriesRes.json();

  return (
    <div>
      <section>
        <h1>Öne Çıkan Yazılar</h1>
        {featured.success && featured.data.map(blog => (
          <article key={blog.id}>
            <h2>{blog.title}</h2>
            <p>{blog.excerpt}</p>
          </article>
        ))}
      </section>

      <section>
        <h2>Son Yazılar</h2>
        {recent.success && recent.data.map(blog => (
          <article key={blog.id}>
            <h3>{blog.title}</h3>
            <p>{blog.excerpt}</p>
          </article>
        ))}
      </section>

      <section>
        <h2>Kategoriler</h2>
        {categories.success && categories.data.map(category => (
          <div key={category.id}>
            <h3>{category.title}</h3>
            <p>{category.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

## Hata Yönetimi

### HTTP Status Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | Başarılı |
| 400 | Geçersiz parametre |
| 404 | Blog/Kategori bulunamadı |
| 500 | Sunucu hatası |

### Hata Response Formatı
```typescript
{
  success: false,
  code: "BLOG_NOT_FOUND",
  message: "Blog bulunamadı"
}
```

### Frontend Hata Yönetimi
```typescript
const fetchBlogBySlug = async (slug: string) => {
  try {
    const response = await fetch(`/cms/blogs/${slug}`);
    const result = await response.json();

    if (!result.success) {
      // Hata koduna göre işlem yap
      switch (result.code) {
        case 'BLOG_NOT_FOUND':
          // 404 sayfasına yönlendir
          redirect('/404');
          break;
        case 'BLOGS_ERROR':
          // Genel hata mesajı göster
          throw new Error(result.message);
        default:
          throw new Error('Bilinmeyen bir hata oluştu');
      }
    }

    return result.data;
  } catch (error) {
    console.error('Blog yüklenirken hata:', error);
    throw error;
  }
};
```

---

## Önemli Notlar

1. **Tarih Formatı:** Tüm tarihler ISO 8601 formatında döner. Frontend'de `new Date()` ile parse edilebilir.

2. **Content Alanı:** `content` alanı HTML formatındadır. Güvenlik için XSS koruması ekleyin (örn: `DOMPurify`).

3. **Image URL'leri:** Tüm image URL'leri relative path'dir. Base URL ile birleştirin.

4. **View Count:** Blog detayı endpoint'i her çağrıldığında `view_count` otomatik artar.

5. **Pagination:** `limit` ve `offset` parametreleri ile sayfalama yapılabilir. `count` alanı toplam kayıt sayısını verir.

6. **Kategori Mapping:** Kategori ID'leri ile blog yazılarındaki kategori adları `blog_category_mapping` tablosu üzerinden eşleştirilir.

---

## Hızlı Referans

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/cms/blogs` | GET | Blog listesi |
| `/cms/blogs/:slug` | GET | Blog detayı |
| `/cms/blogs/categories` | GET | Kategori listesi |
| `/cms/blogs/categories/:id` | GET | Kategoriye göre bloglar |
| `/cms/blogs/featured` | GET | Öne çıkan bloglar |
| `/cms/blogs/recent` | GET | Son yazılar |

