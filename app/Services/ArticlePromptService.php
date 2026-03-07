<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Str;

/**
 * ArticlePromptService
 *
 * Single source of truth untuk semua AI prompt generator.
 * Setiap method mengembalikan prompt string yang siap dikirim ke AI.
 *
 * Article Types:
 *  - travel_guide   : Panduan travel praktis (default HomsJogja)
 *  - seo_article    : Artikel keyword-focused dengan depth topical
 *  - property_article: Artikel feature satu properti spesifik
 *  - event_article  : Artikel triggered by trending event/news
 */
class ArticlePromptService
{
    /**
     * Data konteks lokal Yogyakarta — diinjeksi ke semua prompt
     * agar AI punya "knowledge base" real untuk menulis.
     */
    private const JOGJA_CONTEXT = <<<CONTEXT
KONTEKS LOKAL YOGYAKARTA (gunakan data ini untuk membuat artikel lebih kredibel):
- Malioboro: jalan ikonik pusat Jogja, ±2 km dari Kraton
- Pantai Indrayanti: ±65 km selatan Jogja, tempuh ±1.5-2 jam
- Pantai Parangtritis: ±27 km selatan Jogja, tempuh ±45 menit
- Prambanan: ±17 km timur Jogja, tempuh ±30 menit
- Borobudur: ±40 km barat Jogja, tempuh ±1 jam
- Kaliurang: ±25 km utara Jogja, kaki Gunung Merapi, udara sejuk
- Goa Pindul: ±43 km tenggara Jogja (Gunungkidul)
- Museum Ullen Sentalu: ±25 km utara Jogja, area Kaliurang
- Estimasi harga villa rombongan Jogja: Rp 1.500.000 – Rp 4.500.000/malam
- Estimasi harga villa keluarga (2-4 kamar): Rp 600.000 – Rp 2.000.000/malam
- Kapasitas tipikal villa Jogja: 8–20 orang
- Kuliner wajib: Gudeg Bu Tjitro, Angkringan Lik Man, Bakmi Jawa Mbah Gito, Sate Klathak Pak Pong
CONTEXT;

    /**
     * Forbidden phrases — dilarang di semua tipe artikel
     */
    private const FORBIDDEN_PHRASES = 'Berdasarkan data, Dalam hal ini, Tentunya, Sejatinya, Dapat disimpulkan, Sebagai kesimpulan, Perlu diketahui bahwa, Tidak dapat dipungkiri';

    // =========================================================================
    // OUTLINE PROMPTS
    // =========================================================================

    /**
     * Build outline prompt berdasarkan article type
     */
    public function outlinePrompt(
        string $type,
        string $title,
        array $keywords,
        array $researchContext = []
    ): string {
        return match ($type) {
            'travel_guide' => $this->travelGuideOutlinePrompt($title, $keywords, $researchContext),
            'seo_article' => $this->seoArticleOutlinePrompt($title, $keywords, $researchContext),
            'property_article' => $this->propertyArticleOutlinePrompt($title, $keywords, $researchContext),
            'event_article' => $this->eventArticleOutlinePrompt($title, $keywords, $researchContext),
            default => $this->travelGuideOutlinePrompt($title, $keywords, $researchContext),
        };
    }

    /**
     * Build content prompt berdasarkan article type
     */
    public function contentPrompt(
        string $type,
        string $outline,
        array $keywords,
        array $properties = [],
        string $language = 'id',
        string $tone = 'casual',
        array $linkedArticles = []
    ): string {
        return match ($type) {
            'travel_guide' => $this->travelGuideContentPrompt($outline, $keywords, $properties, $language, $tone, $linkedArticles),
            'seo_article' => $this->seoArticleContentPrompt($outline, $keywords, $properties, $language, $tone, $linkedArticles),
            'property_article' => $this->propertyArticleContentPrompt($outline, $keywords, $properties, $language, $tone, $linkedArticles),
            'event_article' => $this->eventArticleContentPrompt($outline, $keywords, $properties, $language, $tone, $linkedArticles),
            default => $this->travelGuideContentPrompt($outline, $keywords, $properties, $language, $tone, $linkedArticles),
        };
    }

    // =========================================================================
    // TRAVEL GUIDE — Tipe artikel utama HomsJogja
    // =========================================================================

