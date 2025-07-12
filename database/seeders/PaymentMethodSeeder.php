<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $paymentMethods = [
            // Bank Transfer
            [
                'name' => 'Bank BCA',
                'code' => 'bca',
                'type' => 'bank_transfer',
                'icon' => '🏦',
                'description' => 'Transfer ke rekening BCA',
                'account_number' => '1234567890',
                'account_name' => 'Homsjogja Indonesia',
                'bank_name' => 'Bank Central Asia',
                'instructions' => [
                    'Transfer ke nomor rekening yang tertera',
                    'Gunakan kode booking sebagai berita acara',
                    'Simpan bukti transfer dan upload di form payment',
                    'Konfirmasi akan diproses maksimal 2x24 jam'
                ],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Bank Mandiri',
                'code' => 'mandiri',
                'type' => 'bank_transfer',
                'icon' => '🏦',
                'description' => 'Transfer ke rekening Mandiri',
                'account_number' => '0987654321',
                'account_name' => 'Homsjogja Indonesia',
                'bank_name' => 'Bank Mandiri',
                'instructions' => [
                    'Transfer ke nomor rekening yang tertera',
                    'Gunakan kode booking sebagai berita acara',
                    'Simpan bukti transfer dan upload di form payment',
                    'Konfirmasi akan diproses maksimal 2x24 jam'
                ],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Bank BNI',
                'code' => 'bni',
                'type' => 'bank_transfer',
                'icon' => '🏦',
                'description' => 'Transfer ke rekening BNI',
                'account_number' => '1122334455',
                'account_name' => 'Homsjogja Indonesia',
                'bank_name' => 'Bank Negara Indonesia',
                'instructions' => [
                    'Transfer ke nomor rekening yang tertera',
                    'Gunakan kode booking sebagai berita acara',
                    'Simpan bukti transfer dan upload di form payment',
                    'Konfirmasi akan diproses maksimal 2x24 jam'
                ],
                'is_active' => true,
                'sort_order' => 3,
            ],

            // E-Wallets
            [
                'name' => 'OVO',
                'code' => 'ovo',
                'type' => 'e_wallet',
                'icon' => '📱',
                'description' => 'Transfer via OVO',
                'account_number' => '081234567890',
                'account_name' => 'Homsjogja',
                'instructions' => [
                    'Transfer ke nomor OVO yang tertera',
                    'Gunakan catatan: kode booking',
                    'Screenshot bukti transfer dan upload',
                    'Konfirmasi otomatis dalam 1 jam'
                ],
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'GoPay',
                'code' => 'gopay',
                'type' => 'e_wallet',
                'icon' => '📱',
                'description' => 'Transfer via GoPay',
                'account_number' => '081234567890',
                'account_name' => 'Homsjogja',
                'instructions' => [
                    'Transfer ke nomor GoPay yang tertera',
                    'Gunakan catatan: kode booking',
                    'Screenshot bukti transfer dan upload',
                    'Konfirmasi otomatis dalam 1 jam'
                ],
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'DANA',
                'code' => 'dana',
                'type' => 'e_wallet',
                'icon' => '📱',
                'description' => 'Transfer via DANA',
                'account_number' => '081234567890',
                'account_name' => 'Homsjogja',
                'instructions' => [
                    'Transfer ke nomor DANA yang tertera',
                    'Gunakan catatan: kode booking',
                    'Screenshot bukti transfer dan upload',
                    'Konfirmasi otomatis dalam 1 jam'
                ],
                'is_active' => true,
                'sort_order' => 6,
            ],

            // Cash/Direct
            [
                'name' => 'Cash Payment',
                'code' => 'cash',
                'type' => 'cash',
                'icon' => '💵',
                'description' => 'Pembayaran tunai langsung',
                'instructions' => [
                    'Hubungi customer service kami',
                    'Atur jadwal pembayaran tunai',
                    'Lokasi: kantor Homsjogja',
                    'Bawa kode booking untuk verifikasi'
                ],
                'is_active' => true,
                'sort_order' => 7,
            ],

            // Credit Card (placeholder for future Stripe integration)
            [
                'name' => 'Credit Card',
                'code' => 'credit_card',
                'type' => 'credit_card',
                'icon' => '💳',
                'description' => 'Pembayaran dengan kartu kredit',
                'instructions' => [
                    'Fitur akan segera tersedia',
                    'Gunakan metode lain sementara',
                    'Atau hubungi customer service'
                ],
                'is_active' => false,
                'sort_order' => 8,
            ],
        ];

        foreach ($paymentMethods as $method) {
            PaymentMethod::create($method);
        }
    }
}
