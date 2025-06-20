<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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
                'email' => 'admin@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567890',
                'role' => 'super_admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Property Owner
            [
                'name' => 'John Property Owner',
                'email' => 'owner@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567891',
                'role' => 'property_owner',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Property Manager
            [
                'name' => 'Jane Manager',
                'email' => 'manager@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567892',
                'role' => 'property_manager',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Front Desk Staff
            [
                'name' => 'Mike Front Desk',
                'email' => 'frontdesk@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567893',
                'role' => 'front_desk',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Finance Staff
            [
                'name' => 'Sarah Finance',
                'email' => 'finance@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567894',
                'role' => 'finance',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Housekeeping Staff
            [
                'name' => 'Lisa Housekeeping',
                'email' => 'housekeeping@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567895',
                'role' => 'housekeeping',
                'status' => 'active',
                'email_verified_at' => now(),
            ],

            // Demo Guest
            [
                'name' => 'Demo Guest',
                'email' => 'guest@pms.com',
                'password' => Hash::make('password'),
                'phone' => '+6281234567896',
                'role' => 'guest',
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $userData) {
            $userId = DB::table('users')->insertGetId(array_merge($userData, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));

            // Create user profile for each user
            DB::table('user_profiles')->insert([
                'user_id' => $userId,
                'country' => 'Indonesia',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
