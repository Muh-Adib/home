<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HousekeepingSchedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminRoutineScheduleController extends Controller
{
    /**
     * Display routine schedules list & manager dashboard.
     */
    public function index(Request $request): Response
    {
        $request->validate([
            'month' => 'nullable|integer|min:1|max:12',
            'year' => 'nullable|integer|min:2020|max:2050',
        ]);

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();

        $schedules = HousekeepingSchedule::with(['user:id,name,role,gender'])
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date', 'asc')
            ->get();

        $staff = User::where('role', 'housekeeping')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'gender']);

        return Inertia::render('Admin/HousekeepingSchedules/Index', [
            'schedules' => $schedules,
            'staff' => $staff,
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);
    }

    /**
     * Generate randomized daily schedules for a date range.
     */
    public function generate(Request $request): RedirectResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'task_name' => 'required|string|max:255',
            'points' => 'required|numeric|min:0',
            'gender_target' => 'nullable|string|in:all,male,female',
        ]);

        $startDate = Carbon::parse($request->input('start_date'));
        $endDate = Carbon::parse($request->input('end_date'));
        $taskName = $request->input('task_name');
        $points = (float) $request->input('points', 1.00);
        $genderTarget = $request->input('gender_target', 'all');

        // Get active housekeeping staff
        $staffQuery = User::where('role', 'housekeeping')->active();

        // Enforce constraint: Night guard/standby shifts only assigned to male staff
        $isNightShift = Str::contains(strtolower($taskName), 'jaga malam') || Str::contains(strtolower($taskName), 'standby malam');
        if ($isNightShift) {
            $staffQuery->where('gender', 'male');
        } elseif ($genderTarget === 'male') {
            $staffQuery->where('gender', 'male');
        } elseif ($genderTarget === 'female') {
            $staffQuery->where('gender', 'female');
        }

        $staff = $staffQuery->get();

        if ($staff->isEmpty()) {
            $errorMsg = $isNightShift
                ? 'Gagal generate: Tidak ada staff kebersihan laki-laki yang aktif untuk tugas jaga malam.'
                : 'Gagal generate: Tidak ada staff kebersihan aktif yang memenuhi kriteria gender terpilih.';

            return redirect()->back()->with('error', $errorMsg);
        }

        $staffIds = $staff->pluck('id')->toArray();
        $currentDate = $startDate->copy();

        \DB::transaction(function () use ($currentDate, $endDate, $staffIds, $taskName, $points) {
            while ($currentDate->lte($endDate)) {
                $randomStaffId = $staffIds[array_rand($staffIds)];

                HousekeepingSchedule::updateOrCreate(
                    ['date' => $currentDate->toDateString()],
                    [
                        'user_id' => $randomStaffId,
                        'task_name' => $taskName,
                        'points' => $points,
                        'is_completed' => false,
                        'completed_at' => null,
                    ]
                );

                $currentDate->addDay();
            }
        });

        return redirect()->back()->with('success', 'Jadwal rutin berhasil diacak dan digenerate.');
    }

    /**
     * Manually update/reassign a specific schedule.
     */
    public function update(Request $request, HousekeepingSchedule $schedule): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'task_name' => 'required|string|max:255',
            'points' => 'required|numeric|min:0',
            'is_completed' => 'required|boolean',
        ]);

        $schedule->update([
            'user_id' => $validated['user_id'],
            'task_name' => $validated['task_name'],
            'points' => $validated['points'],
            'is_completed' => $validated['is_completed'],
            'completed_at' => $validated['is_completed'] ? ($schedule->completed_at ?? now()) : null,
        ]);

        return redirect()->back()->with('success', 'Jadwal rutin berhasil diperbarui.');
    }

    /**
     * Delete a schedule.
     */
    public function destroy(HousekeepingSchedule $schedule): RedirectResponse
    {
        $schedule->delete();

        return redirect()->back()->with('success', 'Jadwal rutin berhasil dihapus.');
    }
}
