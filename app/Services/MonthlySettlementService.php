<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\MonthlyPropertySettlement;
use App\Models\MonthlySettlementItem;
use App\Models\Property;
use App\Models\PropertyExpense;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MonthlySettlementService
{
    /**
     * Generate or re-generate draft monthly settlement for a property and period month (e.g. "2026-06")
     */
    public function generateSettlement(Property $property, string $periodMonth, User $user): MonthlyPropertySettlement
    {
        return DB::transaction(function () use ($property, $periodMonth, $user) {
            $startOfMonth = Carbon::parse("{$periodMonth}-01")->startOfMonth();
            $endOfMonth = Carbon::parse("{$periodMonth}-01")->endOfMonth();

            // Find existing settlement or create new
            $settlement = MonthlyPropertySettlement::firstOrNew([
                'property_id' => $property->id,
                'period_month' => $periodMonth,
            ]);

            if ($settlement->status === 'finalized') {
                throw new \Exception('Laporan bulan ini telah ditutup buku (finalized) dan tidak dapat dibuat ulang.');
            }

            $settlement->created_by = $user->id;
            $settlement->status = 'draft';
            $settlement->ops_fee_per_night = 100000;
            $settlement->investor_share_percent = 60.00;
            $settlement->management_share_percent = 40.00;
            $settlement->zakat_percent = 2.50;
            $settlement->save();

            // Clear old draft items if any
            $settlement->items()->delete();

            // 1. Scan Bookings for Omset
            $bookings = Booking::where('property_id', $property->id)
                ->where(function ($q) {
                    $q->whereIn('booking_status', ['confirmed', 'checked_in', 'checked_out'])
                        ->orWhereIn('status', ['confirmed', 'checked_in', 'checked_out']);
                })
                ->whereBetween('check_in', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->orderBy('check_in')
                ->get();

            $totalOmset = 0;
            $occupancyNights = 0;
            $reservationCount = $bookings->count();
            $sortOrder = 1;

            foreach ($bookings as $b) {
                $nights = (int) ceil(Carbon::parse($b->check_in)->diffInDays(Carbon::parse($b->check_out)) ?: 1);
                $occupancyNights += $nights;
                $amount = (float) ($b->total_amount ?? $b->total_price ?? 0);
                $totalOmset += $amount;

                MonthlySettlementItem::create([
                    'monthly_settlement_id' => $settlement->id,
                    'type' => 'omset',
                    'date' => Carbon::parse($b->check_in)->toDateString(),
                    'item_name' => $b->guest_name ?: "Booking #{$b->booking_code}",
                    'amount' => $amount,
                    'notes' => "{$nights} malam (".Carbon::parse($b->check_in)->format('d/m').' - '.Carbon::parse($b->check_out)->format('d/m').')',
                    'sort_order' => $sortOrder++,
                ]);
            }

            // 2. Scan Expenses for Fix, Add, Var Cost
            $expenses = PropertyExpense::where('property_id', $property->id)
                ->where('status', 'approved')
                ->whereBetween('expense_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                ->orderBy('expense_date')
                ->get();

            foreach ($expenses as $e) {
                $type = 'var_cost';
                if ($e->expense_type === 'fixed') {
                    $type = 'fix_cost';
                } elseif ($e->expense_type === 'additional') {
                    $type = 'add_cost';
                }

                MonthlySettlementItem::create([
                    'monthly_settlement_id' => $settlement->id,
                    'type' => $type,
                    'date' => Carbon::parse($e->expense_date)->toDateString(),
                    'item_name' => $e->description ?: strtoupper($e->expense_category),
                    'amount' => (float) $e->amount,
                    'notes' => $e->vendor_name ? "Vendor: {$e->vendor_name}" : null,
                    'sort_order' => $sortOrder++,
                ]);
            }

            // Recalculate totals
            $this->recalculateSettlementTotals($settlement, $occupancyNights, $reservationCount);

            return $settlement->fresh(['items', 'property']);
        });
    }

    /**
     * Update settlement items and recalculate summary metrics
     */
    public function updateSettlement(MonthlyPropertySettlement $settlement, array $data): MonthlyPropertySettlement
    {
        return DB::transaction(function () use ($settlement, $data) {
            if ($settlement->status === 'finalized') {
                throw new \Exception('Laporan yang sudah ditutup buku tidak dapat diubah.');
            }

            if (isset($data['ops_fee_per_night'])) {
                $settlement->ops_fee_per_night = (float) $data['ops_fee_per_night'];
            }
            if (isset($data['investor_share_percent'])) {
                $settlement->investor_share_percent = (float) $data['investor_share_percent'];
            }
            if (isset($data['management_share_percent'])) {
                $settlement->management_share_percent = (float) $data['management_share_percent'];
            }
            if (isset($data['zakat_percent'])) {
                $settlement->zakat_percent = (float) $data['zakat_percent'];
            }
            if (isset($data['notes'])) {
                $settlement->notes = $data['notes'];
            }

            // If items payload provided, update items
            if (isset($data['items']) && is_array($data['items'])) {
                $settlement->items()->delete();
                $sortOrder = 1;
                foreach ($data['items'] as $itemData) {
                    MonthlySettlementItem::create([
                        'monthly_settlement_id' => $settlement->id,
                        'type' => $itemData['type'],
                        'date' => ! empty($itemData['date']) ? $itemData['date'] : null,
                        'item_name' => $itemData['item_name'],
                        'amount' => (float) $itemData['amount'],
                        'notes' => $itemData['notes'] ?? null,
                        'sort_order' => $sortOrder++,
                    ]);
                }
            }

            $this->recalculateSettlementTotals($settlement);

            return $settlement->fresh(['items', 'property']);
        });
    }

    /**
     * Recalculate all financial totals for settlement
     */
    public function recalculateSettlementTotals(MonthlyPropertySettlement $settlement, ?int $occupancyNights = null, ?int $reservationCount = null): void
    {
        $items = $settlement->items;

        $totalOmset = (float) $items->where('type', 'omset')->sum('amount');
        $totalFixCost = (float) $items->where('type', 'fix_cost')->sum('amount');
        $totalAddCost = (float) $items->where('type', 'add_cost')->sum('amount');
        $totalVarCost = (float) $items->where('type', 'var_cost')->sum('amount');

        if ($occupancyNights !== null) {
            $settlement->occupancy_nights = $occupancyNights;
        }
        if ($reservationCount !== null) {
            $settlement->reservation_count = $reservationCount;
        }

        $totalOpsFee = (float) $settlement->occupancy_nights * (float) $settlement->ops_fee_per_night;
        $totalExpenseAndOps = $totalOpsFee + $totalFixCost + $totalAddCost + $totalVarCost;
        $netProfitLoss = $totalOmset - $totalExpenseAndOps;

        $invPercent = (float) ($settlement->investor_share_percent ?: 60);
        $mgmtPercent = (float) ($settlement->management_share_percent ?: 40);
        $zakatPercent = (float) ($settlement->zakat_percent ?: 2.5);

        $invShare = round($netProfitLoss * ($invPercent / 100), 2);
        $mgmtShare = round($netProfitLoss * ($mgmtPercent / 100), 2);
        $zakatAmount = $netProfitLoss > 0 ? round($netProfitLoss * ($zakatPercent / 100), 2) : 0;

        $settlement->update([
            'total_omset' => $totalOmset,
            'total_ops_fee' => $totalOpsFee,
            'total_fix_cost' => $totalFixCost,
            'total_add_cost' => $totalAddCost,
            'total_var_cost' => $totalVarCost,
            'total_expense_and_ops' => $totalExpenseAndOps,
            'net_profit_loss' => $netProfitLoss,
            'investor_share_amount' => $invShare,
            'management_share_amount' => $mgmtShare,
            'zakat_amount' => $zakatAmount,
        ]);
    }

    /**
     * Finalize settlement (Tutup Buku) and mutate target wallet balance
     */
    public function finalizeAndClose(MonthlyPropertySettlement $settlement, int $targetWalletId, User $user): MonthlyPropertySettlement
    {
        return DB::transaction(function () use ($settlement, $targetWalletId, $user) {
            if ($settlement->status === 'finalized') {
                throw new \Exception('Laporan bulan ini sudah ditutup buku.');
            }

            // Create Wallet Transaction for profit/loss transfer
            $direction = $settlement->net_profit_loss >= 0 ? 'in' : 'out';
            $absAmount = abs($settlement->net_profit_loss);

            $propName = $settlement->property?->name ?? "Property #{$settlement->property_id}";
            $desc = "Tutup Buku Laporan Keuangan {$propName} Periode {$settlement->period_month}";

            $tx = WalletTransaction::create([
                'wallet_id' => $targetWalletId,
                'direction' => $direction,
                'amount' => $absAmount,
                'category' => $settlement->net_profit_loss >= 0 ? 'revenue' : 'expense',
                'transaction_date' => now()->toDateString(),
                'description' => $desc,
                'reference_type' => MonthlyPropertySettlement::class,
                'reference_id' => $settlement->id,
                'created_by' => $user->id,
            ]);

            app(WalletService::class)->recalculateBalance($targetWalletId);

            $settlement->update([
                'status' => 'finalized',
                'target_wallet_id' => $targetWalletId,
                'wallet_transaction_id' => $tx->id,
                'finalized_at' => now(),
                'finalized_by' => $user->id,
            ]);

            return $settlement->fresh(['items', 'property', 'targetWallet']);
        });
    }
}
