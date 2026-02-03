<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerificationSignature
{
    /**
     * Handle an incoming request.
     * 
     * This middleware auto-logs in users who click email verification links
     * even if they're not currently authenticated. The signed URL middleware
     * ensures the link is valid and hasn't been tampered with.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If already authenticated, proceed
        if (Auth::check()) {
            return $next($request);
        }

        // Get user ID from route parameter
        $userId = $request->route('id');

        // Find user
        $user = User::find($userId);

        if (!$user) {
            abort(403, 'Invalid verification link.');
        }

        // Auto-login the user
        // The 'signed' middleware will validate the signature after this
        Auth::login($user);

        // Update last login timestamp
        $user->update(['last_login' => now()]);

        return $next($request);
    }
}
