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
       
        if ($request->user()->hasVerifiedEmail()) {
            // Check for intended URL
            $manualIntended = session()->pull('intended_url');
            
            if ($manualIntended) {
                return redirect($manualIntended);
            }
            
            return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
        }

        if ($request->user()->markEmailAsVerified()) {
            /** @var \Illuminate\Contracts\Auth\MustVerifyEmail $user */
            $user = $request->user();

            event(new Verified($user));
        }

        // Check for intended URL after verification
        $manualIntended = session()->pull('intended_url');
        
        if ($manualIntended) {
            return redirect($manualIntended);
        }

        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }
}
