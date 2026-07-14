<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminCustomTaskController extends Controller
{
    /**
     * Display a listing of custom tasks.
     */
    public function index(Request $request): Response
    {
        $request->validate([
            'month' => 'nullable|integer|min:1|max:12',
            'year' => 'nullable|integer|min:2020|max:2050',
        ]);

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->toDateTimeString();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->toDateTimeString();

        $tasks = CustomTask::with(['members:id,name', 'creator:id,name'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')
            ->get();

        $staff = User::where('role', 'housekeeping')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/CustomTasks/Index', [
            'tasks' => $tasks,
            'staff' => $staff,
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
            'tiers' => $this->getTiersList(),
        ]);
    }

    /**
     * Store a newly created custom task and divide points among members.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'tier' => 'required|string|in:sss,ss,s,a,b,c,d,e',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'required|exists:users,id',
            'completed_at' => 'nullable|date',
        ]);

        $title = $request->input('title');
        $tier = $request->input('tier');
        $userIds = $request->input('user_ids');
        $completedAt = $request->input('completed_at') ? Carbon::parse($request->input('completed_at')) : now();

        $tierPoints = $this->getTierPoints($tier);
        $pointsPerMember = count($userIds) > 0 ? ($tierPoints / count($userIds)) : 0.00;

        \DB::transaction(function () use ($title, $tier, $tierPoints, $userIds, $pointsPerMember, $completedAt) {
            $task = CustomTask::create([
                'title' => $title,
                'tier' => $tier,
                'points' => $tierPoints,
                'completed_at' => $completedAt,
                'created_by' => auth()->id(),
            ]);

            $syncData = [];
            foreach ($userIds as $uid) {
                $syncData[(int) $uid] = ['points' => $pointsPerMember];
            }
            $task->members()->sync($syncData);
        });

        return redirect()->back()->with('success', 'Tugas khusus berhasil ditambahkan dan poin telah dibagi rata.');
    }

    /**
     * Delete a custom task.
     */
    public function destroy(CustomTask $customTask): RedirectResponse
    {
        $customTask->delete();

        return redirect()->back()->with('success', 'Tugas khusus berhasil dihapus.');
    }

    /**
     * Get points by tier.
     */
    private function getTierPoints(string $tier): float
    {
        return match (strtolower($tier)) {
            'sss' => 100.00,
            'ss' => 50.00,
            's' => 20.00,
            'a' => 10.00,
            'b' => 5.00,
            'c' => 2.00,
            'd' => 3.00,
            'e' => 2.00,
            default => 0.00,
        };
    }

    /**
     * Helper to get list of tiers with their default points.
     */
    private function getTiersList(): array
    {
        return [
            ['value' => 'sss', 'label' => 'SSS (100 Poin)', 'points' => 100],
            ['value' => 'ss', 'label' => 'SS (50 Poin)', 'points' => 50],
            ['value' => 's', 'label' => 'S (20 Poin)', 'points' => 20],
            ['value' => 'a', 'label' => 'A (10 Poin)', 'points' => 10],
            ['value' => 'b', 'label' => 'B (5 Poin)', 'points' => 5],
            ['value' => 'c', 'label' => 'C (2 Poin)', 'points' => 2],
            ['value' => 'd', 'label' => 'D (3 Poin)', 'points' => 3],
            ['value' => 'e', 'label' => 'E (2 Poin)', 'points' => 2],
        ];
    }
}
