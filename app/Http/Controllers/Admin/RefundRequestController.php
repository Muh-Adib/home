<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
// dummy or just used if needed
use App\Models\Income;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RefundRequestController extends Controller
{
    /**
     * Display a listing of refund requests
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $refundRequests = RefundRequest::with(['payment.booking.property', 'requestedBy', 'approvedBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Finance/Refunds', [
            'refundRequests' => $refundRequests,
        ]);
    }

    /**
     * Store a newly created refund request
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance', 'front_desk', 'property_manager'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:500',
            'bank_name' => 'required|string|max:100',
            'account_number' => 'required|string|max:50',
            'account_name' => 'required|string|max:150',
        ]);

        $payment = Payment::findOrFail($validated['payment_id']);

        // Check if amount exceeds payment amount
        if ($validated['amount'] > $payment->amount) {
            return redirect()->back()->withErrors(['amount' => 'Jumlah refund tidak boleh melebihi jumlah pembayaran.']);
        }

        // Check if there is already a pending refund request for this payment
        $existingPending = RefundRequest::where('payment_id', $payment->id)
            ->where('status', 'pending')
            ->exists();

        if ($existingPending) {
            return redirect()->back()->withErrors(['payment_id' => 'Sudah ada permintaan refund pending untuk pembayaran ini.']);
        }

        DB::transaction(function () use ($validated, $payment, $user) {
            RefundRequest::create([
                'payment_id' => $payment->id,
                'requested_by' => $user->id,
                'amount' => $validated['amount'],
                'reason' => $validated['reason'],
                'bank_name' => $validated['bank_name'],
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'status' => 'pending',
            ]);

            // Set payment status to pending_refund (matching our altered enum string status)
            $payment->update([
                'payment_status' => 'pending_refund',
            ]);
        });

        return redirect()->back()->with('success', 'Permintaan refund berhasil diajukan.');
    }

    /**
     * Approve a refund request
     */
    public function approve(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $refundRequest = RefundRequest::findOrFail($id);
        if ($refundRequest->status !== 'pending') {
            return redirect()->back()->withErrors(['status' => 'Permintaan refund sudah diproses.']);
        }

        $payment = $refundRequest->payment;
        $booking = $payment->booking;

        // Determine wallet to deduct from. We can deduct from the property's main wallet or a general wallet.
        // Let's find if the property has a wallet or if there is a default wallet.
        $wallet = null;
        if ($booking && $booking->property_id) {
            // Find wallet associated with property
            $wallet = Wallet::where('property_id', $booking->property_id)->first();
        }

        if (! $wallet) {
            // Fallback to the first available wallet
            $wallet = Wallet::orderBy('id', 'asc')->first();
        }

        if (! $wallet) {
            return redirect()->back()->withErrors(['wallet' => 'Tidak ada dompet/wallet yang tersedia untuk melakukan refund.']);
        }

        DB::transaction(function () use ($refundRequest, $payment, $wallet, $user) {
            $refundRequest->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            $payment->update([
                'payment_status' => 'refunded',
            ]);

            // Decrement wallet balance and record outgoing transaction
            $wallet->decrement('balance', $refundRequest->amount);

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'direction' => 'out',
                'amount' => $refundRequest->amount,
                'category' => 'expense',
                'transaction_date' => now()->toDateString(),
                'description' => "Refund Pembayaran #{$payment->payment_number} - Booking #{$payment->booking->booking_number}",
                'reference_type' => RefundRequest::class,
                'reference_id' => $refundRequest->id,
            ]);

            app(WalletService::class)->recalculateBalance($wallet->id);

            // Adjust/delete associated Income record to nullify revenue
            $income = Income::where('payment_id', $payment->id)
                ->orWhere(function ($q) use ($payment) {
                    // Fallback to matching via booking and amount
                    if ($payment->booking_id) {
                        $q->where('booking_id', $payment->booking_id)
                            ->where('amount', $payment->amount);
                    }
                })
                ->first();

            if ($income) {
                if ($refundRequest->amount >= $income->amount) {
                    $income->delete();
                } else {
                    $income->decrement('amount', $refundRequest->amount);
                }
            }
        });

        return redirect()->back()->with('success', 'Permintaan refund telah disetujui.');
    }

    /**
     * Reject a refund request
     */
    public function reject(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['super_admin', 'finance'])) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $refundRequest = RefundRequest::findOrFail($id);
        if ($refundRequest->status !== 'pending') {
            return redirect()->back()->withErrors(['status' => 'Permintaan refund sudah diproses.']);
        }

        $payment = $refundRequest->payment;

        DB::transaction(function () use ($refundRequest, $payment, $validated, $user) {
            $refundRequest->update([
                'status' => 'rejected',
                'approved_by' => $user->id,
                'rejected_at' => now(),
                'rejection_reason' => $validated['rejection_reason'],
            ]);

            // Restore payment status to verified (original status before request)
            $payment->update([
                'payment_status' => 'verified',
            ]);
        });

        return redirect()->back()->with('success', 'Permintaan refund telah ditolak.');
    }
}
