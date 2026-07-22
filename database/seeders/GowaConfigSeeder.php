<?php

namespace Database\Seeders;

use App\Models\GowaConfig;
use Illuminate\Database\Seeder;

class GowaConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if config already exists
        if (GowaConfig::count() > 0) {
            $this->command->info('GOWA config already exists, skipping seeder.');

            return;
        }

        // Create default GOWA configuration
        // NOTE: You need to update these values with your actual GOWA server details
        GowaConfig::create([
            'name' => 'default',
            'url' => env('GOWA_URL', 'http://localhost:3000'),
            'username' => env('GOWA_USERNAME', 'admin'),
            'password' => env('GOWA_PASSWORD', 'secret'),
            'whatsapp_number' => env('GOWA_WHATSAPP_NUMBER', '628123456789'),
            'is_active' => true,
        ]);

        $this->command->info('Default GOWA configuration created successfully!');
        $this->command->warn('Please update the GOWA configuration in /admin/gowa with your actual server details.');
    }
}
