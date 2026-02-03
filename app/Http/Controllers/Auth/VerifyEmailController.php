<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            // Already verified - redirect with message
            $manualIntended = session()->pull('intended_url');

            $redirect = $manualIntended
                ? redirect($manualIntended)
                : redirect()->intended(route('dashboard', absolute: false));

            return $redirect->with('message', 'Email already verified!');
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Check for intended URL after verification
        $manualIntended = session()->pull('intended_url');

        $redirect = $manualIntended
            ? redirect($manualIntended)
            : redirect()->intended(route('dashboard', absolute: false) . '?verified=1');

        return $redirect->with('message', 'Email verified successfully!');
    }
}
