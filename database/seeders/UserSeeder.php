<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            // Super Admin
            [
                'name' => 'Super Admin',
                'email' => 'admin@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567890',
                'role' => 'super_admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Property Owner
            [
                'name' => 'Indah Arini Puspitasari',
                'email' => 'owner@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567891',
                'role' => 'property_owner',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Property Manager
            [
                'name' => 'Faisal Hadi',
                'email' => 'manager@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567892',
                'role' => 'property_manager',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Front Desk Staff
            [
                'name' => 'Mike Front Desk',
                'email' => 'frontdesk@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567893',
                'role' => 'front_desk',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Finance Staff
            [
                'name' => 'Sarah Finance',
                'email' => 'finance@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567894',
                'role' => 'finance',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Housekeeping Staff
            [
                'name' => 'Lisa Housekeeping',
                'email' => 'housekeeping@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567895',
                'role' => 'housekeeping',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Demo Guest
            [
                'name' => 'Demo Guest',
                'email' => 'guest@homsjogja.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567896',
                'role' => 'guest',
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $userData) {
            // Use updateOrCreate to avoid duplicate constraint violations
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            // Create user profile for each user if not exists
            UserProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'country' => 'Indonesia',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info("Created/Updated user: {$userData['name']} ({$userData['email']})");
        }
    }
}