    private function travelGuideOutlinePrompt(string $title, array $keywords, array $researchContext): string
    {
        $kwStr = implode(', ', $keywords);
        $intent = $researchContext['search_intent'] ?? 'Transactional + Informational';
        $audience = $researchContext['target_audience_analysis'] ?? 'Wisatawan keluarga, rombongan, dan pasangan yang ingin menginap di Yogyakarta';
        $keyPoints = !empty($researchContext['key_points']) ? implode(', ', $researchContext['key_points']) : '';

        return <<<PROMPT
Kamu adalah pakar SEO content strategist untuk website sewa villa & homestay di Yogyakarta (HomsJogja.com).

TUGAS: Buat outline artikel travel guide praktis untuk:
Judul: "{$title}"
Keyword Target: {$kwStr}
Search Intent: {$intent}
Target Audience: {$audience}
{$keyPoints}

{$this->getJogjaContext()}

STRUKTUR WAJIB (ikuti PERSIS urutan ini):
## [Judul H2 menarik yang mencakup keyword utama]

### Hook Pembuka
- [1-2 hook bullet points: pertanyaan relatable atau situasi yang dialami wisatawan]

## 1. Mengapa [Topik] Menjadi Pilihan Utama Wisatawan Jogja
- [Popularitas destinasi, angka kunjungan, tren wisata]

## 2. Area/Lokasi Terbaik [Topik] di Jogja
### [Area 1 + nama wisata terdekat + jarak real dalam km]
### [Area 2 + nama wisata terdekat + jarak real dalam km]  
### [Area 3 + nama wisata terdekat + jarak real dalam km]

## 3. Rekomendasi [Villa/Homestay] Terbaik untuk [Topik]
### [Tipe untuk keluarga — kapasitas, harga estimasi]
### [Tipe untuk rombongan/group — kapasitas, harga estimasi]
### [Tipe budget-friendly — harga estimasi]

## 4. Estimasi Budget Lengkap [Topik] di Jogja
- [Tabel atau list: harga villa, transportasi, makan, tiket wisata]

## 5. Tips Memilih dan Booking [Villa/Homestay] yang Tepat
- [5-7 tips praktis anti-rugi]

## 6. Panduan Transportasi dan Aksesibilitas
- [Cara sampai, pilihan transportasi, estimasi waktu]

## 7. Kuliner Wajib di Sekitar Area Menginap
- [2-3 rekomendasi kuliner legendary Jogja dekat area villa]

## CTA Section: Temukan Villa Ideal Kamu di HomsJogja
- [Bullet benefits HomsJogja + ajakan cek ketersediaan]

### FAQ
- [3-5 pertanyaan yang paling sering dicari tentang topik ini]

ATURAN PENTING:
- HANYA gunakan H2 (##) dan H3 (###) — DILARANG roman numeral (I, II, III) atau huruf (A, B, C)
- Setiap H2 harus mengandung keyword atau sinonim secara natural
- Sertakan data real: jarak km, estimasi harga IDR, kapasitas orang
- Output: outline saja, bukan artikel lengkap
- Bahasa: Bahasa Indonesia yang conversational

SEBELUM outline, output: "LSI Keywords: [5-7 keyword LSI relevan dipisah koma]"
Lalu langsung mulai outline tanpa teks pembuka.
PROMPT;
    }

    private function travelGuideContentPrompt(string $outline, array $keywords, array $properties, string $language, string $tone, array $linkedArticles = []): string
    {
        $kwStr = implode(', ', $keywords);
        $langInstr = $language === 'id' ? 'Bahasa Indonesia yang conversational dan hangat' : 'English';
        $toneInstr = $tone === 'casual'
            ? 'seperti teman lokal yang memberi saran tulus, bukan robot atau copywriter kaku'
            : 'profesional namun tetap ramah dan mudah dipahami';

        $propertyBlock = $this->buildPropertyBlock($properties);
        $conversionBlock = $this->buildConversionBlock($properties);
        $internalLinksBlock = $this->buildInternalLinksBlock($linkedArticles);
        $imageGenBlock = $this->buildImageGenerationBlock();

        return <<<PROMPT
Kamu adalah travel writer Indonesia berpengalaman yang SEKALIGUS mahir SEO dan marketing homestay/villa.

TUGAS: Tulis artikel travel guide lengkap dalam {$langInstr}.
Gunakan outline berikut sebagai KERANGKA (bukan untuk disalin kata per kata):

{$outline}

KEYWORD TARGET: {$kwStr}
{$propertyBlock}
{$internalLinksBlock}
{$imageGenBlock}

{$this->getJogjaContext()}

===[ ALUR WAJIB — TRAVEL STORY FLOW ]===

1. HOOK (paragraf 1-2)
   → Buka dengan situasi relatable: wisatawan yang bingung cari villa, keseruan rencana liburan keluarga, atau pengalaman pertama ke Jogja.
   → Gunakan kalimat tanya yang bikin pembaca merasa "ini gue banget!"
   → Contoh: "Pernah nggak sih, kamu udah semangat banget planning liburan ke Jogja bareng keluarga, tapi malah pusing sendiri milih tempat menginap?"

2. PROBLEM (1-2 paragraf)
   → Gambarkan pain point nyata: hotel penuh saat long weekend, harga mahal, lokasi jauh dari wisata.
   → Bangun empati. Pembaca harus merasa "masalah ini memang nyata."

3. SOLUTION (1 paragraf)
   → Perkenalkan villa/homestay sebagai solusi cerdas yang sering terlewatkan.
   → Natural, tidak jualan. Seperti teman yang kasih saran.

4. GUIDE / CONTENT UTAMA
   → Ikuti struktur dari outline: lokasi, rekomendasi, estimasi harga, tips.
   → Sisipkan data real dari Konteks Yogyakarta (jarak km, harga IDR, kapasitas).
   → Sebutkan minimal 2 kuliner legendary Jogja secara natural dalam narasi.
   → Jika ada properti HomsJogja: sisipkan sebagai rekomendasi natural, bukan hard sell.

5. TIPS (poin-poin ringkas)
   → Tips booking yang tidak klise. Spesifik dan actionable.

6. CONVERSION BLOCK (WAJIB, di bagian akhir sebelum FAQ)
   → Tulis blok khusus dengan format ini:

---
**Cari Villa untuk [Topik] di Jogja?**

HomsJogja punya pilihan yang pas buat kamu:
✔ Villa kapasitas 8–20 orang, cocok untuk rombongan dan keluarga besar
✔ Lokasi strategis dekat wisata utama Jogja
✔ Harga langsung dari pemilik, transparan tanpa biaya tersembunyi
✔ Booking mudah & bisa konsultasi dulu

[Lihat pilihan villa tersedia →](https://homsjogja.com/properties)
---

7. FAQ (3-5 Q&A)
   → Jawab pertanyaan yang paling sering dicari di Google tentang topik ini.
   → Format: **Q: ...?** kemudian **A: ...**

===[ ATURAN PENULISAN KETAT ]===
- Nada: {$toneInstr}
- MINIMUM 800 kata
- DILARANG: {$this->getForbiddenPhrases()}
- DILARANG: pembuka seperti "Tentu!", "Berikut adalah artikel...", "Sebagai travel writer..."
- WAJIB: bold keyword penting (gunakan **keyword**) tapi jangan berlebihan
- WAJIB: heading H2 (##) dan H3 (###) — bukan roman numeral
- WAJIB: data real (jarak, harga, kapasitas) minimal 3 kali dalam artikel
- WAJIB: internal mention minimal 1 area wisata Jogja lainnya yang relevan
- LANGSUNG mulai dengan paragraf pertama artikel — tanpa judul di baris pertama
PROMPT;
    }

    // =========================================================================
    // SEO ARTICLE — Keyword depth, topical authority
    // =========================================================================

    private function seoArticleOutlinePrompt(string $title, array $keywords, array $researchContext): string
    {
        $kwStr = implode(', ', $keywords);
        $intent = $researchContext['search_intent'] ?? 'Informational';
        $points = !empty($researchContext['key_points']) ? implode("\n- ", $researchContext['key_points']) : '';

        return <<<PROMPT
Kamu adalah SEO content strategist spesialis topical authority untuk niche travel & hospitality.

TUGAS: Buat outline artikel SEO mendalam (long-form, pillar content) untuk:
Judul: "{$title}"
Keyword Utama: {$kwStr}
Search Intent: {$intent}
Poin Kunci yang HARUS Dicakup:
{$points}

{$this->getJogjaContext()}

STRUKTUR OUTLINE (SEO-Optimized):
## [H2 dengan keyword utama]

### Definisi / Konteks Singkat
- [Apa, mengapa relevan bagi pembaca]

## [Subtopik 1 — H2 dengan LSI keyword]
### [Sub-subtopik H3]
### [Sub-subtopik H3]

## [Subtopik 2 — H2 dengan LSI keyword]
### [Sub-subtopik H3]
### [Sub-subtopik H3]

## [Subtopik 3 — Perbandingan atau Data]
- [Tabel atau list dengan data konkret]

## Rekomendasi Praktis untuk Pembaca
### [Rekomendasi spesifik 1]
### [Rekomendasi spesifik 2]

## FAQ — Pertanyaan Yang Paling Sering Dicari
- [5-7 FAQ dengan search intent berbeda]

## Kesimpulan + CTA
- [Summary + ajakan action yang relevan]

ATURAN:
- Gunakan HANYA H2 (##) dan H3 (###)
- Sertakan data kuantitatif (angka, persentase, jarak, harga) di setiap section
- Outline harus menjawab minimal 4 angle search intent: apa, di mana, berapa, bagaimana
- Bahasa Indonesia

Output dimulai dengan: "LSI Keywords: [7-10 keyword LSI]"
Lalu langsung outline.
PROMPT;
    }

    private function seoArticleContentPrompt(string $outline, array $keywords, array $properties, string $language, string $tone, array $linkedArticles = []): string
    {
        $kwStr = implode(', ', $keywords);
        $langInstr = $language === 'id' ? 'Bahasa Indonesia yang informatif namun mudah dipahami' : 'English';

        $propertyBlock = $this->buildPropertyBlock($properties);
        $internalLinksBlock = $this->buildInternalLinksBlock($linkedArticles);
        $imageGenBlock = $this->buildImageGenerationBlock();

        return <<<PROMPT
Kamu adalah SEO content writer berpengalaman dengan spesialisasi travel & hospitality Indonesia.

TUGAS: Tulis artikel SEO mendalam dalam {$langInstr} berdasarkan outline ini:

{$outline}

KEYWORD TARGET: {$kwStr}
{$propertyBlock}
{$internalLinksBlock}
{$imageGenBlock}

{$this->getJogjaContext()}

===[ ATURAN PENULISAN SEO ]===
- FORMAT: Ikuti H2/H3 dari outline. WAJIB ada FAQ section (min 5 Q&A) dalam format **Q: ...** / **A: ...**
- DEPTH: Setiap H2 section harus TUNTAS menjawab angle-nya (jangan setengah-setengah)
- DATA: Sertakan minimal 4 data konkret (harga IDR, jarak km, kapasitas, waktu tempuh)
- KEYWORD: Keyword utama wajib ada di paragraf pertama, H2 pertama, dan 3x dalam body
- LSI: Gunakan variasi keyword secara natural (sinonim, long-tail)
- LINKS: Jika ada properti HomsJogja, sisipkan sebagai natural recommendation
- MINIMUM: 1000 kata
- DILARANG: {$this->getForbiddenPhrases()}
- DILARANG: Heading roman numeral atau huruf kapital (I, II, A, B)
- LANGSUNG mulai konten — tanpa intro "Berikut artikel..." dsb.
PROMPT;
    }

    // =========================================================================
    // PROPERTY ARTICLE — Feature satu properti
    // =========================================================================

    private function propertyArticleOutlinePrompt(string $title, array $keywords, array $researchContext): string
    {
        $kwStr = implode(', ', $keywords);

        return <<<PROMPT
Kamu adalah copywriter spesialis hospitality & property marketing untuk HomsJogja.

TUGAS: Buat outline artikel property feature (soft-sell) untuk:
Judul: "{$title}"
Keyword: {$kwStr}

{$this->getJogjaContext()}

STRUKTUR OUTLINE:
## Hook: Pengalaman Pertama Tamu di [Nama Properti]
- [Cerita mini atau deskripsi imajinatif yang bikin pembaca penasaran]

## Kenapa [Nama Properti] Jadi Pilihan Favorit di Jogja
### Lokasi Strategis: [Nama properti] vs Alternatif Lain
### Fasilitas yang Bikin Betah (Plus Detailnya)
### Kapasitas dan Kesesuaian untuk Berbagai Grup

## Pengalaman Menginap Sehari Penuh di [Nama Properti]
### Pagi: [Aktivitas / suasana pagi di properti]
### Siang: [Day trip ke wisata sekitar]
### Malam: [Aktivitas malam / kuliner]

## Estimasi Budget Menginap di [Nama Properti]
- [Breakdown biaya: villa, makan, transportasi, wisata]

## Review dan Keunggulan Dibanding Kompetitor
### Apa yang Tidak Bisa Kamu Dapat di Hotel
### Apa yang Membuat Tamu Selalu Kembali

## Tips Booking dan Persiapan Sebelum Datang
- [5 tips spesifik untuk tamu baru]

## Cara Booking [Nama Properti] di HomsJogja
- [CTA step-by-step + link booking]

ATURAN:
- HANYA H2 dan H3
- Nada: warm, personal, seperti rekomendasi teman
- Sertakan data real: jarak ke 3 wisata populer, harga villa

Output dimulai dengan: "LSI Keywords: [5-7 keyword LSI]"
PROMPT;
    }

    private function propertyArticleContentPrompt(string $outline, array $keywords, array $properties, string $language, string $tone, array $linkedArticles = []): string
    {
        $kwStr = implode(', ', $keywords);
        $langInstr = $language === 'id' ? 'Bahasa Indonesia yang warm dan personal' : 'English';
        $propNames = implode(', ', array_column($properties, 'name'));

        $propertyBlock = $this->buildPropertyBlock($properties, true); // detailed mode
        $internalLinksBlock = $this->buildInternalLinksBlock($linkedArticles);
        $imageGenBlock = $this->buildImageGenerationBlock();

        return <<<PROMPT
Kamu adalah travel blogger Indonesia yang menulis pengalaman menginap di villa/homestay Jogja.
Gaya tulisan: personal, storytelling, bikin pembaca ingin langsung booking.

TUGAS: Tulis artikel property feature dalam {$langInstr} tentang: {$propNames}
Gunakan outline ini sebagai kerangka:

{$outline}

KEYWORD TARGET: {$kwStr}
{$propertyBlock}
{$internalLinksBlock}
{$imageGenBlock}

{$this->getJogjaContext()}

===[ PENDEKATAN PENULISAN ]===
- SHOW, DON'T TELL: Jangan bilang "properti ini nyaman". Gambarkan: "Bayangkan bangun tidur, langsung buka jendela kamar dan lihat hamparan sawah hijau..."
- SENSORY DETAILS: Suara, visual, aroma, tekstur — buat pembaca merasakan pengalaman sebelum datang
- MICRO-STORIES: 2-3 cerita kecil dari skenario tamu (keluarga, pasangan, rombongan geng)
- USP HIGHLIGHT: Setiap fasilitas unggulan → jelaskan MENGAPA itu penting bagi tamu
- CTA NATURAL: Sisipkan 2-3 "soft CTA" dalam narasi, plus 1 CTA tegas di akhir

===[ CONVERSION BLOCK — WAJIB DI AKHIR ]===
---
**Siap Rasakan Pengalaman Menginap di {$propNames}?**

✔ Tersedia untuk keluarga, pasangan, dan rombongan
✔ Booking langsung via HomsJogja — harga terbaik, tanpa markup
✔ Tim HomsJogja siap bantu konsultasi pilihan villa yang tepat

[Cek Ketersediaan & Booking Sekarang →](https://homsjogja.com/properties)
---

ATURAN PENULISAN:
- MINIMUM 800 kata
- HANYA H2 (##) dan H3 (###)
- DILARANG: {$this->getForbiddenPhrases()}
- LANGSUNG mulai konten — tanpa "Berikut artikel..." dsb.
PROMPT;
    }

    // =========================================================================
    // EVENT ARTICLE — Triggered by trending news/event
    // =========================================================================

    private function eventArticleOutlinePrompt(string $title, array $keywords, array $researchContext): string
    {
        $kwStr = implode(', ', $keywords);
        $travelerAngle = $researchContext['traveler_angle'] ?? 'Wisatawan yang mengunjungi Jogja saat event berlangsung';

        return <<<PROMPT
Kamu adalah travel content editor yang ahli menciptakan artikel tepat waktu (timely content) untuk blog homestay/villa.

TUGAS: Buat outline artikel event-triggered untuk:
Judul: "{$title}"
Keyword: {$kwStr}
Traveler Angle: {$travelerAngle}

{$this->getJogjaContext()}

STRUKTUR OUTLINE:
## Hook: [Event/Tren] yang Bikin Jogja Makin Ramai
- [Gambarkan situasi: antusiasme wisatawan, keramaian yang terjadi]

## Apa yang Perlu Kamu Tahu tentang [Event/Tren] Ini
### Kapan dan Di Mana Berlangsung
### Mengapa Ini Menarik bagi Wisatawan

## Dampaknya: Hotel Penuh, Harga Naik, Akses Padat
- [Problem yang dialami wisatawan yang tidak siap]

## Solusi Cerdas: Menginap di Villa/Homestay Saat [Event]
### Keuntungan Villa vs Hotel saat Event Ramai
### Area Strategis untuk Menginap Saat [Event]

## Rekomendasi Tempat Menginap untuk [Event] di Jogja
### [Tipe villa untuk keluarga]
### [Tipe villa untuk rombongan]

## Tips Persiapan Liburan ke Jogja Saat [Event]
- [Booking awal, estimasi biaya, tips transportasi]

## CTA: Jangan Sampai Kehabisan Villa Saat [Event]!
- [Urgency + link HomsJogja]

ATURAN: HANYA H2/H3, data real, bahasa Indonesia casual.
Output dimulai dengan: "LSI Keywords: [5-7 keyword]"
PROMPT;
    }

    private function eventArticleContentPrompt(string $outline, array $keywords, array $properties, string $language, string $tone, array $linkedArticles = []): string
    {
        $kwStr = implode(', ', $keywords);
        $langInstr = $language === 'id' ? 'Bahasa Indonesia santai dan urgent' : 'English';

        $propertyBlock = $this->buildPropertyBlock($properties);
        $internalLinksBlock = $this->buildInternalLinksBlock($linkedArticles);
        $imageGenBlock = $this->buildImageGenerationBlock();

        return <<<PROMPT
Kamu adalah travel content writer yang ahli membuat artikel timely (event-driven) untuk blog homestay/villa Jogja.
Tujuan: Menangkap wisatawan yang sedang merencanakan kunjungan ke Jogja untuk event/tren tertentu.

TUGAS: Tulis artikel event-driven dalam {$langInstr} berdasarkan outline:

{$outline}

KEYWORD TARGET: {$kwStr}
{$propertyBlock}
{$internalLinksBlock}
{$imageGenBlock}

{$this->getJogjaContext()}

===[ ALUR WAJIB ]===
1. HOOK TIMELY: Buka dengan konteks event/tren yang relevan, bikin pembaca merasa "ini tentang gue!"
2. PROBLEM URGENCY: Gambarkan masalah nyata (hotel penuh, harga melonjak) dengan bahasa yang membangun urgensi
3. SOLUTION: Tawarkan villa/homestay sebagai solusi cerdas
4. GUIDE: Rekomendasi area, tipe villa, estimasi harga — spesifik dan actionable
5. URGENCY CTA: Tutup dengan ajakan booking yang hangat namun tegas

===[ CONVERSION BLOCK — WAJIB ]===
---
**Jangan Sampai Kehabisan Tempat Menginap!**

Selama musim ramai dan event di Jogja, villa di HomsJogja cepat penuh.
✔ Booking sekarang untuk dapat harga terbaik
✔ Pilihan villa untuk keluarga, pasangan, dan rombongan
✔ Lokasi dekat pusat event dan wisata Jogja

[Cek Ketersediaan Villa Sekarang →](https://homsjogja.com/properties)
---

ATURAN:
- MINIMUM 700 kata
- HANYA H2 (##) dan H3 (###)
- Bangun urgency tapi jangan clickbait
- DILARANG: {$this->getForbiddenPhrases()}
- LANGSUNG mulai konten.
PROMPT;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Build property context block untuk diinjeksi ke content prompt
     */
    private function buildPropertyBlock(array $properties, bool $detailed = false): string
    {
        if (empty($properties)) {
            return '';
        }

        $lines = array_map(function ($p) use ($detailed) {
            $url = route('properties.show', $p['slug'] ?? Str::slug($p['name']));
            $usp = !empty($p['description'])
                ? substr(strip_tags($p['description']), 0, $detailed ? 200 : 120) . '...'
                : 'Homestay nyaman di Yogyakarta.';
            return "- **{$p['name']}**: {$usp}\n  Link: {$url}";
        }, $properties);

        return "\n\nPROPERTI HOMSJOGJA (sisipkan sebagai rekomendasi natural — BUKAN hard sell):\n"
            . implode("\n", $lines)
            . "\n\nCARA MENYEBUT PROPERTI:\n"
            . "- Selipkan sebagai solusi dari masalah/kebutuhan pembaca\n"
            . "- Contoh: 'Untuk keluarga yang bawa anak, [Nama Villa](URL) cocok karena ada halaman luas dan kolam renang aman.'\n"
            . "- Gunakan format markdown link: [Nama Properti](URL)\n"
            . "- JANGAN buat section 'Rekomendasi Properti Kami' yang terpisah — sisipkan natural dalam narasi.";
    }

    /**
     * Build conversion block dengan properti jika tersedia
     */
    private function buildConversionBlock(array $properties): string
    {
        $propList = '';
        if (!empty($properties)) {
            $names = implode(', ', array_column($properties, 'name'));
            $propList = "Termasuk: {$names} dan pilihan lainnya.\n";
        }

        return "---\n**Cari Villa yang Pas di Jogja?**\n\n{$propList}"
            . "HomsJogja siap bantu:\n"
            . "✔ Villa untuk keluarga, pasangan, dan rombongan\n"
            . "✔ Harga langsung pemilik, transparan\n"
            . "✔ Booking mudah, bisa konsultasi dulu\n\n"
            . "[Lihat Semua Villa Tersedia →](https://homsjogja.com/properties)\n---";
    }

    /**
     * Build internal linking instruction block
     */
    private function buildInternalLinksBlock(array $linkedArticles): string
    {
        if (empty($linkedArticles)) {
            return '';
        }

        $lines = array_map(function ($article) {
            $url = url('/blog/' . $article['slug']);
            return "- [{$article['title']}]({$url})";
        }, $linkedArticles);

        return "\n\n===[ SEO INTERNAL LINKING WAJIB ]===\n"
            . "Kamu HARUS mereferensikan artikel-artikel terkait HomsJogja ini secara natural di dalam paragraf body (BUKAN sebagai list atau 'Baca juga'):\n"
            . implode("\n", $lines)
            . "\nSisipkan link tersebut pada teks/anchor text yang relevan dengan topik yang sedang dibahas.";
    }

    /**
     * Build AI image generation instruction block (using free loremflickr API)
     */
    private function buildImageGenerationBlock(): string
    {
        return "\n\n===[ VISUAL & ILUSTRASI ARTIKEL ]===\n"
            . "Setiap kali kamu membahas sub-topik baru (setelah H2), kamu WAJIB menyisipkan satu gambar ilustrasi yang relevan.\n"
            . "Gunakan gambar nyata dari internet (seperti dari Unsplash, Wikimedia Commons, Pexels, atau sumber publik yang valid) JANGAN MENGGUNAKAN loremflickr.\n"
            . "Gunakan format Markdown Image dan WAJIB sertakan pengutipan sumber di bawah gambar, dengan format:\n"
            . "![Keterangan gambar bahasa Indonesia](https://url-gambar-asli-dari-internet.jpg)\n"
            . "*Sumber gambar: [Nama Fotografer / Situs](https://url-referensi-asli.com)*\n"
            . "Pastikan gambar sangat relevan dengan topik yang sedang dibicarakan di section tersebut.";
    }

    private function getJogjaContext(): string
    {
        return self::JOGJA_CONTEXT;
    }

    private function getForbiddenPhrases(): string
    {
        return self::FORBIDDEN_PHRASES;
    }

    /**
     * Get available article types dengan label dan deskripsi (untuk UI)
     */
    public function getArticleTypes(): array
    {
        return [
            'travel_guide' => [
                'label' => 'Travel Guide',
                'description' => 'Panduan travel praktis: lokasi, harga, rekomendasi, CTA booking. Cocok untuk keyword "villa murah Jogja", "homestay dekat wisata".',
                'icon' => 'Map',
            ],
            'seo_article' => [
                'label' => 'SEO Article',
                'description' => 'Artikel mendalam berbasis keyword untuk topical authority. Cocok untuk keyword informational.',
                'icon' => 'Search',
            ],
            'property_article' => [
                'label' => 'Property Feature',
                'description' => 'Artikel showcase satu properti HomsJogja dengan storytelling dan CTA booking langsung.',
                'icon' => 'Home',
            ],
            'event_article' => [
                'label' => 'Event Article',
                'description' => 'Artikel timely yang triggered by event/tren lokal Jogja. Bangun urgency untuk booking.',
                'icon' => 'Calendar',
            ],
        ];
    }
}
