<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/password');
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back();
    }

    /**
     * Show change password page for new users (no current password required)
     */
    public function change(): Response
    {
        $user = auth()->user();
        $isNewUser = $user && $user->created_at->diffInHours(now()) < 24;

        if (!$isNewUser) {
            return redirect()->route('password.edit');
        }

        return Inertia::render('Auth/ChangePassword', [
            'isNewUser' => true,
        ]);
    }

    /**
     * Update password for new users (no current password required)
     */
    public function changePassword(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isNewUser = $user && $user->created_at->diffInHours(now()) < 24;

        if (!$isNewUser) {
            return redirect()->route('password.edit')
                ->withErrors(['error' => 'Halaman ini hanya untuk user baru.']);
        }

        $validated = $request->validate([
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Mark password as changed
        session(['password_changed' => true]);

        // Redirect to intended URL or dashboard
        $redirectUrl = session('redirect_after_password_change', route('dashboard'));
        session()->forget('redirect_after_password_change');

        return redirect($redirectUrl)
            ->with('success', 'Password berhasil diubah. Selamat datang!');
    }
}
