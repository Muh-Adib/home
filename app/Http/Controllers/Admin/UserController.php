<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $roleGroup = $request->input('role_group', 'staff');

        $query = User::with(['profile'])
            ->latest();

        // Apply role group filtering
        if ($roleGroup === 'staff') {
            $query->staff();
        } elseif ($roleGroup === 'owner') {
            $query->where('role', 'property_owner');
        } elseif ($roleGroup === 'guest') {
            $query->where('role', 'guest');
        }

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Apply role filter
        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        // Apply status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $users = $query->paginate(20);

        // Get statistics
        $stats = [
            'total_users' => User::count(),
            'active_users' => User::where('status', 'active')->count(),
            'pending_users' => User::where('status', 'inactive')->count(),
            'role_breakdown' => User::groupBy('role')
                ->selectRaw('role, count(*) as count')
                ->pluck('count', 'role')
                ->toArray(),
        ];

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $request->input('search'),
                'role' => $request->input('role'),
                'status' => $request->input('status'),
                'role_group' => $roleGroup,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for creating a new user
     */
    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('Admin/Users/Create');
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['super_admin', 'property_owner', 'property_manager', 'front_desk', 'housekeeping', 'finance', 'guest', 'content_creator'])],
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'password' => 'required|string|min:8|confirmed',
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
        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role' => $validated['role'],
            'status' => $validated['status'],
            'password' => Hash::make($validated['password']),
            'avatar' => $avatarPath,
        ]);

        // Create user profile
        $user->profile()->create([
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'country' => $validated['country'] ?? 'Indonesia',
            'postal_code' => $validated['postal_code'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'bio' => $validated['bio'] ?? null,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully');
    }

    /**
     * Display the specified user
     */
    public function show(User $user): Response
    {
        $this->authorize('view', $user);

        $user->load(['profile']);

        // Add additional user information
        $user->setAttribute('last_login_at', $user->last_login_at);

        return Inertia::render('Admin/Users/Show', [
            'user' => $user,
        ]);
    }

    /**
     * Show the form for editing the specified user
     */
    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        $user->load(['profile']);

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user,
        ]);
    }

    /**
     * Update the specified user
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $this->authorize('update', $user);

        $validated = $request->validated();

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                \Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        // Remove password_confirmation from validated data (not needed for database)
        unset($validated['password_confirmation']);

        // Password akan otomatis di-hash oleh User model karena ada cast 'hashed'
        // Jangan gunakan Hash::make() lagi karena akan double hash
        // Jika password tidak diisi, unset dari validated
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        // Extract profile data
        $profileData = collect($validated)->only([
            'address', 'city', 'state', 'country', 'postal_code',
            'birth_date', 'gender', 'bio',
        ])->toArray();

        // Extract user data (exclude profile fields)
        $userData = collect($validated)->except([
            'address', 'city', 'state', 'country', 'postal_code',
            'birth_date', 'gender', 'bio',
        ])->toArray();

        // Update user - pastikan semua field yang ada di $userData ter-update
        if (! empty($userData)) {
            $user->fill($userData);
            $user->save();
        }

        // Update or create profile
        // Gunakan array_filter untuk menghapus null/empty tapi tetap update field yang diisi
        $profileDataToUpdate = array_filter($profileData, function ($value) {
            return $value !== null && $value !== '';
        });

        if (! empty($profileDataToUpdate)) {
            $user->load('profile');
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                array_merge($profileDataToUpdate, [
                    'country' => $profileDataToUpdate['country'] ?? $user->profile?->country ?? 'Indonesia',
                ])
            );
        }

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully');
    }

    /**
     * Remove the specified user
     */
    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        // Don't allow deleting current user
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot delete your own account']);
        }

        // Delete avatar if exists
        if ($user->avatar) {
            \Storage::disk('public')->delete($user->avatar);
        }

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully');
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        // Don't allow deactivating current user
        if ($user->id === auth()->id() && $request->status !== 'active') {
            return back()->withErrors(['error' => 'Anda tidak dapat menonaktifkan akun Anda sendiri']);
        }

        $user->update([
            'status' => $request->status,
        ]);

        $statusLabel = [
            'active' => 'diaktifkan',
            'inactive' => 'dinonaktifkan',
            'suspended' => 'di-suspend',
        ];

        return back()->with('success', "Status user berhasil {$statusLabel[$request->status]}");
    }

    public function activities(User $user, Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $query = UserActivityLog::where('user_id', $user->id)
            ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('description', 'like', "%{$search}%");
        }

        $activities = $query->paginate(20);

        return Inertia::render('Admin/Users/Activities', [
            'targetUser' => $user,
            'activities' => $activities,
            'filters' => [
                'search' => $request->input('search'),
            ],
        ]);
    }
}
