<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CleaningTask;
use App\Models\Property;
use App\Models\User;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CleaningTaskController extends Controller
{
    /**
     * Display a listing of cleaning tasks
     */
    public function index(Request $request): Response
    {
        $query = CleaningTask::with(['property', 'assignedTo', 'booking', 'createdBy']);

        // Apply filters
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('task_type')) {
            $query->where('task_type', $request->task_type);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('scheduled_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('scheduled_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('task_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort', 'scheduled_date');
        $sortDirection = $request->get('direction', 'asc');
        
        if (in_array($sortBy, ['scheduled_date', 'created_at', 'priority', 'status'])) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $tasks = $query->paginate(20)->withQueryString();

        // Get filter options
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();

        // Get statistics
        $stats = [
            'total' => CleaningTask::count(),
            'pending' => CleaningTask::where('status', 'pending')->count(),
            'in_progress' => CleaningTask::where('status', 'in_progress')->count(),
            'completed_today' => CleaningTask::where('status', 'completed')
                ->whereDate('completed_at', today())->count(),
            'overdue' => CleaningTask::overdue()->count(),
        ];

        return Inertia::render('Admin/CleaningTasks/Index', [
            'tasks' => $tasks,
            'properties' => $properties,
            'staff' => $staff,
            'stats' => $stats,
            'filters' => $request->only(['property_id', 'status', 'task_type', 'priority', 'assigned_to', 'date_from', 'date_to', 'search']),
            'taskTypes' => CleaningTask::TASK_TYPES,
            'priorities' => CleaningTask::PRIORITIES,
            'statuses' => CleaningTask::STATUSES,
        ]);
    }

    /**
     * Show the form for creating a new task
     */
    public function create(): Response
    {
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();
        $bookings = Booking::with('property')
            ->where('booking_status', 'confirmed')
            ->whereDate('check_out', '>=', today())
            ->select('id', 'booking_number', 'property_id', 'guest_name', 'check_in', 'check_out')
            ->get();

        return Inertia::render('Admin/CleaningTasks/Create', [
            'properties' => $properties,
            'staff' => $staff,
            'bookings' => $bookings,
            'taskTypes' => CleaningTask::TASK_TYPES,
            'priorities' => CleaningTask::PRIORITIES,
            'cleaningAreas' => CleaningTask::DEFAULT_CLEANING_AREAS,
        ]);
    }

    /**
     * Store a newly created task
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'booking_id' => 'nullable|exists:bookings,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'task_type' => 'required|in:' . implode(',', array_keys(CleaningTask::TASK_TYPES)),
            'priority' => 'required|in:' . implode(',', array_keys(CleaningTask::PRIORITIES)),
            'scheduled_date' => 'required|date|after_or_equal:today',
            'estimated_duration' => 'required|date_format:H:i',
            'deadline' => 'nullable|date|after:scheduled_date',
            'cleaning_areas' => 'nullable|array',
            'cleaning_areas.*' => 'string',
            'checklist' => 'nullable|array',
            'special_instructions' => 'nullable|string',
            'estimated_cost' => 'nullable|numeric|min:0',
        ]);

        // Set created_by
        $validated['created_by'] = auth()->id();

        // Set status based on assignment
        $validated['status'] = $validated['assigned_to'] ? 'assigned' : 'pending';

        // Create checklist from cleaning areas if not provided
        if (!isset($validated['checklist']) && isset($validated['cleaning_areas'])) {
            $validated['checklist'] = array_map(function($area) {
                return [
                    'area' => $area,
                    'tasks' => $this->getDefaultTasksForArea($area),
                    'completed' => false,
                ];
            }, $validated['cleaning_areas']);
        }

        $task = CleaningTask::create($validated);

        return redirect()->route('admin.cleaning-tasks.show', $task)
            ->with('success', 'Cleaning task created successfully.');
    }

    /**
     * Display the specified task
     */
    public function show(CleaningTask $cleaningTask): Response
    {
        $cleaningTask->load([
            'property',
            'booking.bookingGuests',
            'assignedTo',
            'createdBy',
            'completedBy',
            'reviewedBy',
        ]);

        return Inertia::render('Admin/CleaningTasks/Show', [
            'task' => $cleaningTask,
            'canEdit' => auth()->user()->can('update', $cleaningTask),
            'canAssign' => auth()->user()->can('assign', $cleaningTask),
            'canComplete' => auth()->user()->can('complete', $cleaningTask),
        ]);
    }

    /**
     * Show the form for editing the task
     */
    public function edit(CleaningTask $cleaningTask): Response
    {
        $properties = Property::select('id', 'name')->where('status', 'active')->get();
        $staff = User::select('id', 'name')->where('role', 'housekeeping')->get();

        return Inertia::render('Admin/CleaningTasks/Edit', [
            'task' => $cleaningTask,
            'properties' => $properties,
            'staff' => $staff,
            'taskTypes' => CleaningTask::TASK_TYPES,
            'priorities' => CleaningTask::PRIORITIES,
            'cleaningAreas' => CleaningTask::DEFAULT_CLEANING_AREAS,
        ]);
    }

    /**
     * Update the specified task
     */
    public function update(Request $request, CleaningTask $cleaningTask): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:' . implode(',', array_keys(CleaningTask::PRIORITIES)),
            'scheduled_date' => 'required|date',
            'estimated_duration' => 'required|date_format:H:i',
            'deadline' => 'nullable|date|after:scheduled_date',
            'cleaning_areas' => 'nullable|array',
            'special_instructions' => 'nullable|string',
            'estimated_cost' => 'nullable|numeric|min:0',
        ]);

        $cleaningTask->update($validated);

        return redirect()->route('admin.cleaning-tasks.show', $cleaningTask)
            ->with('success', 'Cleaning task updated successfully.');
    }

    /**
     * Remove the specified task
     */
    public function destroy(CleaningTask $cleaningTask): RedirectResponse
    {
        if (!in_array($cleaningTask->status, ['pending', 'assigned'])) {
            return back()->withErrors(['error' => 'Cannot delete task that is in progress or completed.']);
        }

        $cleaningTask->delete();

        return redirect()->route('admin.cleaning-tasks.index')
            ->with('success', 'Cleaning task deleted successfully.');
    }

    /**
     * Bulk actions for cleaning tasks
     */
    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'task_ids' => 'required|array',
            'task_ids.*' => 'exists:cleaning_tasks,id',
            'action' => 'required|in:assign,start,complete,delete',
        ]);

        $taskIds = $request->task_ids;
        $action = $request->action;
        $tasks = CleaningTask::whereIn('id', $taskIds)->get();
        
        $successCount = 0;
        $errorCount = 0;
        $errors = [];

        foreach ($tasks as $task) {
            try {
                switch ($action) {
                    case 'assign':
                        if ($task->status === 'pending' && $request->assigned_to) {
                            $task->update(['assigned_to' => $request->assigned_to, 'status' => 'assigned']);
                            $successCount++;
                        } else {
                            $errorCount++;
                            $errors[] = "Task {$task->task_number} cannot be assigned in current status";
                        }
                        break;
                        
                    case 'start':
                        if ($task->status === 'assigned') {
                            $task->update(['status' => 'in_progress', 'started_at' => now()]);
                            $successCount++;
                        } else {
                            $errorCount++;
                            $errors[] = "Task {$task->task_number} cannot be started in current status";
                        }
                        break;
                        
                    case 'complete':
                        if ($task->status === 'in_progress') {
                            $task->update([
                                'status' => 'completed',
                                'completed_at' => now(),
                                'completed_by' => auth()->id()
                            ]);
                            $successCount++;
                        } else {
                            $errorCount++;
                            $errors[] = "Task {$task->task_number} cannot be completed in current status";
                        }
                        break;
                        
                    case 'delete':
                        if (in_array($task->status, ['pending', 'assigned'])) {
                            $task->delete();
                            $successCount++;
                        } else {
                            $errorCount++;
                            $errors[] = "Task {$task->task_number} cannot be deleted in current status";
                        }
                        break;
                }
            } catch (\Exception $e) {
                $errorCount++;
                $errors[] = "Error processing task {$task->task_number}: " . $e->getMessage();
            }
        }

        $message = "Bulk action completed: {$successCount} successful, {$errorCount} failed.";
        if (!empty($errors)) {
            return back()->withErrors(['bulk_errors' => $errors])->with('success', $message);
        }

        return back()->with('success', $message);
    }

    /**
     * Assign task to staff member
     */
    public function assign(Request $request, CleaningTask $cleaningTask): RedirectResponse
    {
        $request->validate([
            'assigned_to' => 'required|exists:users,id',
        ]);

        if (!$cleaningTask->assignTo($request->assigned_to)) {
            return back()->withErrors(['error' => 'Task cannot be assigned in current status.']);
        }

        return back()->with('success', 'Task assigned successfully.');
    }

    /**
     * Start task
     */
    public function start(CleaningTask $cleaningTask): RedirectResponse
    {
        if (!$cleaningTask->markAsStarted(auth()->id())) {
            return back()->withErrors(['error' => 'Task cannot be started in current status.']);
        }

        return back()->with('success', 'Task started successfully.');
    }

    /**
     * Complete task
     */
    public function complete(Request $request, CleaningTask $cleaningTask): RedirectResponse
    {
        $validated = $request->validate([
            'completion_notes' => 'nullable|string',
            'actual_cost' => 'nullable|numeric|min:0',
            'checklist' => 'nullable|array',
            'after_photos' => 'nullable|array',
            'after_photos.*' => 'string', // Base64 or file paths
        ]);

        if (!$cleaningTask->markAsCompleted(auth()->id(), $validated)) {
            return back()->withErrors(['error' => 'Task cannot be completed in current status.']);
        }

        return back()->with('success', 'Task completed successfully.');
    }

    /**
     * Submit task for review
     */
    public function submitForReview(CleaningTask $cleaningTask): RedirectResponse
    {
        if (!$cleaningTask->submitForReview()) {
            return back()->withErrors(['error' => 'Task cannot be submitted for review in current status.']);
        }

        return back()->with('success', 'Task submitted for review.');
    }

    /**
     * Approve task
     */
    public function approve(Request $request, CleaningTask $cleaningTask): RedirectResponse
    {
        $validated = $request->validate([
            'quality_rating' => 'required|in:' . implode(',', array_keys(CleaningTask::QUALITY_RATINGS)),
            'quality_notes' => 'nullable|string',
        ]);

        if (!$cleaningTask->approve(auth()->id(), $validated)) {
            return back()->withErrors(['error' => 'Task cannot be approved in current status.']);
        }

        return back()->with('success', 'Task approved successfully.');
    }

    /**
     * Get tasks calendar data
     */
    public function calendar(Request $request)
    {
        $start = $request->get('start', now()->startOfMonth());
        $end = $request->get('end', now()->endOfMonth());

        $tasks = CleaningTask::with(['property', 'assignedTo'])
            ->whereBetween('scheduled_date', [$start, $end])
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'start' => $task->scheduled_date->toISOString(),
                    'end' => $task->scheduled_date->copy()->addMinutes($task->estimated_duration_in_minutes)->toISOString(),
                    'backgroundColor' => $this->getTaskColor($task),
                    'borderColor' => $this->getTaskColor($task),
                    'extendedProps' => [
                        'property' => $task->property->name,
                        'assigned_to' => $task->assignedTo?->name,
                        'status' => $task->status,
                        'priority' => $task->priority,
                        'task_type' => $task->task_type,
                    ],
                ];
            });

        return response()->json($tasks);
    }

    /**
     * Get default tasks for cleaning area
     */
    private function getDefaultTasksForArea(string $area): array
    {
        $defaultTasks = [
            'bedroom' => ['Change bed linens', 'Vacuum floor', 'Dust surfaces', 'Clean windows'],
            'bathroom' => ['Clean toilet', 'Clean shower/bathtub', 'Clean mirrors', 'Restock amenities'],
            'kitchen' => ['Clean appliances', 'Wipe counters', 'Clean sink', 'Check supplies'],
            'living_room' => ['Vacuum/sweep floor', 'Dust furniture', 'Arrange furniture', 'Clean windows'],
            'outdoor' => ['Clean pool', 'Tidy garden', 'Check outdoor furniture', 'Empty trash'],
        ];

        return $defaultTasks[$area] ?? ['General cleaning'];
    }

    /**
     * Get task color based on status and priority
     */
    private function getTaskColor(CleaningTask $task): string
    {
        if ($task->status === 'completed') {
            return '#10b981'; // green
        } elseif ($task->status === 'in_progress') {
            return '#f59e0b'; // yellow
        } elseif ($task->is_overdue) {
            return '#ef4444'; // red
        } elseif ($task->priority === 'urgent') {
            return '#dc2626'; // dark red
        } elseif ($task->priority === 'high') {
            return '#ea580c'; // orange
        } else {
            return '#6b7280'; // gray
        }
    }
}
