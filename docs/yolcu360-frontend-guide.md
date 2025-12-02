# Yolcu360 API - Frontend Kullanım Kılavuzu

## Base URL
```
https://your-api-url.com/yolcu360
```

## Endpoint'ler

### 1. Lokasyon Arama (Autocomplete)

**Endpoint:** `GET /yolcu360/locations`

**Query Parameters:**
- `query` (string, required, min 2 karakter): Aranacak lokasyon adı

**Örnek İstek:**
```typescript
// TypeScript/JavaScript
const searchLocations = async (query: string) => {
  const response = await fetch(
    `https://your-api-url.com/yolcu360/locations?query=${encodeURIComponent(query)}`
  );
  return response.json();
};

// Kullanım
const locations = await searchLocations('istanbul');
console.log(locations);
```

**React Hook Örneği:**
```typescript
import { useState, useEffect } from 'react';

const useLocationSearch = (query: string) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.length < 2) {
      setLocations([]);
      return;
    }

    const searchLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://your-api-url.com/yolcu360/locations?query=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error('Lokasyon arama başarısız');
        const data = await response.json();
        setLocations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return { locations, loading, error };
};

// Kullanım
function LocationAutocomplete() {
  const [searchQuery, setSearchQuery] = useState('');
  const { locations, loading, error } = useLocationSearch(searchQuery);

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Lokasyon ara..."
      />
      {loading && <p>Yükleniyor...</p>}
      {error && <p>Hata: {error}</p>}
      <ul>
        {locations.map((location: any) => (
          <li key={location.placeId}>
            {location.mainText} - {location.secondaryText}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Response Örneği:**
```json
[
  {
    "description": "Istanbul, İstanbul, Türkiye",
    "mainText": "Istanbul",
    "placeId": "ChIJawhoAASnyhQR0LABvJj-zOE",
    "secondaryText": "İstanbul, Türkiye",
    "types": ["geocode", "locality", "political"]
  },
  {
    "description": "Istanbul Airport, İstanbul, Türkiye",
    "mainText": "Istanbul Airport",
    "placeId": "ChIJ...",
    "secondaryText": "İstanbul, Türkiye",
    "types": ["airport", "establishment"]
  }
]
```

---

### 2. Lokasyon Detayı (Koordinat Bilgisi)

**Endpoint:** `GET /yolcu360/locations/:placeId`

**Path Parameters:**
- `placeId` (string, required): Lokasyon arama sonucundan gelen `placeId`

**Örnek İstek:**
```typescript
const getLocationDetails = async (placeId: string) => {
  const response = await fetch(
    `https://your-api-url.com/yolcu360/locations/${placeId}`
  );
  return response.json();
};

// Kullanım
const details = await getLocationDetails('ChIJawhoAASnyhQR0LABvJj-zOE');
console.log(details);
```

**React Örneği:**
```typescript
const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
const [locationDetails, setLocationDetails] = useState<any>(null);

useEffect(() => {
  if (!selectedPlaceId) return;

  const fetchDetails = async () => {
    try {
      const response = await fetch(
        `https://your-api-url.com/yolcu360/locations/${selectedPlaceId}`
      );
      const data = await response.json();
      setLocationDetails(data);
    } catch (error) {
      console.error('Lokasyon detayı alınamadı:', error);
    }
  };

  fetchDetails();
}, [selectedPlaceId]);
```

**Response Örneği:**
```json
{
  "placeId": "ChIJawhoAASnyhQR0LABvJj-zOE",
  "lat": 41.0082,
  "lon": 28.9784,
  "name": "Istanbul",
  "address": "Istanbul, İstanbul, Türkiye"
}
```

---

### 3. Araç Arama

**Endpoint:** `POST /yolcu360/search`

**Request Body:**
```typescript
interface CarSearchRequest {
  checkInDateTime: string;        // ISO 8601 format: "2024-12-15T10:00:00"
  checkOutDateTime: string;        // ISO 8601 format: "2024-12-20T10:00:00"
  checkInLocation: {
    lat: number;
    lon: number;
  };
  checkOutLocation: {
    lat: number;
    lon: number;
  };
  age?: string;                   // Örn: "30+", "25-30"
  country?: string;                // Örn: "TR"
  paymentType?: string;           // Örn: "creditCard"
}
```

**Örnek İstek:**
```typescript
const searchCars = async (searchParams: CarSearchRequest) => {
  const response = await fetch('https://your-api-url.com/yolcu360/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchParams),
  });
  return response.json();
};

// Kullanım
const cars = await searchCars({
  checkInDateTime: '2024-12-15T10:00:00',
  checkOutDateTime: '2024-12-20T10:00:00',
  checkInLocation: { lat: 41.0082, lon: 28.9784 },
  checkOutLocation: { lat: 36.8841, lon: 30.7056 },
  age: '30+',
  country: 'TR',
  paymentType: 'creditCard',
});
```

**React Form Örneği:**
```typescript
import { useState } from 'react';

interface CarSearchForm {
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  checkInLocation: { lat: number; lon: number } | null;
  checkOutLocation: { lat: number; lon: number } | null;
}

function CarSearchForm() {
  const [formData, setFormData] = useState<CarSearchForm>({
    checkInDate: '',
    checkInTime: '10:00',
    checkOutDate: '',
    checkOutTime: '10:00',
    checkInLocation: null,
    checkOutLocation: null,
  });
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!formData.checkInLocation || !formData.checkOutLocation) {
      alert('Lütfen alış ve teslim lokasyonlarını seçin');
      return;
    }

    setLoading(true);
    try {
      const checkInDateTime = `${formData.checkInDate}T${formData.checkInTime}:00`;
      const checkOutDateTime = `${formData.checkOutDate}T${formData.checkOutTime}:00`;

      const response = await fetch('https://your-api-url.com/yolcu360/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInDateTime,
          checkOutDateTime,
          checkInLocation: formData.checkInLocation,
          checkOutLocation: formData.checkOutLocation,
          age: '30+',
          country: 'TR',
          paymentType: 'creditCard',
        }),
      });

      if (!response.ok) throw new Error('Araç arama başarısız');
      const data = await response.json();
      setCars(data);
    } catch (error) {
      console.error('Araç arama hatası:', error);
      alert('Araç arama sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <label>Alış Tarihi:</label>
        <input
          type="date"
          value={formData.checkInDate}
          onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
        />
        <input
          type="time"
          value={formData.checkInTime}
          onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
        />
      </div>
      <div>
        <label>Teslim Tarihi:</label>
        <input
          type="date"
          value={formData.checkOutDate}
          onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
        />
        <input
          type="time"
          value={formData.checkOutTime}
          onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
        />
      </div>
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Aranıyor...' : 'Araç Ara'}
      </button>
      {cars.length > 0 && (
        <div>
          <h3>Bulunan Araçlar ({cars.length})</h3>
          {cars.map((car: any, index: number) => (
            <div key={index}>
              <h4>{car.name || car.model}</h4>
              <p>Fiyat: {car.price} {car.currency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Tam Örnek: Lokasyon Seçimi + Araç Arama

```typescript
import { useState } from 'react';

interface Location {
  placeId: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lon?: number;
}

function CarRentalSearch() {
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkOutQuery, setCheckOutQuery] = useState('');
  const [checkInLocations, setCheckInLocations] = useState<Location[]>([]);
  const [checkOutLocations, setCheckOutLocations] = useState<Location[]>([]);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Location | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Location | null>(null);
  const [checkInDetails, setCheckInDetails] = useState<any>(null);
  const [checkOutDetails, setCheckOutDetails] = useState<any>(null);

  // Lokasyon arama
  const searchLocations = async (query: string, type: 'checkIn' | 'checkOut') => {
    if (query.length < 2) {
      if (type === 'checkIn') setCheckInLocations([]);
      else setCheckOutLocations([]);
      return;
    }

    try {
      const response = await fetch(
        `https://your-api-url.com/yolcu360/locations?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (type === 'checkIn') setCheckInLocations(data);
      else setCheckOutLocations(data);
    } catch (error) {
      console.error('Lokasyon arama hatası:', error);
    }
  };

  // Lokasyon detayı al
  const fetchLocationDetails = async (placeId: string, type: 'checkIn' | 'checkOut') => {
    try {
      const response = await fetch(
        `https://your-api-url.com/yolcu360/locations/${placeId}`
      );
      const data = await response.json();
      if (type === 'checkIn') {
        setCheckInDetails(data);
        setSelectedCheckIn({ ...data, placeId });
      } else {
        setCheckOutDetails(data);
        setSelectedCheckOut({ ...data, placeId });
      }
    } catch (error) {
      console.error('Lokasyon detay hatası:', error);
    }
  };

  // Araç ara
  const handleCarSearch = async () => {
    if (!checkInDetails || !checkOutDetails) {
      alert('Lütfen alış ve teslim lokasyonlarını seçin');
      return;
    }

    // Araç arama işlemi...
  };

  return (
    <div>
      <div>
        <label>Alış Lokasyonu:</label>
        <input
          type="text"
          value={checkInQuery}
          onChange={(e) => {
            setCheckInQuery(e.target.value);
            searchLocations(e.target.value, 'checkIn');
          }}
          placeholder="Alış lokasyonu ara..."
        />
        {checkInLocations.length > 0 && (
          <ul>
            {checkInLocations.map((location) => (
              <li
                key={location.placeId}
                onClick={() => {
                  setCheckInQuery(location.mainText);
                  setCheckInLocations([]);
                  fetchLocationDetails(location.placeId, 'checkIn');
                }}
              >
                {location.mainText} - {location.secondaryText}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label>Teslim Lokasyonu:</label>
        <input
          type="text"
          value={checkOutQuery}
          onChange={(e) => {
            setCheckOutQuery(e.target.value);
            searchLocations(e.target.value, 'checkOut');
          }}
          placeholder="Teslim lokasyonu ara..."
        />
        {checkOutLocations.length > 0 && (
          <ul>
            {checkOutLocations.map((location) => (
              <li
                key={location.placeId}
                onClick={() => {
                  setCheckOutQuery(location.mainText);
                  setCheckOutLocations([]);
                  fetchLocationDetails(location.placeId, 'checkOut');
                }}
              >
                {location.mainText} - {location.secondaryText}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleCarSearch}>Araç Ara</button>
    </div>
  );
}
```

---

## Axios Kullanımı

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api-url.com/yolcu360',
});

// Lokasyon arama
export const searchLocations = (query: string) =>
  api.get('/locations', { params: { query } });

// Lokasyon detayı
export const getLocationDetails = (placeId: string) =>
  api.get(`/locations/${placeId}`);

// Araç arama
export const searchCars = (params: CarSearchRequest) =>
  api.post('/search', params);
```

---

## Hata Yönetimi

```typescript
const handleApiCall = async () => {
  try {
    const response = await fetch('https://your-api-url.com/yolcu360/locations?query=istanbul');
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Geçersiz istek');
      } else if (response.status === 401) {
        throw new Error('Yetkisiz erişim');
      } else if (response.status >= 500) {
        throw new Error('Sunucu hatası');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API hatası:', error);
    // Kullanıcıya hata mesajı göster
    throw error;
  }
};
```

---

## Notlar

1. **Debouncing:** Lokasyon arama için debounce kullanın (300-500ms) gereksiz istekleri önlemek için
2. **Loading States:** Tüm API çağrılarında loading state gösterin
3. **Error Handling:** Tüm hataları yakalayın ve kullanıcıya anlamlı mesajlar gösterin
4. **Caching:** Lokasyon sonuçlarını cache'leyebilirsiniz
5. **TypeScript:** Type safety için interface'leri tanımlayın

