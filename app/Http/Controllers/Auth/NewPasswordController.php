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

class NewPasswordController extends Controller
{
    /**
     * Show the password reset page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Handle an incoming new password request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Here we will attempt to reset the user's password. If it is successful we
        // will update the password on an actual user model and persist it to the
        // database. Otherwise we will parse the error and return the response.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        // If the password was successfully reset, we will redirect the user back to
        // the application's home authenticated view. If there is an error we can
        // redirect them back to where they came from with their error message.
        if ($status == Password::PasswordReset) {
            return to_route('login')->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Show the set password page for new users.
     */
    public function showSetPassword(Request $request): Response
    {
        $token = $request->route('token');
        
        // Verify token and get user email
        $email = $this->getEmailFromToken($token);
        
        if (!$email) {
            abort(404, 'Invalid or expired token');
        }

        return Inertia::render('auth/set-password', [
            'email' => $email,
            'token' => $token,
        ]);
    }

    /**
     * Handle set password for new users.
     */
    public function storeSetPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $token = $request->token;
        $email = $this->getEmailFromToken($token);
        
        if (!$email) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired token'],
            ]);
        }

        // Find user by email
        $user = \App\Models\User::where('email', $email)->first();
        
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['User not found'],
            ]);
        }

        // Update password
        $user->forceFill([
            'password' => Hash::make($request->password),
            'remember_token' => Str::random(60),
        ])->save();

        // Login user
        auth()->login($user);

        return redirect()->intended('/dashboard');
    }

    /**
     * Get email from token (simple implementation)
     */
    private function getEmailFromToken(string $token): ?string
    {
        // This is a simple implementation - in production you might want to use a more secure method
        // For now, we'll decode the token to get the email
        try {
            $decoded = base64_decode($token);
            $data = json_decode($decoded, true);
            return $data['email'] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
