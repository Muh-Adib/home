<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Property;
use Illuminate\Support\Str;

class GenerateICalTokensCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ical:generate-tokens {--force : Force regenerate all tokens}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate iCal export tokens for properties that don\'t have one';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $query = Property::query();

        if ($this->option('force')) {
            $this->warn('Force mode enabled. All tokens will be regenerated.');
            $count = $query->count();
        } else {
            $query->where(function ($q) {
                $q->whereNull('ical_export_token')
                    ->orWhere('ical_export_token', '');
            });
            $count = $query->count();
        }

        if ($count === 0) {
            $this->info('All properties already have iCal export tokens!');
            return 0;
        }

        $this->info("Found {$count} properties without tokens. Generating...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        $query->chunkById(100, function ($properties) use ($bar) {
            foreach ($properties as $property) {
                $property->ical_export_token = Str::random(32);
                $property->save();
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("✓ Successfully generated tokens for {$count} properties!");

        return 0;
    }
}
