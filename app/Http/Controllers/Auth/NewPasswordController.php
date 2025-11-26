<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;

class NewPasswordController extends Controller
{
    /**
     * Reset password page (default Laravel flow)
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Handle default Laravel reset password.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'password_changed_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status == Password::PASSWORD_RESET) {
            return to_route('login')->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Page untuk user baru membuat password pertama kali.
     * Signed route memastikan token aman & tidak bisa dimanipulasi.
     */
    public function showSetPassword(Request $request, User $user): Response
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Invalid or expired link.');
        }

        return Inertia::render('auth/set-password', [
            'user' => $user->only(['id','email','name']),
            'email' => $user->email,
        ]);
    }


    /**
     * Handle set password pertama kali untuk user baru.
     */
    public function storeSetPassword(Request $request): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Invalid or expired link.');
        }

        $request->validate([
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $email = $request->query('email');

        $user = User::where('email', $email)->first();
        

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['User not found'],
            ]);
        }

        // Update password
        $user->forceFill([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
            'remember_token' => Str::random(60),
        ])->save();

        // Auto login
        auth()->login($user);

        return redirect()->intended('/dashboard');
    }
}
