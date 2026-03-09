# Soru Takip Uygulaması (Next.js + Supabase + Vercel)

Bu proje mobil ve masaüstünde çalışan soru takip uygulamasıdır.

## Akış
- İlk açılışta tarih otomatik olarak bugünün tarihi olur.
- Kimlik sekmeleri: `Bahar`, `Leyla`, `Aile`
- Bahar/Leyla ekranı:
  - `Say` butonuna her basışta adım değeri sırayla değişir: `1 -> 5 -> 10 -> 20 -> 1`
  - Ders butonlarına her basışta, seçili adım kadar sayı artar.
  - `Temizle` taslak girişleri sıfırlar.
  - `Kaydet` taslak girişleri veritabanına yazar.
- Günlük kayıt mantığı:
  - Kayıtlar gün bazında tutulur (`entry_date`).
  - Gece 00:00 sonrası yeni gün başladığında yeni günlük kayıt ekranı otomatik başlar.
- Haftalık toplam:
  - Pazartesi başlangıç kabul edilerek günlüklerin toplamı hesaplanır.
- Aile ekranı:
  - Aynı gün için Bahar ve Leyla günlük/haftalık toplamları birlikte görünür.

## Dersler
- Bahar: `Mat`, `Fen`, `Tür`, `İnkılap`, `Din`, `Paragraf`
- Leyla: `Parag`, `Prob`, `Geo`, `Fizik`, `Kimya`, `Bio`

## Teknolojiler
- Next.js (App Router)
- Supabase (PostgreSQL + API)
- Vercel (deploy)

## Kurulum
1. Bağımlılıkları kur:
   ```bash
   npm install
   ```
2. `.env.example` dosyasını `.env.local` olarak kopyala ve değerleri gir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Supabase SQL Editor içinde `supabase/schema.sql` dosyasını çalıştır.
4. Geliştirme ortamını başlat:
   ```bash
   npm run dev
   ```
5. Tarayıcıda aç:
   - `http://localhost:3000`

## Vercel Deploy
1. Projeyi GitHub'a gönder.
2. Vercel'de "New Project" ile repo'yu import et.
3. Environment Variables bölümüne şu değişkenleri ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy et.

## Not
Bu sürüm MVP'dir. Üretim için kullanıcı bazlı auth + daha sıkı RLS policy önerilir.
