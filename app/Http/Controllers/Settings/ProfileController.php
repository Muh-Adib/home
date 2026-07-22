<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $user->load(['profile']);

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'user' => $user,
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($user->id),
            ],
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|image|max:2048',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'bio' => 'nullable|string|max:1000',
        ]);

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                \Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        // Extract user data - jangan gunakan filter() karena akan menghapus field yang kosong
        // Gunakan only() saja, dan hanya update field yang ada di validated
        $userData = collect($validated)->only([
            'name', 'email', 'phone', 'avatar',
        ])->toArray();

        // Update user - fill dan save untuk memastikan semua field ter-update
        $user->fill($userData);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        // Pastikan user tersimpan dengan perubahan
        if ($user->isDirty()) {
            $user->save();
        }

        // Extract profile data - jangan gunakan filter() karena field nullable perlu tetap di-update
        $profileData = collect($validated)->only([
            'address', 'city', 'state', 'country', 'postal_code',
            'birth_date', 'gender', 'bio',
        ])->toArray();

        // Filter hanya null/empty string yang tidak perlu di-update
        // Tapi tetap update field yang diisi (termasuk string kosong jika user mau hapus)
        $profileDataToUpdate = [];
        foreach ($profileData as $key => $value) {
            // Hanya masukkan ke array jika value tidak null
            // String kosong tetap diizinkan untuk menghapus value
            if ($value !== null) {
                $profileDataToUpdate[$key] = $value;
            }
        }

        // Update or create profile dengan user_id yang eksplisit
        if (! empty($profileDataToUpdate)) {
            $user->load('profile');
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                array_merge($profileDataToUpdate, [
                    'country' => $profileDataToUpdate['country'] ?? $user->profile?->country ?? 'Indonesia',
                ])
            );
        }

        return to_route('profile.edit')->with('success', 'Profile berhasil diperbarui');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->forceDelete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
