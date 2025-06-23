<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CleaningSchedule;
use App\Models\Property;
use App\Models\User;
use App\Models\CleaningTask;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class CleaningScheduleController extends Controller
{
    /**
     * Display a listing of cleaning schedules
     */
    public function index(Request $request): Response
    {
        $query = CleaningSchedule::with(['property', 'createdBy', 'defaultAssignedTo']);

        // Apply filters
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        if ($request->filled('schedule_type')) {
            $query->where('schedule_type', $request->schedule_type);
        }

        if ($request->filled('frequency')) {
            $query->where('frequency', $request->frequency);
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            } elseif ($request->status === 'expired') {
                $query->where('end_date', '<', now());
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        
        if (in_array($sortBy, ['name', 'schedule_type', 'frequency', 'created_at', 'start_date', 'next_generation_date'])) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $schedules = $query->paginate(20)->withQueryString();

        // Get filter options
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();

        // Get statistics
        $stats = [
            'total_schedules' => CleaningSchedule::count(),
            'active_schedules' => CleaningSchedule::where('is_active', true)->count(),
            'due_for_generation' => CleaningSchedule::dueForGeneration()->count(),
            'auto_generate_enabled' => CleaningSchedule::where('auto_generate_tasks', true)->count(),
            'expired_schedules' => CleaningSchedule::where('end_date', '<', now())->count(),
        ];

        return Inertia::render('Admin/CleaningSchedules/Index', [
            'schedules' => $schedules,
            'properties' => $properties,
            'staff' => $staff,
            'stats' => $stats,
            'filters' => $request->only(['property_id', 'schedule_type', 'frequency', 'status', 'search']),
            'scheduleTypes' => CleaningSchedule::SCHEDULE_TYPES,
            'frequencies' => CleaningSchedule::FREQUENCIES,
            'priorities' => CleaningSchedule::PRIORITIES,
        ]);
    }

    /**
     * Show the form for creating a new schedule
     */
    public function create(): Response
    {
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();

        return Inertia::render('Admin/CleaningSchedules/Create', [
            'properties' => $properties,
            'staff' => $staff,
            'scheduleTypes' => CleaningSchedule::SCHEDULE_TYPES,
            'frequencies' => CleaningSchedule::FREQUENCIES,
            'priorities' => CleaningSchedule::PRIORITIES,
            'daysOfWeek' => CleaningSchedule::DAYS_OF_WEEK,
            'defaultCleaningAreas' => CleaningTask::DEFAULT_CLEANING_AREAS,
        ]);
    }

    /**
     * Store a newly created schedule
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'default_assigned_to' => 'nullable|exists:users,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'schedule_type' => 'required|in:' . implode(',', array_keys(CleaningSchedule::SCHEDULE_TYPES)),
            'frequency' => 'required_if:schedule_type,recurring|in:' . implode(',', array_keys(CleaningSchedule::FREQUENCIES)),
            'days_of_week' => 'required_if:frequency,weekly,biweekly|array',
            'days_of_week.*' => 'integer|between:1,7',
            'day_of_month' => 'required_if:frequency,monthly|integer|between:1,31',
            'custom_dates' => 'required_if:frequency,custom|array',
            'custom_dates.*' => 'date',
            'preferred_time' => 'required|date_format:H:i',
            'estimated_duration' => 'required|date_format:H:i',
            'auto_generate_tasks' => 'boolean',
            'advance_days' => 'required|integer|min:1|max:30',
            'task_title_template' => 'required|string|max:255',
            'task_description_template' => 'nullable|string',
            'default_priority' => 'required|in:' . implode(',', array_keys(CleaningSchedule::PRIORITIES)),
            'cleaning_areas' => 'nullable|array',
            'cleaning_areas.*' => 'string',
            'checklist_template' => 'nullable|array',
            'special_instructions_template' => 'nullable|string',
            'estimated_cost' => 'required|numeric|min:0',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        // Set created_by
        $validated['created_by'] = auth()->id();
        $validated['is_active'] = true;

        $schedule = CleaningSchedule::create($validated);

        // Calculate and set next generation date
        $schedule->update([
            'next_generation_date' => $schedule->calculateNextGenerationDate()
        ]);

        return redirect()->route('admin.cleaning-schedules.show', $schedule)
            ->with('success', 'Cleaning schedule created successfully.');
    }

    /**
     * Display the specified schedule
     */
    public function show(CleaningSchedule $cleaningSchedule): Response
    {
        $cleaningSchedule->load([
            'property',
            'createdBy',
            'defaultAssignedTo',
        ]);

        // Get recent tasks from this schedule
        $recentTasks = $cleaningSchedule->cleaningTasks()
            ->with(['assignedTo', 'completedBy'])
            ->orderBy('scheduled_date', 'desc')
            ->limit(10)
            ->get();

        // Get upcoming tasks
        $upcomingTasks = $cleaningSchedule->cleaningTasks()
            ->with(['assignedTo'])
            ->where('scheduled_date', '>=', now())
            ->orderBy('scheduled_date', 'asc')
            ->limit(5)
            ->get();

        return Inertia::render('Admin/CleaningSchedules/Show', [
            'schedule' => $cleaningSchedule,
            'recentTasks' => $recentTasks,
            'upcomingTasks' => $upcomingTasks,
            'canEdit' => auth()->user()->can('update', $cleaningSchedule),
            'canDelete' => auth()->user()->can('delete', $cleaningSchedule),
        ]);
    }

    /**
     * Show the form for editing the schedule
     */
    public function edit(CleaningSchedule $cleaningSchedule): Response
    {
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();

        return Inertia::render('Admin/CleaningSchedules/Edit', [
            'schedule' => $cleaningSchedule,
            'properties' => $properties,
            'staff' => $staff,
            'scheduleTypes' => CleaningSchedule::SCHEDULE_TYPES,
            'frequencies' => CleaningSchedule::FREQUENCIES,
            'priorities' => CleaningSchedule::PRIORITIES,
            'daysOfWeek' => CleaningSchedule::DAYS_OF_WEEK,
            'defaultCleaningAreas' => CleaningTask::DEFAULT_CLEANING_AREAS,
        ]);
    }

    /**
     * Update the specified schedule
     */
    public function update(Request $request, CleaningSchedule $cleaningSchedule): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'default_assigned_to' => 'nullable|exists:users,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'frequency' => 'required_if:schedule_type,recurring|in:' . implode(',', array_keys(CleaningSchedule::FREQUENCIES)),
            'days_of_week' => 'required_if:frequency,weekly,biweekly|array',
            'days_of_week.*' => 'integer|between:1,7',
            'day_of_month' => 'required_if:frequency,monthly|integer|between:1,31',
            'custom_dates' => 'required_if:frequency,custom|array',
            'custom_dates.*' => 'date',
            'preferred_time' => 'required|date_format:H:i',
            'estimated_duration' => 'required|date_format:H:i',
            'auto_generate_tasks' => 'boolean',
            'advance_days' => 'required|integer|min:1|max:30',
            'task_title_template' => 'required|string|max:255',
            'task_description_template' => 'nullable|string',
            'default_priority' => 'required|in:' . implode(',', array_keys(CleaningSchedule::PRIORITIES)),
            'cleaning_areas' => 'nullable|array',
            'cleaning_areas.*' => 'string',
            'checklist_template' => 'nullable|array',
            'special_instructions_template' => 'nullable|string',
            'estimated_cost' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        // Recalculate next generation date if scheduling changed
        if ($this->schedulingChanged($cleaningSchedule, $validated)) {
            $validated['next_generation_date'] = $cleaningSchedule->calculateNextGenerationDate();
        }

        $cleaningSchedule->update($validated);

        return redirect()->route('admin.cleaning-schedules.show', $cleaningSchedule)
            ->with('success', 'Cleaning schedule updated successfully.');
    }

    /**
     * Remove the specified schedule
     */
    public function destroy(CleaningSchedule $cleaningSchedule): RedirectResponse
    {
        // Check if there are pending tasks
        $pendingTasks = $cleaningSchedule->cleaningTasks()
            ->whereIn('status', ['pending', 'assigned', 'in_progress'])
            ->count();

        if ($pendingTasks > 0) {
            return back()->withErrors(['error' => 'Cannot delete schedule with pending tasks.']);
        }

        $cleaningSchedule->delete();

        return redirect()->route('admin.cleaning-schedules.index')
            ->with('success', 'Cleaning schedule deleted successfully.');
    }

    /**
     * Activate schedule
     */
    public function activate(CleaningSchedule $cleaningSchedule): RedirectResponse
    {
        if ($cleaningSchedule->activate()) {
            return back()->with('success', 'Schedule activated successfully.');
        }

        return back()->withErrors(['error' => 'Failed to activate schedule.']);
    }

    /**
     * Deactivate schedule
     */
    public function deactivate(CleaningSchedule $cleaningSchedule): RedirectResponse
    {
        if ($cleaningSchedule->deactivate()) {
            return back()->with('success', 'Schedule deactivated successfully.');
        }

        return back()->withErrors(['error' => 'Failed to deactivate schedule.']);
    }

    /**
     * Generate tasks for schedule
     */
    public function generateTasks(Request $request, CleaningSchedule $cleaningSchedule): RedirectResponse
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:90',
        ]);

        try {
            $tasks = $cleaningSchedule->generateTasksForDays($validated['days']);
            
            $message = count($tasks) > 0 
                ? sprintf('Generated %d tasks successfully.', count($tasks))
                : 'No new tasks were generated.';

            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to generate tasks: ' . $e->getMessage()]);
        }
    }

    /**
     * Check if scheduling parameters changed
     */
    private function schedulingChanged(CleaningSchedule $schedule, array $validated): bool
    {
        $schedulingFields = [
            'frequency', 'days_of_week', 'day_of_month', 'custom_dates',
            'preferred_time', 'advance_days', 'start_date'
        ];

        foreach ($schedulingFields as $field) {
            if (isset($validated[$field]) && $schedule->$field !== $validated[$field]) {
                return true;
            }
        }

        return false;
    }
}
