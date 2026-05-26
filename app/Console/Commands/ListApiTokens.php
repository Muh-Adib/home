<?php

namespace App\Console\Commands;

use App\Models\ApiToken;
use Illuminate\Console\Command;

class ListApiTokens extends Command
{
    protected $signature = 'api:token:list {--inactive : Include inactive tokens}';

    protected $description = 'List all API tokens';

    public function handle(): int
    {
        $query = ApiToken::with('createdBy')->orderByDesc('created_at');

        if (! $this->option('inactive')) {
            $query->where('is_active', true);
        }

        $tokens = $query->get();

        if ($tokens->isEmpty()) {
            $this->info('No API tokens found.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Name', 'Client', 'Active', 'Last Used', 'Expires', 'Created'],
            $tokens->map(fn ($t) => [
                $t->id,
                $t->name,
                $t->client_name ?? '—',
                $t->is_active ? '✓' : '✗',
                $t->last_used_at?->diffForHumans() ?? 'Never',
                $t->expires_at?->format('Y-m-d') ?? 'Never',
                $t->created_at->format('Y-m-d'),
            ])->toArray()
        );

        return self::SUCCESS;
    }
}
