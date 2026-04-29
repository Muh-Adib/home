<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Booking\CreateBookingAction;
use App\Actions\User\EnsureGuestUserAction;
use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
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
     * @throws ValidationException
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
            'last_login_at' => now(),
        ]);

        // Check if email verification is required
        if (config('app.require_email_verification', false)) {
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
            // 1. Create or Find User
            $ensureUserAction = app(EnsureGuestUserAction::class);
            $userData = [
                'guest_name' => $request->name,
                'guest_email' => $request->email,
                'guest_phone' => $request->phone,
            ];
            $user = $ensureUserAction->execute($userData);

            // 2. Auto Login
            Auth::login($user);
            event(new Registered($user));

            // 3. Create Booking via Action
            $bookingData = json_decode($request->booking_data, true);
            $property = Property::where('slug', $request->property_slug)->firstOrFail();
            $bookingData['property_id'] = $property->id;

            $createBookingAction = app(CreateBookingAction::class);
            $booking = $createBookingAction->execute($bookingData, $user);

            \DB::commit();

            return to_route('bookings.confirmation', $booking->booking_number)
                ->with('message', 'Account created and booking submitted successfully!');

        } catch (\Exception $e) {
            \DB::rollback();
            Log::error('Auto-register booking failed', [
                'error' => $e->getMessage(),
                'email' => $request->email,
            ]);

            return back()->withErrors(['error' => 'Failed to create account and booking: '.$e->getMessage()]);
        }
    }
}
