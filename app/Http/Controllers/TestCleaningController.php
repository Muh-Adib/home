<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CleaningTask;
use App\Models\Property;
use App\Models\User;
use Inertia\Inertia;

class TestCleaningController extends Controller
{
    public function index()
    {
        try {
            // Test basic functionality
            $tasks = CleaningTask::with(['property', 'assignedTo', 'createdBy'])
                ->orderBy('created_at', 'desc')
                ->paginate(10);

            $properties = Property::select('id', 'name')->get();
            $staff = User::where('role', 'like', '%housekeeping%')->get();

            $stats = [
                'total' => CleaningTask::count(),
                'pending' => CleaningTask::where('status', 'pending')->count(),
                'in_progress' => CleaningTask::where('status', 'in_progress')->count(),
                'completed' => CleaningTask::where('status', 'completed')->count(),
            ];

            return Inertia::render('Admin/CleaningTasks/Index', [
                'tasks' => $tasks,
                'properties' => $properties,
                'staff' => $staff,
                'stats' => $stats,
                'taskTypes' => CleaningTask::TASK_TYPES,
                'priorities' => CleaningTask::PRIORITIES,
                'statuses' => CleaningTask::STATUSES,
                'cleaningAreas' => array_values(CleaningTask::DEFAULT_CLEANING_AREAS),
                'filters' => request()->only(['search', 'property_id', 'status', 'priority']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'CleaningTask functionality test failed',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function testData()
    {
        try {
            $data = [
                'cleaning_tasks_count' => CleaningTask::count(),
                'properties_count' => Property::count(),
                'users_count' => User::count(),
                'constants' => [
                    'task_types' => CleaningTask::TASK_TYPES,
                    'priorities' => CleaningTask::PRIORITIES,
                    'statuses' => CleaningTask::STATUSES,
                    'areas' => CleaningTask::DEFAULT_CLEANING_AREAS,
                ],
                'sample_task' => CleaningTask::with(['property', 'assignedTo'])->first(),
            ];

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }
}
