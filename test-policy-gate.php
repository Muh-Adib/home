<?php

use App\Models\User;
use App\Models\Booking;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Gate;

// Test script untuk debugging Policy vs Gate
// Jalankan dengan: php artisan tinker

// 1. Test User Role
$user = User::first();
echo "User Role: " . $user->role . "\n";

// 2. Test Gate (Traditional Way)
echo "\n=== TESTING GATES ===\n";
echo "admin-access Gate: " . (Gate::allows('admin-access') ? 'ALLOWED' : 'DENIED') . "\n";
echo "super-admin-only Gate: " . (Gate::allows('super-admin-only') ? 'ALLOWED' : 'DENIED') . "\n";
echo "makePayment Gate: " . (Gate::allows('makePayment', Booking::first()) ? 'ALLOWED' : 'DENIED') . "\n";

// 3. Test Policy (Model-based Authorization)
echo "\n=== TESTING POLICIES ===\n";
$booking = Booking::first();
echo "makePayment Policy: " . ($user->can('makePayment', $booking) ? 'ALLOWED' : 'DENIED') . "\n";
echo "createForBooking Policy: " . ($user->can('createForBooking', $booking) ? 'ALLOWED' : 'DENIED') . "\n";

$paymentMethod = PaymentMethod::first();
echo "managePaymentMethods Policy: " . ($user->can('managePaymentMethods', $paymentMethod) ? 'ALLOWED' : 'DENIED') . "\n";

// 4. Debug Policy Registration
echo "\n=== DEBUGGING POLICY REGISTRATION ===\n";
$gate = app('Illuminate\Auth\Access\Gate');
$policies = $gate->policies();
echo "Registered Policies:\n";
foreach ($policies as $model => $policy) {
    echo "- {$model} => {$policy}\n";
}

// 5. Test dengan authorize()
echo "\n=== TESTING AUTHORIZE METHOD ===\n";
try {
    Gate::authorize('makePayment', $booking);
    echo "makePayment authorize: SUCCESS\n";
} catch (\Exception $e) {
    echo "makePayment authorize: FAILED - " . $e->getMessage() . "\n";
}

try {
    $user->can('managePaymentMethods', PaymentMethod::class);
    echo "managePaymentMethods can(): SUCCESS\n";
} catch (\Exception $e) {
    echo "managePaymentMethods can(): FAILED - " . $e->getMessage() . "\n";
} 