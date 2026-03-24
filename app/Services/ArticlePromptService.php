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
        array $researchContext = [],
        array $properties = []
    ): string {
        return match ($type) {
            'travel_guide' => $this->travelGuideOutlinePrompt($title, $keywords, $researchContext, $properties),
            'seo_article' => $this->seoArticleOutlinePrompt($title, $keywords, $researchContext, $properties),
            'property_article' => $this->propertyArticleOutlinePrompt($title, $keywords, $researchContext, $properties),
            'event_article' => $this->eventArticleOutlinePrompt($title, $keywords, $researchContext, $properties),
            default => $this->travelGuideOutlinePrompt($title, $keywords, $researchContext, $properties),
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

    private function travelGuideOutlinePrompt(string $title, array $keywords, array $researchContext, array $properties = []): string
    {
        $kwStr = implode(', ', $keywords);
        $intent = $researchContext['search_intent'] ?? 'Transactional + Informational';
        $audience = $researchContext['target_audience_analysis'] ?? 'Wisatawan keluarga, rombongan, dan pasangan yang ingin menginap di Yogyakarta';
        $keyPoints = !empty($researchContext['key_points']) ? implode(', ', $researchContext['key_points']) : '';

        // Build real property data block for outline
        $propertyOutlineBlock = '';
        if (!empty($properties)) {
            $lines = array_map(function ($p) {
                $url = route('properties.show', $p['slug'] ?? Str::slug($p['name']));
                $location = $p['location'] ?? 'Yogyakarta';
                $capacity = $p['capacity'] ?? '?';
                $bedrooms = $p['bedrooms'] ?? '?';
                $priceMin = $p['base_rate'] ? 'Rp ' . number_format((int)$p['base_rate'], 0, ',', '.') : '~';
                $line = "- **{$p['name']}** | Lokasi: {$location} | {$capacity} tamu | {$bedrooms} kamar | Harga mulai {$priceMin}/malam | URL: {$url}";
                if (!empty($p['images'])) {
                    $line .= "\n  Foto: " . implode(', ', $p['images']);
                }
                return $line;
            }, $properties);

            $propertyOutlineBlock = "\n\nPROPERTI HOMSJOGJA YANG HARUS DISEBUT DALAM OUTLINE:\n"
                . implode("\n", $lines)
                . "\n\nPENTING: Gunakan nama asli properti di atas (bukan placeholder) saat membuat struktur 'Rekomendasi Villa'. Sertakan juga nama-nama properti ini di FAQ jika relevan.";
        }

        return <<<PROMPT
Kamu adalah pakar SEO content strategist untuk website sewa villa & homestay di Yogyakarta (HomsJogja.com).

TUGAS: Buat outline artikel travel guide praktis untuk:
Judul: "{$title}"
Keyword Target: {$kwStr}
Search Intent: {$intent}
Target Audience: {$audience}
{$keyPoints}
{$propertyOutlineBlock}

{$this->getJogjaContext()}

STRUKTUR WAJIB SINGKAT (H2 & H3 saja, tanpa deskripsi):
## [Judul H2 menarik yang mencakup keyword utama]

### Hook Pembuka

## [Topik Utama Mengapa Jogja]

## Lokasi Terbaik di Jogja
### [Area 1 - Jarak ke wisata]
### [Area 2 - Jarak ke wisata]

## Rekomendasi Villa/Homestay
### [Villa Keluarga]
### [Villa Rombongan]

## Estimasi Budget Lengkap

## Tips Memilih dan Booking

## Panduan Transportasi

## Kuliner Terdekat

## CTA: Temukan Villa Ideal di HomsJogja

### FAQ

ATURAN PENTING:
- Buat outline SANGAT SINGKAT dan padat. HANYA tulis judul H2 (##) dan H3 (###).
- DILARANG menambahkan poin penjelasan/deskripsi panjang di bawah heading untuk MENGHEMAT TOKEN.
- HANYA gunakan H2 (##) dan H3 (###) — DILARANG roman numeral (I, II, III).
- Bahasa: Bahasa Indonesia.

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

    private function seoArticleOutlinePrompt(string $title, array $keywords, array $researchContext, array $properties = []): string
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

STRUKTUR OUTLINE SINGKAT (SEO-Optimized):
## [H2 Utama dengan Keyword]

### Definisi / Konteks

## [Subtopik 1 — LSI keyword]
### [Sub-subtopik]

## [Subtopik 2 — LSI keyword]
### [Sub-subtopik]

## [Perbandingan / Data]

## Rekomendasi Praktis

## FAQ — Pertanyaan Sering Dicari

## Kesimpulan + CTA

ATURAN:
- Buat outline SANGAT SINGKAT dan padat. HANYA tulis H2 (##) dan H3 (###).
- DILARANG memberikan poin deskripsi/penjelasan panjang di bawah heading untuk MENGHEMAT TOKEN.
- Outline harus menjawab intent: apa, di mana, berapa, bagaimana.
- Bahasa Indonesia.

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

    private function propertyArticleOutlinePrompt(string $title, array $keywords, array $researchContext, array $properties = []): string
    {
        $kwStr = implode(', ', $keywords);

        return <<<PROMPT
Kamu adalah copywriter spesialis hospitality & property marketing untuk HomsJogja.

TUGAS: Buat outline artikel property feature (soft-sell) untuk:
Judul: "{$title}"
Keyword: {$kwStr}

{$this->getJogjaContext()}

STRUKTUR OUTLINE SINGKAT:
## Hook: Pengalaman Tamu di [Properti]
## Kenapa [Properti] Jadi Pilihan
### Lokasi Strategis
### Fasilitas Unggulan
## Pengalaman Sehari Penuh
### Pagi
### Siang
### Malam
## Estimasi Budget Menginap
## Review dan Keunggulan
## Tips Booking
## Cara Booking di HomsJogja

ATURAN:
- Buat outline SANGAT SINGKAT dan padat. HANYA tulis H2 (##) dan H3 (###).
- DILARANG memberikan poin deskripsi/penjelasan panjang di bawah heading untuk MENGHEMAT TOKEN.
- Nada: warm, personal.

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

    private function eventArticleOutlinePrompt(string $title, array $keywords, array $researchContext, array $properties = []): string
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

STRUKTUR OUTLINE SINGKAT:
## Hook: [Event/Tren] Membawa Keramaian di Jogja
## Fakta Penting tentang [Event]
### Waktu & Lokasi
## Dampak: Hotel Penuh & Akses Padat
## Solusi Cerdas: Menginap di Villa Sekitar Lokasi
### Area Strategis
## Rekomendasi Tempat Menginap untuk [Event]
### [Sebutkan Villa/Tipe]
## Tips Persiapan Liburan
## CTA: Booking Villa di HomsJogja Sekarang!

ATURAN: 
- Buat outline SANGAT SINGKAT dan padat. HANYA tulis H2 (##) dan H3 (###).
- DILARANG memberikan poin deskripsi/penjelasan panjang di bawah heading untuk MENGHEMAT TOKEN.
- Nada: urgent, relevan.
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
            // Coba ambil list gambar jika $p memiliki id
            $imageContext = '';
            if (isset($p['id'])) {
                $propertyModel = \App\Models\Property::with('media')->find($p['id']);
                if ($propertyModel && $propertyModel->media->count() > 0) {
                    $imageUrls = $propertyModel->media->take(3)->pluck('url')->toArray();
                    $imageContext = "\n  Gambar Asli Properti (Gunakan URL ini di markdown JIKA membahas properti ini):\n  - " . implode("\n  - ", $imageUrls);
                }
            }

            $url = route('properties.show', $p['slug'] ?? Str::slug($p['name']));
            $usp = !empty($p['description'])
                ? substr(strip_tags($p['description']), 0, $detailed ? 200 : 120) . '...'
                : 'Homestay nyaman di Yogyakarta.';
            return "- **{$p['name']}**: {$usp}\n  Link: {$url}{$imageContext}";
        }, $properties);

        return "\n\nPROPERTI HOMSJOGJA (sisipkan sebagai rekomendasi natural — BUKAN hard sell):\n"
            . implode("\n", $lines)
            . "\n\nCARA MENYEBUT PROPERTI:\n"
            . "- Selipkan sebagai solusi dari masalah/kebutuhan pembaca\n"
            . "- Contoh: 'Untuk keluarga yang bawa anak, [Nama Villa](URL) cocok karena ada halaman luas dan kolam renang aman.'\n"
            . "- Gunakan format markdown link: [Nama Properti](URL)\n"
            . "- JIKA kamu menyebut properti ini, WAJIB sertakan salah satu Gambar Asli Properti di atas menggunakan Markdown Image format: ![Keterangan](URL_Gambar_Asli)\n"
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
     * Build AI image generation instruction block (menggunakan Pollinations AI untuk gambar dinamis yang valid)
     */
    private function buildImageGenerationBlock(): string
    {
        return "\n\n===[ VISUAL & ILUSTRASI ARTIKEL ]===\n"
            . "Setiap kali kamu membahas sub-topik baru (setelah H2), kamu WAJIB menyisipkan satu gambar ilustrasi yang relevan.\n"
            . "SANGAT PENTING: Untuk memastikan link gambar selalu valid dan tidak error (404), SANGAT DILARANG menggunakan Unsplash/Pexels/Wikimedia karena sering usang. Gunakan layanan gambar dinamis dari Pollinations AI.\n"
            . "Gunakan URL berikut dengan format Markdown Image:\n"
            . "![Keterangan gambar bahasa Indonesia](https://image.pollinations.ai/prompt/[deskripsi-gambar-bahasa-inggris-dipisah-spasi]?width=800&height=450&nologo=true)\n\n"
            . "Contoh penggunaan (pastikan deskripsi bahasa Inggris URL encoded):\n"
            . "![Jalan Malioboro Yogyakarta](https://image.pollinations.ai/prompt/malioboro%20street%20yogyakarta%20indonesia%20beautiful%20photography?width=800&height=450&nologo=true)\n\n"
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
