/**
 * ============================================
 * BLOG VERİ YÖNETİMİ
 * ============================================
 * 
 * Bu dosya blog yazıları ve kategoriler için merkezi veri kaynağıdır.
 * Şu anda hardcoded veriler içerir, ancak database migration sonrası
 * API'den veri çekilecek şekilde yapılandırılacaktır.
 * 
 * KULLANIM:
 * - Tüm blog sayfaları bu dosyadan veri çeker
 * - src/app/blog/page.tsx - Ana blog listesi
 * - src/app/blog/[slug]/page.tsx - Blog detay sayfası
 * - src/app/blog/category/[slug]/page.tsx - Kategori sayfası
 * 
 * DATABASE MIGRATION NOTLARI:
 * ============================================
 * 
 * Tablo: blogs
 * -----------
 * - id: UUID (PRIMARY KEY)
 * - title: VARCHAR(255) (NOT NULL) - Blog başlığı
 * - slug: VARCHAR(255) (UNIQUE, NOT NULL) - URL-friendly başlık
 * - content: TEXT (NOT NULL) - HTML içerik
 * - excerpt: VARCHAR(500) - Kısa açıklama
 * - cover_image_url: VARCHAR(500) (NOT NULL) - Kapak resmi URL'i
 * - author: VARCHAR(100) (NOT NULL) - Yazar adı
 * - category: VARCHAR(50) (NOT NULL) - Kategori adı
 * - read_time: INTEGER - Okuma süresi (dakika)
 * - published_at: TIMESTAMP - Yayın tarihi
 * - view_count: INTEGER DEFAULT 0 - Görüntülenme sayısı
 * - is_featured: BOOLEAN DEFAULT false - Öne çıkan yazı mı?
 * - created_at: TIMESTAMP DEFAULT NOW()
 * - updated_at: TIMESTAMP DEFAULT NOW()
 * 
 * Tablo: blog_tags
 * ----------------
 * - id: UUID (PRIMARY KEY)
 * - blog_id: UUID (FOREIGN KEY -> blogs.id)
 * - tag: VARCHAR(50) (NOT NULL)
 * - created_at: TIMESTAMP DEFAULT NOW()
 * 
 * Tablo: blog_categories
 * ---------------------
 * - id: VARCHAR(50) (PRIMARY KEY) - "destinations", "tips", "culture"
 * - title: VARCHAR(255) (NOT NULL) - "Destinasyon Rehberleri"
 * - subtitle: VARCHAR(50) - "Keşfet"
 * - description: VARCHAR(500) - Kategori açıklaması
 * - image: VARCHAR(500) - Kategori görseli URL'i
 * - created_at: TIMESTAMP DEFAULT NOW()
 * - updated_at: TIMESTAMP DEFAULT NOW()
 * 
 * Tablo: blog_category_mapping
 * ----------------------------
 * - id: UUID (PRIMARY KEY)
 * - category_id: VARCHAR(50) (FOREIGN KEY -> blog_categories.id)
 * - blog_category_name: VARCHAR(50) - Blog yazısındaki kategori adı
 * - created_at: TIMESTAMP DEFAULT NOW()
 * 
 * RESİM BOYUTLARI VE KULLANIM:
 * ============================================
 * 
 * 1. COVER IMAGE (cover_image_url):
 *    - Kullanım: Blog detay sayfası hero, öne çıkan kartlar, kategori kartları
 *    - Önerilen Boyut: 1200x800px (3:2 aspect ratio)
 *    - Format: WebP (önerilen), JPG, PNG
 *    - Max Dosya Boyutu: 500KB
 *    - Mobil: 800x533px
 *    - Desktop: 1200x800px
 * 
 * 2. CATEGORY IMAGE (blog_categories.image):
 *    - Kullanım: Kategori kartları, kategori sayfası hero
 *    - Önerilen Boyut: 600x400px (3:2 aspect ratio)
 *    - Format: WebP (önerilen), JPG, PNG
 *    - Max Dosya Boyutu: 200KB
 *    - Mobil: 300x200px
 *    - Desktop: 600x400px
 * 
 * 3. FEATURED POST IMAGE:
 *    - Kullanım: Ana blog sayfası öne çıkan kartlar
 *    - Boyut: cover_image_url ile aynı
 *    - Desktop: 274x300px (kart içinde)
 *    - Mobil: Full width, 200px yükseklik
 * 
 * 4. RECENT POST IMAGE:
 *    - Kullanım: Ana blog sayfası son yazılar grid
 *    - Boyut: cover_image_url ile aynı
 *    - Desktop: Grid item içinde 234px yükseklik
 *    - Mobil: Grid item içinde 200px yükseklik
 * 
 * 5. CATEGORY PAGE GRID IMAGE:
 *    - Kullanım: Kategori sayfası blog kartları
 *    - Boyut: cover_image_url ile aynı
 *    - Desktop: Grid item içinde 300px yükseklik (3 kolon)
 *    - Tablet: Grid item içinde 300px yükseklik (2 kolon)
 *    - Mobil: Grid item içinde 280px yükseklik (1 kolon)
 * 
 * PARAMETRELER VE ALAN AÇIKLAMALARI:
 * ============================================
 * 
 * BlogPost Interface:
 * ------------------
 * - id: string - Unique identifier (UUID formatında olacak)
 * - title: string - Blog başlığı (max 255 karakter)
 * - slug: string - URL-friendly versiyon (lowercase, tire ile ayrılmış)
 * - content: string - HTML formatında blog içeriği
 * - excerpt: string - Kısa açıklama (max 500 karakter, listelerde gösterilir)
 * - cover_image_url: string - Kapak resmi URL'i (public klasöründen veya CDN)
 * - author: string - Yazar adı (max 100 karakter)
 * - date: string - Yayın tarihi (format: "DD MMMM YYYY" - örn: "15 Kasım 2024")
 * - readTime: string - Okuma süresi (format: "X dk" - örn: "5 dk")
 * - category: string - Kategori adı (categoryMapping ile eşleşmeli)
 * - tags: string[] - Etiketler dizisi (max 10 etiket)
 * 
 * BlogCategory Interface:
 * ---------------------
 * - id: string - Kategori ID (slug formatında, unique)
 * - title: string - Kategori başlığı (max 255 karakter)
 * - subtitle: string - Kısa alt başlık (max 50 karakter, badge'de gösterilir)
 * - description: string - Kategori açıklaması (max 500 karakter)
 * - image: string - Kategori görseli URL'i
 * 
 * categoryMapping:
 * ----------------
 * - Kategori ID'leri ile blog yazılarındaki kategori adlarını eşleştirir
 * - Örnek: "destinations" -> ["Destinasyonlar", "Keşif"]
 * - Bu mapping database'de blog_category_mapping tablosunda tutulacak
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    cover_image_url: string;
    author: string;
    date: string;
    readTime: string;
    category: string;
    tags: string[];
  }
  
  export interface BlogCategory {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
  }
  
  // ============================================
  // BLOG POSTS DATA
  // ============================================
  
  export const blogPosts: BlogPost[] = [
    {
      id: "travel-tips-2024",
      title: "2024'te Seyahat Trendleri",
      slug: "travel-tips-2024",
      excerpt: "Bu yıl en popüler destinasyonlar ve seyahat ipuçları.",
      cover_image_url: "/photos/camp-01y.webp",
      author: "ibilet Editör",
      date: "15 Kasım 2024",
      readTime: "5 dk",
      category: "Trendler",
      tags: ["seyahat", "trendler", "2024"],
      content: `
        <p>2024 yılı seyahat dünyası için heyecan verici yenilikler ve trendler ile dolu. Bu yıl, gezginler için en popüler destinasyonlar ve dikkat edilmesi gereken önemli seyahat ipuçlarını sizler için derledik.</p>
        
        <h2>Sürdürülebilir Seyahat Öncelik Kazanıyor</h2>
        <p>Çevre dostu seyahat seçenekleri her geçen gün daha fazla önem kazanıyor. Yeşil oteller, karbon ayak izi düşük ulaşım alternatifleri ve yerel ekonomileri destekleyen turizm anlayışı 2024'ün öne çıkan trendleri arasında.</p>
        
        <h2>Dijital Nomad Hayatı Yükselişte</h2>
        <p>Uzaktan çalışma kültürünün yaygınlaşması ile birlikte, daha fazla insan iş ve seyahati birleştiriyor. Bali, Lizbon, ve Meksiko şehirleri dijital nomadlar için en popüler destinasyonlar arasında.</p>
        
        <h2>Wellness Turizmi Büyüyor</h2>
        <p>Mental ve fiziksel sağlığa odaklanan tatil konseptleri her yaştan gezginin ilgisini çekiyor. Yoga retreatle, termal tatiller ve doğa yürüyüşleri 2024'te en çok tercih edilen aktiviteler.</p>
        
        <h2>Teknolojinin Seyahatteki Rolü</h2>
        <p>Yapay zeka destekli seyahat planlama, akıllı bavullar ve anlık çeviri uygulamaları seyahat deneyimini kolaylaştırıyor.</p>
        
        <h2>Sonuç</h2>
        <p>2024 yılı, daha bilinçli, teknolojik ve esnek seyahat anlayışının hakim olacağı bir yıl olacak. Hangi trendi benimserseniz benimseyin, unutmayın ki seyahatin en önemli yanı keşfetme ve yeni deneyimler edinme tutkunuzdur.</p>
      `,
    },
    {
      id: "budget-travel",
      title: "Bütçe Dostu Seyahat",
      slug: "budget-travel",
      excerpt: "Az parayla unutulmaz tatil deneyimleri için rehber.",
      cover_image_url: "/photos/camp-05y.webp",
      author: "ibilet Editör",
      date: "10 Kasım 2024",
      readTime: "7 dk",
      category: "İpuçları",
      tags: ["bütçe", "tasarruf", "ipuçları"],
      content: `
        <p>Seyahat etmek için büyük bir bütçeye ihtiyacınız yok! Doğru planlama ve akıllı tercihlerle, az parayla unutulmaz tatil deneyimleri yaşayabilirsiniz.</p>
        
        <h2>Erken Rezervasyon Yapın</h2>
        <p>Uçak biletleri ve otel rezervasyonlarında erken rezervasyon büyük fark yaratır. Özellikle yüksek sezonda, 2-3 ay önceden rezervasyon yaparak %40'a varan indirimler elde edebilirsiniz.</p>
        
        <h2>Esnek Tarihler Seçin</h2>
        <p>Seyahat tarihlerinizde esnek olun. Hafta ortası uçuşlar genellikle hafta sonu uçuşlardan daha ucuzdur. Ayrıca, düşük sezonda seyahat ederek hem para hem de kalabalıktan tasarruf edebilirsiniz.</p>
        
        <h2>Yerel Gibi Yaşayın</h2>
        <p>Turistik restoranlar yerine yerel lokantalarda yemek yiyin. Toplu taşıma kullanın. Yerel pazarlardan alışveriş yapın. Bu sayede hem daha az para harcarsınız hem de yerel kültürü daha yakından tanırsınız.</p>
        
        <h2>Ücretsiz Aktivitelerden Yararlanın</h2>
        <p>Birçok şehirde ücretsiz müze günleri, bedava şehir turları ve açık hava etkinlikleri bulunur. Araştırma yaparak bu fırsatlardan yararlanın.</p>
        
        <h2>Konaklama Alternatifleri</h2>
        <p>Oteller yerine hostel, pansiyon veya Airbnb gibi alternatifleri değerlendirin. Özellikle uzun süreli konaklmalarda bu seçenekler bütçenize çok daha uygun olacaktır.</p>
        
        <h2>Sonuç</h2>
        <p>Bütçe dostu seyahat, fedakarlık değil, akıllıca planlama demektir. Bu ipuçlarını uygulayarak, cebinizden çok para çıkarmadan harika deneyimler yaşayabilirsiniz!</p>
      `,
    },
    {
      id: "antalya-guide",
      title: "Antalya Gezi Rehberi",
      slug: "antalya-guide",
      excerpt: "Türkiye'nin turizm başkentinde yapılacaklar.",
      cover_image_url: "/photos/antalya-tr.webp",
      author: "ibilet Editör",
      date: "12 Kasım 2024",
      readTime: "6 dk",
      category: "Destinasyonlar",
      tags: ["antalya", "türkiye", "gezi"],
      content: `
        <p>Türkiye'nin turizm başkenti Antalya, muhteşem plajları, tarihi yapıları ve eşsiz doğası ile her yıl milyonlarca turisti ağırlıyor. İşte Antalya'da mutlaka görmeniz ve yapmanız gerekenler!</p>
        
        <h2>Kaleiçi - Tarihi Merkez</h2>
        <p>Antalya'nın kalbi Kaleiçi, dar sokakları, tarihi evleri ve butik otelleriyle büyüleyici bir atmosfere sahip. Yivli Minare, Hadrian Kapısı ve eski liman mutlaka görülmesi gereken yerler.</p>
        
        <h2>Düden Şelaleleri</h2>
        <p>Şehir merkezine yakın konumdaki Düden Şelaleleri, doğa içinde huzurlu bir gün geçirmek için ideal. Özellikle Karpuzkaldıran'daki alt şelale, denize dökülen muhteşem manzarasıyla ünlüdür.</p>
        
        <h2>Antik Kentler</h2>
        <p>Aspendos, Perge ve Termessos antik kentleri, tarih meraklıları için kaçırılmayacak yerler. Aspendos'taki antik tiyatro, günümüzde hala konserlere ev sahipliği yapıyor.</p>
        
        <h2>Konyaaltı ve Lara Plajları</h2>
        <p>Antalya'nın en ünlü plajları olan Konyaaltı ve Lara, tertemiz denizi ve plaj keyfini doyasıya yaşayabileceğiniz yerler. Lara plajı özellikle aileler için ideal.</p>
        
        <h2>Antalya Akvaryumu</h2>
        <p>Dünyanın en büyük tünel akvaryumlarından birine sahip Antalya Akvaryumu, özellikle çocuklu aileler için harika bir aktivite.</p>
        
        <h2>Yerel Lezzetler</h2>
        <p>Piyaz, tandır kebabı ve hibeş gibi yöresel lezzetleri tatmadan Antalya'dan ayrılmayın!</p>
      `,
    },
    {
      id: "istanbul-hidden-gems",
      title: "İstanbul'un Gizli Köşeleri",
      slug: "istanbul-hidden-gems",
      excerpt: "Turistlerin bilmediği muhteşem mekanlar.",
      cover_image_url: "/photos/istanbul-tr.webp",
      author: "ibilet Editör",
      date: "8 Kasım 2024",
      readTime: "8 dk",
      category: "Keşif",
      tags: ["istanbul", "keşif", "gizli mekanlar"],
      content: `
        <p>İstanbul, Ayasofya ve Sultanahmet'in ötesinde keşfedilmeyi bekleyen harika mekanlarla dolu. İşte turistlerin genellikle bilmediği, yerel İstanbulluların favori yerlerinden bazıları!</p>
        
        <h2>Balat Sokakları</h2>
        <p>Renkli evleri ve bohemian havasıyla Balat, fotoğraf tutkunları için bir cennet. Eski Rum ve Yahudi mahallelerinin izlerini taşıyan bu bölgede, vintage kafeler ve antika dükkanları bulabilirsiniz.</p>
        
        <h2>Büyükada'nın Saklı Koyları</h2>
        <p>Büyükada'nın arka tarafındaki saklı koylarda, kalabalıktan uzak deniz keyfi yapabilirsiniz. Yaya ve bisiklet ile ulaşılabilen bu koylar, yerel halkın favori piknik noktaları.</p>
        
        <h2>Mihrimah Sultan Camii - Edirnekapı</h2>
        <p>Mimar Sinan'ın şaheserlerinden biri olan bu cami, Sultanahmet'teki kalabalıktan uzak, huzurlu bir atmosfere sahip. Özellikle günbatımında inanılmaz güzel.</p>
        
        <h2>Çamlıca Tepesi</h2>
        <p>İstanbul'un en yüksek tepelerinden biri olan Çamlıca, şehrin panoramik manzarasını sunar. Özellikle akşam üstü, şehir ışıklarının yanmaya başladığı saatlerde muhteşem.</p>
        
        <h2>Tarihi Yarımada'nın Arka Sokakları</h2>
        <p>Sultanahmet'in arka sokaklarında gezinirken, turistik yerlerin gölgesinde kalmış tarihi çeşmeleri, hamamları ve medreseleri keşfedebilirsiniz.</p>
        
        <h2>Yerel Kahvaltı Mekanları</h2>
        <p>Beşiktaş çarşısı, Kadıköy ve Kuzguncuk'taki yerel kahvaltı mekanlarında, otantik İstanbul kahvaltısını turistik fiyatların çok altında tadabilirsiniz.</p>
      `,
    },
    {
      id: "izmir-food-tour",
      title: "İzmir Lezzet Turu",
      slug: "izmir-food-tour",
      excerpt: "Ege'nin eşsiz mutfağını keşfedin.",
      cover_image_url: "/photos/izmir-tr.webp",
      author: "ibilet Editör",
      date: "5 Kasım 2024",
      readTime: "5 dk",
      category: "Yemek",
      tags: ["izmir", "yemek", "ege mutfağı"],
      content: `
        <p>İzmir, Ege mutfağının kalbi ve yemek kültürünün vazgeçilmezi. Bu lezzet turunda, İzmir'in en meşhur yemeklerini ve bunları nerede yiyebileceğinizi keşfedeceksiniz!</p>
        
        <h2>Boyoz - İzmir'in Simgesi</h2>
        <p>Sabah kahvaltısının vazgeçilmezi boyoz, İzmir'e has bir lezzet. Kemeraltı'ndaki esnaf lokantalarında, sıcacık boyozun keyfini çıkarın. Yanında mutlaka yumurta ve çay içmeyi unutmayın!</p>
        
        <h2>Kumru - Çeşme'nin Hediyesi</h2>
        <p>Çeşme'den İzmir'e geçen kumru, sucuklu, kaşarlı ve domatesli harika bir sandviç. Alsancak'taki meşhur kumrucular, gece yarısına kadar açıktır.</p>
        
        <h2>İzmir Köfte</h2>
        <p>Patates püresi ile servis edilen İzmir köfte, şehrin en bilinen yemeklerinden. Özellikle Bornova ve Karşıyaka taraflarındaki köfteciler, yıllardır aynı lezzeti sunuyor.</p>
        
        <h2>Sakızlı Muhallebi ve Dondurma</h2>
        <p>Alaçatı yolunda ya da Kordon boyunda, sakızlı muhallebi ve dondurmayı tatmadan İzmir'den ayrılmayın. Sakız aroması, sade muhallebiye bambaşka bir tat katıyor.</p>
        
        <h2>Ege Zeytinyağlıları</h2>
        <p>Enginar, taze bakla, barbunya gibi zeytinyağlılar, İzmir sofralarının olmazsa olmazı. Kemeraltı çarşısındaki lokantalar, ev yapımı zeytinyağlılarıyla ünlü.</p>
        
        <h2>Balık ve Rakı</h2>
        <p>Kordon boyunda, taze balık ve soğuk rakı keyfi İzmir deneyiminin en güzel yanlarından. Özellikle yaz akşamlarında, gün batımında keyifli bir akşam yemeği için ideal.</p>
      `,
    },
    {
      id: "bodrum-beaches",
      title: "Bodrum'un En İyi Plajları",
      slug: "bodrum-beaches",
      excerpt: "Masmavi sularda unutulmaz bir yaz.",
      cover_image_url: "/photos/bodrum-tr.webp",
      author: "ibilet Editör",
      date: "1 Kasım 2024",
      readTime: "4 dk",
      category: "Plajlar",
      tags: ["bodrum", "plaj", "deniz"],
      content: `
        <p>Bodrum, turkuaz rengi denizi ve muhteşem plajlarıyla her yaz milyonlarca tatilciyi ağırlıyor. İşte Bodrum'un en güzel plajları ve her birinin kendine özgü özellikleri!</p>
        
        <h2>Bitez Plajı</h2>
        <p>Sakin ve ailece bir tatil için ideal olan Bitez, sığ ve sakin denizi ile özellikle çocuklu aileler için mükemmel. Windsurfing ve kitesurfing için de harika koşullar sunuyor.</p>
        
        <h2>Gümüşlük</h2>
        <p>Bodrum'un en romantik köylerinden Gümüşlük, günbatımı manzarasıyla ünlü. Plajdaki balık restoranları, ayaklarınızı suya sokarak yemek yeme imkanı sunuyor.</p>
        
        <h2>Karaincir</h2>
        <p>Nispeten saklı kalmış bu küçük plaj, turkuaz suları ve çam ağaçlarıyla çevrili doğal güzelliğiyle dikkat çekiyor. Kalabalıktan kaçmak isteyenler için harika bir seçenek.</p>
        
        <h2>Yalıkavak Marina Plajları</h2>
        <p>Lüks ve şıklığın adresi Yalıkavak, beach clubları ile ünlü. Palmiye Beach ve Nusr-Et Beach gibi mekanlar, konforlu bir plaj deneyimi sunuyor.</p>
        
        <h2>Gümbet</h2>
        <p>Gece hayatı ve su sporları ile tanınan Gümbet, genç tatilcilerin favorisi. Jet ski, parasailing ve dalış gibi aktiviteler için ideal.</p>
        
        <h2>Türkbükü</h2>
        <p>Bodrum'un en prestijli bölgesi Türkbükü, ünlülerin de tercih ettiği beach clubları ve lüks restoranlarıyla biliniyor. Özel plajları ve hizmet kalitesiyle öne çıkıyor.</p>
      `,
    },
  ];
  
  // ============================================
  // BLOG CATEGORIES DATA
  // ============================================
  
  export const blogCategories: BlogCategory[] = [
    {
      id: "destinations",
      title: "Destinasyon Rehberleri",
      subtitle: "Keşfet",
      description: "Popüler şehirler ve gizli hazineler.",
      image: "/photos/camp-04y.webp",
    },
    {
      id: "tips",
      title: "Seyahat İpuçları",
      subtitle: "Öğren",
      description: "Deneyimli gezginlerden tavsiyeler.",
      image: "/photos/camp-02.webp",
    },
    {
      id: "culture",
      title: "Kültür & Yemek",
      subtitle: "Yaşa",
      description: "Yerel lezzetler ve kültürel deneyimler.",
      image: "/photos/camp-01.webp",
    },
  ];
  
  // ============================================
  // CATEGORY MAPPING
  // ============================================
  // Kategori ID'leri ile blog yazılarındaki kategori adlarını eşleştirir
  // Database'de blog_category_mapping tablosunda tutulacak
  
  export const categoryMapping: Record<string, string[]> = {
    "destinations": ["Destinasyonlar", "Keşif"],
    "tips": ["İpuçları", "Trendler"],
    "culture": ["Yemek", "Plajlar"],
  };
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  /**
   * Slug'a göre blog bulur
   * @param slug - Blog slug'ı
   * @returns BlogPost veya undefined
   */
  export function getBlogBySlug(slug: string): BlogPost | undefined {
    return blogPosts.find((post) => post.slug === slug);
  }
  
  /**
   * Kategoriye göre blogları filtreler
   * @param categoryId - Kategori ID'si (destinations, tips, culture)
   * @returns Filtrelenmiş blog dizisi
   */
  export function getBlogsByCategory(categoryId: string): BlogPost[] {
    const categories = categoryMapping[categoryId] || [];
    return blogPosts.filter((post) => categories.includes(post.category));
  }
  
  /**
   * Tüm blogları getirir
   * @returns Tüm blog dizisi
   */
  export function getAllBlogs(): BlogPost[] {
    return blogPosts;
  }
  
  /**
   * Öne çıkan blogları getirir (is_featured: true olanlar)
   * Şu anda ilk 2 blog'u döndürür, database'de is_featured alanına göre filtrelenecek
   * @param limit - Maksimum blog sayısı (varsayılan: 2)
   * @returns Öne çıkan blog dizisi
   */
  export function getFeaturedBlogs(limit: number = 2): BlogPost[] {
    // Database migration sonrası: blogPosts.filter(post => post.is_featured).slice(0, limit)
    return blogPosts.slice(0, limit);
  }
  
  /**
   * Son yazıları getirir (tarihe göre sıralanmış)
   * Şu anda tüm blogları döndürür, database'de published_at'e göre sıralanacak
   * @param limit - Maksimum blog sayısı (varsayılan: 4)
   * @returns Son yazılar dizisi
   */
  export function getRecentBlogs(limit: number = 4): BlogPost[] {
    // Database migration sonrası: blogPosts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, limit)
    return blogPosts.slice(0, limit);
  }
  