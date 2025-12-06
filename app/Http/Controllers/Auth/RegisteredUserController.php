<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request): Response
    {
        // Store redirect URL in session if provided
        if ($request->has('redirect')) {
            $request->session()->put('intended_url', $request->query('redirect'));
        }

        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'phone' => 'required|string|max:20|unique:'.User::class,
            'gender' => 'nullable|in:male,female',
            'country' => 'required|string|max:100',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'gender' => $request->gender ?? 'male',
            'country' => $request->country,
            'password' => Hash::make($request->password),
            'role' => 'guest', // Default role for public registration
            'status' => 'active',
        ]);

        event(new Registered($user));

        Auth::login($user);

        // Update last login
        $user->update([
            'last_login' => now(),
        ]);

        // Check if email verification is required
        if (config('app.require_email_verification', true)) {
            // Don't pull intended_url yet, keep it for after verification
            return to_route('verification.notice');
        }

        // Only pull intended URL if no email verification required
        $manualIntended = session()->pull('intended_url');

        // Redirect to intended URL or dashboard
        if ($manualIntended) {
            return redirect($manualIntended);
        }

        return to_route('dashboard');
    }

    /**
     * Auto-register user from booking (for guest users)
     */
    public function autoRegister(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20|unique:'.User::class,
            'gender' => 'nullable|in:male,female',
            'country' => 'nullable|string|max:100',
            'booking_data' => 'required|string',
            'property_slug' => 'required|string',
        ]);
       
        \DB::beginTransaction();
        try {
            // Generate random password
            $password = \Str::random(12);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'gender' => $request->gender ?? 'male',
                'country' => $request->country ?? 'Indonesia',
                'password' => Hash::make($password),
                'role' => 'guest',
                'status' => 'active',
            ]);

            // Send password via email
            \Mail::to($user->email)->send(new \App\Mail\WelcomeGuest($user, $password));

            // Send password via Whatsapp

            event(new Registered($user));

            Auth::login($user);

            // Create booking after user registration
            $bookingData = json_decode($request->booking_data, true);
            $property = \App\Models\Property::where('slug', $request->property_slug)->firstOrFail();
            
            // Prepare booking data (same format as BookingController::createBookingNormally)
            $preparedBookingData = [
                'property_id' => $property->id,
                'check_in' => $bookingData['check_in'] ?? $bookingData['check_in_date'] ?? null,
                'check_out' => $bookingData['check_out'] ?? $bookingData['check_out_date'] ?? null,
                'check_in_time' => $bookingData['check_in_time'] ?? '15:00',
                'guest_male' => (int)($bookingData['guest_male'] ?? 1),
                'guest_female' => (int)($bookingData['guest_female'] ?? 1),
                'guest_children' => (int)($bookingData['guest_children'] ?? 0),
                'guest_count' => (int)($bookingData['guest_count'] ?? 
                    ((int)($bookingData['guest_male'] ?? 1) + (int)($bookingData['guest_female'] ?? 1) + (int)($bookingData['guest_children'] ?? 0))),
                'guest_name' => $bookingData['guest_name'] ?? $user->name,
                'guest_email' => $bookingData['guest_email'] ?? $user->email,
                'guest_phone' => $bookingData['guest_phone'] ?? $user->phone,
                'guest_country' => $bookingData['guest_country'] ?? $user->country ?? 'Indonesia',
                'guest_id_number' => $bookingData['guest_id_number'] ?? '',
                'guest_gender' => $bookingData['guest_gender'] ?? $user->gender ?? 'male',
                'relationship_type' => $bookingData['relationship_type'] ?? 'keluarga',
                'special_requests' => $bookingData['special_requests'] ?? '',
                'internal_notes' => $bookingData['internal_notes'] ?? '',
                'booking_status' => $bookingData['booking_status'] ?? 'pending_verification',
                'payment_status' => $bookingData['payment_status'] ?? 'dp_pending',
                'dp_percentage' => (int)($bookingData['dp_percentage'] ?? 50),
                'auto_confirm' => (bool)($bookingData['auto_confirm'] ?? false),
                'services' => $bookingData['services'] ?? [],
            ];

            // Validate required fields
            if (empty($preparedBookingData['check_in']) || empty($preparedBookingData['check_out'])) {
                throw new \InvalidArgumentException('Check-in and check-out dates are required');
            }

            // Create booking using BookingService (same as BookingController)
            $bookingService = app(\App\Services\BookingService::class);
            $bookingRequest = \App\Domain\Booking\ValueObjects\BookingRequest::fromArray($preparedBookingData);
            $booking = $bookingService->createBooking($bookingRequest, $user);
            
            // Create booking services if provided
            if (!empty($preparedBookingData['services']) && is_array($preparedBookingData['services'])) {
                $servicesTotal = 0;
                foreach ($preparedBookingData['services'] as $serviceData) {
                    $bookingServiceModel = \App\Models\BookingService::create([
                        'booking_id' => $booking->id,
                        'service_master_id' => $serviceData['service_master_id'] ?? null,
                        'service_name' => $serviceData['service_name'],
                        'service_type' => $serviceData['service_type'],
                        'quantity' => $serviceData['quantity'],
                        'unit_price' => $serviceData['unit_price'],
                        'total_price' => $serviceData['total_price'],
                    ]);
                    $servicesTotal += $bookingServiceModel->total_price;
                }

                // Update booking total amount to include services
                if ($servicesTotal > 0) {
                    $booking->update([
                        'total_amount' => $booking->total_amount + $servicesTotal,
                    ]);
                    // Recalculate DP and remaining amount
                    $booking->update([
                        'dp_amount' => ($booking->total_amount * $booking->dp_percentage) / 100,
                        'remaining_amount' => $booking->total_amount - (($booking->total_amount * $booking->dp_percentage) / 100),
                    ]);
                }
            }

            \DB::commit();

            return to_route('bookings.confirmation', $booking->booking_number)
                ->with('message', 'Account created and booking submitted successfully! Please check your email for login credentials and verify your email address.');

        } catch (\Exception $e) {
            \DB::rollback();
            return back()->withErrors(['error' => 'Failed to create account and booking. Please try again.']);
        }
    }
}
