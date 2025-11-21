<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
{
    // Proses autentikasi
    $request->authenticate();

    // Regenerasi session
    $request->session()->regenerate();

    // Update last_login
    $request->user()->update([
        'last_login' => now(),
    ]);

    // Ambil intended_url jika ada (hasil dari redirect sebelumnya)
    $manualIntended = session()->pull('intended_url');

    if ($manualIntended) {
        return redirect($manualIntended);
    }

    // Jika tidak ada manual intended url → pakai Laravel punya
    return redirect()->intended(route('dashboard'));
}


    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
