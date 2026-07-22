<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UpdateExistingUsersPhoneCountryCodeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Update existing users who don't have phone_country_code
        User::whereNull('phone_country_code')
            ->orWhere('phone_country_code', '')
            ->update([
                'phone_country_code' => '+62',
                'country' => \DB::raw('COALESCE(country, "Indonesia")'),
                'gender' => \DB::raw('COALESCE(gender, "male")'),
                'role' => \DB::raw('COALESCE(role, "guest")'),
                'status' => \DB::raw('COALESCE(status, "active")'),
            ]);

        $this->command->info('Updated existing users with default phone_country_code and other fields.');
    }
}
