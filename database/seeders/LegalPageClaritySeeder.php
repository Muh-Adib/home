<?php

namespace Database\Seeders;

use App\Models\LegalPage;
use Illuminate\Database\Seeder;

class LegalPageClaritySeeder extends Seeder
{
    /**
     * Append Microsoft Clarity disclosure section to the existing Privacy Policy.
     *
     * Run this seeder once after integrating Microsoft Clarity:
     *   php artisan db:seed --class=LegalPageClaritySeeder
     */
    public function run(): void
    {
        $claritySection = <<<'MARKDOWN'

---

## Penggunaan Microsoft Clarity

Kami bermitra dengan **Microsoft Clarity** dan **Microsoft Advertising** untuk menangkap cara Anda menggunakan dan berinteraksi dengan website kami melalui metrik perilaku, heatmap, dan session replay guna meningkatkan dan memasarkan produk/layanan kami.

Data penggunaan website dikumpulkan menggunakan cookie pihak pertama dan ketiga serta teknologi pelacakan lainnya untuk menentukan popularitas produk/layanan dan aktivitas online. Selain itu, kami menggunakan informasi ini untuk optimasi situs, tujuan keamanan/penipuan, dan periklanan.

Untuk informasi lebih lanjut tentang cara Microsoft mengumpulkan dan menggunakan data Anda, kunjungi [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement).
MARKDOWN;

        $privacyPage = LegalPage::where('slug', 'privacy')
            ->whereNull('deleted_at')
            ->first();

        if (! $privacyPage) {
            // Buat halaman privacy baru jika belum ada
            LegalPage::create([
                'title' => 'Kebijakan Privasi',
                'slug' => 'privacy',
                'type' => 'Privacy Policy',
                'version' => '1.0.0',
                'content' => $claritySection,
                'published_at' => now(),
            ]);

            $this->command->info('Privacy Policy page created with Clarity disclosure.');

            return;
        }

        // Cek apakah section Clarity sudah ada agar tidak duplikat
        $existingContent = is_array($privacyPage->content)
            ? implode("\n", $privacyPage->content)
            : (string) $privacyPage->content;

        if (str_contains($existingContent, 'Microsoft Clarity')) {
            $this->command->warn('Clarity disclosure already exists in Privacy Policy. Skipping.');

            return;
        }

        // Append section ke konten yang sudah ada
        $newContent = $existingContent.$claritySection;

        $privacyPage->update(['content' => $newContent]);

        $this->command->info('Clarity disclosure appended to existing Privacy Policy.');
    }
}
