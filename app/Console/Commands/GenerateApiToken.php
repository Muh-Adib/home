<?php

namespace App\Console\Commands;

use App\Models\ApiToken;
use Illuminate\Console\Command;

class GenerateApiToken extends Command
{
    protected $signature = 'api:token:generate
                            {name : A descriptive name for this token}
                            {--client= : Client name (e.g. "Mbak Homs AI Agent")}
                            {--scopes= : Comma-separated scopes (leave empty for full access)}
                            {--expires= : Expiry in days (leave empty for no expiry)}';

    protected $description = 'Generate a new API token for external service authentication';

    public function handle(): int
    {
        $name = $this->argument('name');
        $clientName = $this->option('client') ?? $name;
        $scopesInput = $this->option('scopes');
        $expiresInDays = $this->option('expires');

        $scopes = $scopesInput
            ? array_map('trim', explode(',', $scopesInput))
            : null;

        $expiresAt = $expiresInDays
            ? now()->addDays((int) $expiresInDays)
            : null;

        $tokenString = ApiToken::generateToken();

        $token = ApiToken::create([
            'name' => $name,
            'token' => substr($tokenString, 0, 12).'...', // Store preview only
            'token_hash' => ApiToken::hashToken($tokenString),
            'client_name' => $clientName,
            'scopes' => $scopes,
            'is_active' => true,
            'expires_at' => $expiresAt,
            'created_by' => null,
        ]);

        $this->newLine();
        $this->info('✅ API Token generated successfully!');
        $this->newLine();

        $this->table(
            ['Field', 'Value'],
            [
                ['ID', $token->id],
                ['Name', $token->name],
                ['Client', $token->client_name],
                ['Token', $tokenString],
                ['Scopes', $scopes ? implode(', ', $scopes) : 'Full access (no restriction)'],
                ['Expires', $expiresAt ? $expiresAt->toDateTimeString() : 'Never'],
            ]
        );

        $this->newLine();
        $this->warn('⚠️  Store this token securely. It will not be shown again.');
        $this->newLine();
        $this->line('Usage in HTTP requests:');
        $this->line("  Authorization: Bearer {$tokenString}");
        $this->newLine();

        return self::SUCCESS;
    }
}
