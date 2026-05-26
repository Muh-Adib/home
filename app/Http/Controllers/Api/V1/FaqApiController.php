<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API v1 — FAQ / Knowledge Base
 *
 * Provides FAQ search for AI Agent.
 * Currently uses static FAQ data from the website (/faq, /support).
 * Future: replace with vector store semantic search.
 */
class FaqApiController extends Controller
{
    /**
     * POST /api/v1/faq/search
     *
     * Search FAQ by query string.
     * Returns top matching Q&A entries with confidence score.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|max:500',
            'category' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:10',
        ]);

        $query = strtolower($request->input('query'));
        $categoryFilter = $request->input('category');
        $limit = $request->integer('limit', 3);

        $faqs = $this->getFaqDatabase();

        // Filter by category if provided
        if ($categoryFilter) {
            $faqs = array_filter($faqs, fn ($faq) => $faq['category_slug'] === $categoryFilter);
        }

        // Simple keyword matching with scoring
        $results = [];
        foreach ($faqs as $faq) {
            $score = $this->calculateRelevanceScore($query, $faq);
            if ($score > 0.3) {
                $results[] = array_merge($faq, ['score' => $score]);
            }
        }

        // Sort by score descending
        usort($results, fn ($a, $b) => $b['score'] <=> $a['score']);
        $results = array_slice($results, 0, $limit);

        return response()->json([
            'success' => true,
            'data' => [
                'results' => array_map(fn ($r) => [
                    'id' => $r['id'],
                    'category' => $r['category'],
                    'question' => $r['question'],
                    'answer' => $r['answer'],
                    'score' => round($r['score'], 2),
                    'tags' => $r['tags'],
                ], $results),
            ],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * GET /api/v1/faq/categories/{categorySlug}
     *
     * Get all FAQs in a specific category.
     */
    public function byCategory(Request $request, string $categorySlug): JsonResponse
    {
        $faqs = array_filter(
            $this->getFaqDatabase(),
            fn ($faq) => $faq['category_slug'] === $categorySlug
        );

        if (empty($faqs)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_NOT_FOUND',
                    'message' => "Category '{$categorySlug}' not found.",
                ],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'category_slug' => $categorySlug,
                'faqs' => array_values($faqs),
            ],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * GET /api/v1/faq/categories
     *
     * List all FAQ categories.
     */
    public function categories(Request $request): JsonResponse
    {
        $categories = [
            ['slug' => 'pemesanan-alur-reservasi', 'name' => 'Pemesanan & Alur Reservasi', 'count' => 3],
            ['slug' => 'login-registrasi-dashboard', 'name' => 'Login, Registrasi & Dashboard', 'count' => 4],
            ['slug' => 'konfirmasi-pembayaran', 'name' => 'Konfirmasi & Pembayaran', 'count' => 4],
            ['slug' => 'pembatalan-refund', 'name' => 'Pembatalan, Perubahan & Refund', 'count' => 3],
            ['slug' => 'checkin-checkout-identitas', 'name' => 'Check-in, Check-out & Identitas', 'count' => 3],
            ['slug' => 'peraturan-unit-aturan-menginap', 'name' => 'Peraturan Unit & Aturan Menginap', 'count' => 4],
            ['slug' => 'layanan-tambahan-permintaan-khusus', 'name' => 'Layanan Tambahan & Permintaan Khusus', 'count' => 3],
            ['slug' => 'pelanggaran-denda-kerusakan', 'name' => 'Pelanggaran, Denda & Kerusakan', 'count' => 3],
            ['slug' => 'force-majeure-tanggung-jawab', 'name' => 'Force Majeure & Tanggung Jawab', 'count' => 2],
        ];

        return response()->json([
            'success' => true,
            'data' => ['categories' => $categories],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * Calculate relevance score for a FAQ entry against a query.
     * Simple keyword matching — replace with vector similarity in production.
     */
    private function calculateRelevanceScore(string $query, array $faq): float
    {
        $score = 0.0;
        $questionLower = strtolower($faq['question']);
        $answerLower = strtolower($faq['answer']);
        $queryWords = array_filter(explode(' ', $query), fn ($w) => strlen($w) > 2);

        foreach ($queryWords as $word) {
            if (str_contains($questionLower, $word)) {
                $score += 0.4;
            }
            if (str_contains($answerLower, $word)) {
                $score += 0.2;
            }
        }

        // Tag matching
        foreach ($faq['tags'] as $tag) {
            if (str_contains($query, $tag)) {
                $score += 0.3;
            }
        }

        return min(1.0, $score);
    }

    /**
     * Static FAQ database — mirrors content from /faq and /support pages.
     * In production, this should be replaced with a database table + vector embeddings.
     */
    private function getFaqDatabase(): array
    {
        return [
            // === PEMESANAN & ALUR RESERVASI ===
            [
                'id' => 'faq_booking_001',
                'category' => 'Pemesanan & Alur Reservasi',
                'category_slug' => 'pemesanan-alur-reservasi',
                'question' => 'Bagaimana alur pemesanan di Homsjogja?',
                'answer' => 'Alur pemesanan di Homsjogja: (1) Pilih unit & tanggal di website, (2) Isi data tamu & submit booking, (3) Tunggu konfirmasi dari admin (biasanya dalam 1-2 jam di jam kerja), (4) Lakukan pembayaran DP sesuai instruksi, (5) Booking terkonfirmasi setelah DP diterima. Untuk pertanyaan lebih lanjut, admin siap membantu via WhatsApp.',
                'tags' => ['booking', 'pemesanan', 'alur', 'cara', 'reservasi'],
            ],
            [
                'id' => 'faq_booking_002',
                'category' => 'Pemesanan & Alur Reservasi',
                'category_slug' => 'pemesanan-alur-reservasi',
                'question' => 'Apakah booking otomatis terkonfirmasi setelah submit?',
                'answer' => 'Booking tidak otomatis terkonfirmasi. Setelah submit, status booking adalah "Menunggu Verifikasi". Admin akan memverifikasi dan mengirimkan instruksi pembayaran DP. Booking baru terkonfirmasi setelah DP diterima dan diverifikasi oleh admin.',
                'tags' => ['konfirmasi', 'verifikasi', 'otomatis', 'status'],
            ],
            [
                'id' => 'faq_booking_003',
                'category' => 'Pemesanan & Alur Reservasi',
                'category_slug' => 'pemesanan-alur-reservasi',
                'question' => 'Berapa lama menunggu konfirmasi booking?',
                'answer' => 'Konfirmasi biasanya diberikan dalam 1-2 jam di jam kerja (08:00-20:00 WIB). Untuk booking di luar jam kerja, konfirmasi akan diberikan keesokan harinya. Jika urgent, silakan hubungi admin langsung via WhatsApp di +62 811 2500 082.',
                'tags' => ['konfirmasi', 'lama', 'tunggu', 'waktu', 'jam'],
            ],

            // === KONFIRMASI & PEMBAYARAN ===
            [
                'id' => 'faq_payment_001',
                'category' => 'Konfirmasi & Pembayaran',
                'category_slug' => 'konfirmasi-pembayaran',
                'question' => 'Apa saja metode pembayaran yang tersedia?',
                'answer' => 'Homsjogja menerima berbagai metode pembayaran: Transfer Bank (BCA, Mandiri, BNI, BRI), E-wallet (GoPay, OVO, DANA, ShopeePay), Kartu Kredit/Debit, dan QRIS. Semua metode tersedia saat proses pembayaran.',
                'tags' => ['bayar', 'pembayaran', 'transfer', 'gopay', 'ovo', 'dana', 'qris', 'kartu kredit', 'metode'],
            ],
            [
                'id' => 'faq_payment_002',
                'category' => 'Konfirmasi & Pembayaran',
                'category_slug' => 'konfirmasi-pembayaran',
                'question' => 'Berapa besar DP yang harus dibayar?',
                'answer' => 'Down Payment (DP) standar adalah 50% dari total harga booking. Sisa pembayaran dilunasi saat check-in atau sesuai kesepakatan dengan admin. Batas waktu pembayaran DP adalah 24 jam setelah booking dikonfirmasi.',
                'tags' => ['dp', 'down payment', 'uang muka', 'berapa', 'persen', 'bayar'],
            ],
            [
                'id' => 'faq_payment_003',
                'category' => 'Konfirmasi & Pembayaran',
                'category_slug' => 'konfirmasi-pembayaran',
                'question' => 'Apa yang harus dilakukan setelah transfer pembayaran?',
                'answer' => 'Setelah transfer, konfirmasi pembayaran ke admin via WhatsApp (+62 811 2500 082) dengan menyertakan: (1) Nomor booking, (2) Bukti transfer/screenshot, (3) Nama pengirim. Admin akan memverifikasi dalam 1-2 jam di jam kerja.',
                'tags' => ['transfer', 'konfirmasi', 'bukti', 'setelah bayar', 'verifikasi'],
            ],

            // === PEMBATALAN & REFUND ===
            [
                'id' => 'faq_cancel_001',
                'category' => 'Pembatalan, Perubahan & Refund',
                'category_slug' => 'pembatalan-refund',
                'question' => 'Apakah bisa membatalkan booking?',
                'answer' => 'Pembatalan booking bisa dilakukan dengan menghubungi admin via WhatsApp. Kebijakan refund tergantung waktu pembatalan: H-7 atau lebih = refund 100% DP, H-3 sampai H-6 = refund 50% DP, kurang dari H-3 = tidak ada refund. Untuk kasus khusus, admin akan membantu.',
                'tags' => ['batal', 'cancel', 'pembatalan', 'refund', 'uang kembali'],
            ],
            [
                'id' => 'faq_cancel_002',
                'category' => 'Pembatalan, Perubahan & Refund',
                'category_slug' => 'pembatalan-refund',
                'question' => 'Berapa lama proses refund?',
                'answer' => 'Proses refund membutuhkan waktu 3-5 hari kerja setelah pembatalan disetujui. Dana dikembalikan ke rekening/e-wallet yang sama dengan metode pembayaran awal. Untuk informasi lebih detail, hubungi admin.',
                'tags' => ['refund', 'uang kembali', 'berapa lama', 'proses', 'hari'],
            ],
            [
                'id' => 'faq_cancel_003',
                'category' => 'Pembatalan, Perubahan & Refund',
                'category_slug' => 'pembatalan-refund',
                'question' => 'Bisakah mengubah tanggal booking?',
                'answer' => 'Perubahan tanggal booking bisa dilakukan dengan menghubungi admin minimal H-3 sebelum check-in, tergantung ketersediaan unit. Jika unit tersedia di tanggal baru, perubahan bisa dilakukan tanpa biaya tambahan. Hubungi admin via WhatsApp untuk proses perubahan.',
                'tags' => ['ubah', 'ganti', 'tanggal', 'reschedule', 'perubahan'],
            ],

            // === CHECK-IN & CHECK-OUT ===
            [
                'id' => 'faq_checkin_001',
                'category' => 'Check-in, Check-out & Identitas',
                'category_slug' => 'checkin-checkout-identitas',
                'question' => 'Jam berapa check-in dan check-out?',
                'answer' => 'Check-in standar mulai pukul 14:00 WIB. Check-out maksimal pukul 11:00 WIB. Early check-in (sebelum 14:00) dan late check-out (setelah 11:00) tersedia dengan biaya tambahan Rp 200.000, tergantung ketersediaan. Hubungi admin untuk request.',
                'tags' => ['check-in', 'check-out', 'jam', 'waktu', 'checkin', 'checkout', 'pukul'],
            ],
            [
                'id' => 'faq_checkin_002',
                'category' => 'Check-in, Check-out & Identitas',
                'category_slug' => 'checkin-checkout-identitas',
                'question' => 'Apakah harus membawa identitas saat check-in?',
                'answer' => 'Ya, semua tamu wajib membawa identitas resmi (KTP/SIM/Paspor) saat check-in. Identitas diperlukan untuk verifikasi dan keamanan. Tamu yang tidak membawa identitas tidak dapat melakukan check-in.',
                'tags' => ['identitas', 'ktp', 'paspor', 'sim', 'dokumen', 'wajib'],
            ],
            [
                'id' => 'faq_checkin_003',
                'category' => 'Check-in, Check-out & Identitas',
                'category_slug' => 'checkin-checkout-identitas',
                'question' => 'Bagaimana proses check-in? Apakah ada resepsionis?',
                'answer' => 'Homsjogja menggunakan sistem keybox (kunci digital). Setelah booking terkonfirmasi dan pembayaran lunas, admin akan mengirimkan kode keybox dan instruksi check-in via WhatsApp. Tidak ada resepsionis on-site, namun admin selalu siap dihubungi via WhatsApp jika ada kendala.',
                'tags' => ['check-in', 'proses', 'keybox', 'kunci', 'resepsionis', 'instruksi'],
            ],

            // === PERATURAN UNIT ===
            [
                'id' => 'faq_rules_001',
                'category' => 'Peraturan Unit & Aturan Menginap',
                'category_slug' => 'peraturan-unit-aturan-menginap',
                'question' => 'Bolehkah membawa hewan peliharaan?',
                'answer' => 'Mohon maaf, sebagian besar unit Homsjogja tidak menerima hewan peliharaan untuk menjaga kebersihan dan kenyamanan tamu lain. Bila Anda membutuhkan penginapan pet-friendly, mohon konfirmasi ke admin untuk mengecek unit yang memungkinkan.',
                'tags' => ['hewan', 'peliharaan', 'anjing', 'kucing', 'pet', 'binatang'],
            ],
            [
                'id' => 'faq_rules_002',
                'category' => 'Peraturan Unit & Aturan Menginap',
                'category_slug' => 'peraturan-unit-aturan-menginap',
                'question' => 'Apakah boleh merokok di dalam unit?',
                'answer' => 'Merokok di dalam unit TIDAK diperbolehkan. Tamu yang merokok di dalam unit akan dikenakan denda kebersihan. Jika ingin merokok, silakan di area luar/taman yang tersedia.',
                'tags' => ['rokok', 'merokok', 'smoking', 'dilarang'],
            ],
            [
                'id' => 'faq_rules_003',
                'category' => 'Peraturan Unit & Aturan Menginap',
                'category_slug' => 'peraturan-unit-aturan-menginap',
                'question' => 'Berapa kapasitas maksimum tamu?',
                'answer' => 'Setiap unit memiliki kapasitas maksimum yang berbeda. Tamu yang melebihi kapasitas maksimum tidak diperbolehkan. Untuk tamu tambahan (di atas kapasitas standar), tersedia extra bed dengan biaya tambahan. Cek detail kapasitas di halaman masing-masing unit.',
                'tags' => ['kapasitas', 'maksimum', 'tamu', 'berapa orang', 'extra bed'],
            ],
            [
                'id' => 'faq_rules_004',
                'category' => 'Peraturan Unit & Aturan Menginap',
                'category_slug' => 'peraturan-unit-aturan-menginap',
                'question' => 'Apakah boleh mengadakan acara atau pesta di unit?',
                'answer' => 'Acara atau gathering kecil (keluarga/teman) umumnya diperbolehkan sesuai kapasitas unit. Namun pesta besar dengan musik keras atau tamu di luar kapasitas tidak diizinkan. Untuk event khusus (ulang tahun, gathering kantor), harap konfirmasi ke admin terlebih dahulu.',
                'tags' => ['acara', 'pesta', 'event', 'gathering', 'ulang tahun', 'party'],
            ],

            // === LAYANAN TAMBAHAN ===
            [
                'id' => 'faq_service_001',
                'category' => 'Layanan Tambahan & Permintaan Khusus',
                'category_slug' => 'layanan-tambahan-permintaan-khusus',
                'question' => 'Layanan tambahan apa saja yang tersedia?',
                'answer' => 'Layanan tambahan yang tersedia: Extra Bed (Rp 150.000/malam), Early Check-in (Rp 200.000), Late Check-out (Rp 200.000), Floating Breakfast untuk unit dengan private pool (Rp 250.000/set), dan dekorasi kamar untuk momen spesial. Hubungi admin untuk request layanan tambahan.',
                'tags' => ['layanan', 'tambahan', 'extra', 'fasilitas', 'add-on'],
            ],
            [
                'id' => 'faq_service_002',
                'category' => 'Layanan Tambahan & Permintaan Khusus',
                'category_slug' => 'layanan-tambahan-permintaan-khusus',
                'question' => 'Apakah tersedia dekorasi kamar untuk honeymoon atau ulang tahun?',
                'answer' => 'Ya, Homsjogja menyediakan layanan dekorasi kamar untuk momen spesial seperti honeymoon, ulang tahun, atau anniversary. Biaya dekorasi bervariasi tergantung paket. Hubungi admin minimal H-2 sebelum check-in untuk request dekorasi.',
                'tags' => ['dekorasi', 'honeymoon', 'ulang tahun', 'anniversary', 'romantis', 'surprise'],
            ],

            // === FORCE MAJEURE ===
            [
                'id' => 'faq_fm_001',
                'category' => 'Force Majeure & Tanggung Jawab',
                'category_slug' => 'force-majeure-tanggung-jawab',
                'question' => 'Bagaimana jika terjadi force majeure (bencana alam, dll)?',
                'answer' => 'Dalam kondisi force majeure (bencana alam, pandemi, dll) yang menyebabkan pembatalan, Homsjogja akan memberikan opsi: reschedule tanpa biaya atau refund penuh. Keputusan diambil case-by-case berdasarkan kondisi aktual. Hubungi admin untuk informasi lebih lanjut.',
                'tags' => ['force majeure', 'bencana', 'pandemi', 'darurat', 'refund'],
            ],
            [
                'id' => 'faq_fm_002',
                'category' => 'Force Majeure & Tanggung Jawab',
                'category_slug' => 'force-majeure-tanggung-jawab',
                'question' => 'Apakah Homsjogja bertanggung jawab atas barang hilang?',
                'answer' => 'Homsjogja tidak bertanggung jawab atas kehilangan barang bawaan tamu. Tamu disarankan untuk menyimpan barang berharga dengan aman. Jika ada barang tertinggal, segera hubungi admin dan kami akan membantu mencarinya.',
                'tags' => ['barang', 'hilang', 'tanggung jawab', 'kehilangan'],
            ],
        ];
    }

    private function meta(Request $request): array
    {
        return [
            'request_id' => $request->header('X-Request-Id', uniqid('req_')),
            'timestamp' => now()->toISOString(),
            'api_version' => 'v1',
        ];
    }
}
