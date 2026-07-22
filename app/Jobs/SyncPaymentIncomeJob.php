<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Payment;
use App\Services\PaymentIncomeSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncPaymentIncomeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(private int $paymentId) {}

    public function handle(PaymentIncomeSyncService $syncService): void
    {
        $payment = Payment::find($this->paymentId);

        if (! $payment) {
            Log::warning('SyncPaymentIncomeJob: payment not found', ['payment_id' => $this->paymentId]);

            return;
        }

        $syncService->syncOnVerified($payment);
    }
}
