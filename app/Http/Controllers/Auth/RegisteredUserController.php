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
    public function create(): Response
    {
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
            'phone' => 'nullable|string|max:20',
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

        // Check if email verification is required
        if (config('app.require_email_verification', true)) {
            return to_route('verification.notice');
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
            'phone' => 'required|string|max:20',
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

            event(new Registered($user));

            Auth::login($user);

            // Create booking after user registration
            $bookingData = json_decode($request->booking_data, true);
            $property = \App\Models\Property::where('slug', $request->property_slug)->firstOrFail();
            
            // Create booking using the enhanced booking controller
            $bookingController = new \App\Http\Controllers\BookingController();
            $bookingRequest = new \Illuminate\Http\Request();
            $bookingRequest->merge($bookingData);
            $bookingRequest->setUserResolver(function () use ($user) {
                return $user;
            });

            // Store the booking (fixed method name)
            $bookingController->storeEnhanced($bookingRequest, $property);

            \DB::commit();

            return to_route('verification.notice')
                ->with('message', 'Account created and booking submitted successfully! Please check your email for login credentials and verify your email address.');

        } catch (\Exception $e) {
            \DB::rollback();
            return back()->withErrors(['error' => 'Failed to create account and booking. Please try again.']);
        }
    }
}
