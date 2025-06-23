<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CleaningTask;

class CleaningTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tasks = [
            [
                'name' => 'Daily Room Cleaning',
                'description' => 'Pembersihan kamar harian (sapu, pel, lap permukaan)',
                'frequency' => 'daily',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Bathroom Deep Clean',
                'description' => 'Pembersihan mendalam kamar mandi (keramik, wastafel, toilet)',
                'frequency' => 'weekly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Kitchen Cleaning',
                'description' => 'Pembersihan dapur dan peralatan masak',
                'frequency' => 'weekly',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];
        $inserted = 0;
        try {
            foreach ($tasks as $taskData) {
                // Use updateOrCreate to avoid duplicate constraint violations
                $task = CleaningTask::updateOrCreate(
                    ['name' => $taskData['name']],
                    $taskData
                );
                
                $this->command->info("Created/Updated cleaning task: {$taskData['name']}");
                $inserted++;
            }
        } catch (\Exception $e) {
            $this->command->error('Gagal insert cleaning tasks: ' . $e->getMessage());
            return;
        }
        $this->command->info('Created/Updated ' . $inserted . ' cleaning tasks.');
    }
}
