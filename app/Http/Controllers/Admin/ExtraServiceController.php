<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\ServiceMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ExtraServiceController extends Controller
{
    /**
     * Display a listing of extra services
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ServiceMaster::class);

        $query = ServiceMaster::ordered();

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Apply service type filter
        if ($request->filled('service_type') && $request->service_type !== 'all') {
            $query->where('service_type', $request->service_type);
        }

        // Apply status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $isActive = $request->status === 'active';
            $query->where('is_active', $isActive);
        }

        $services = $query->paginate(20)->through(function ($service) {
            return [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'service_type' => $service->service_type,
                'service_type_label' => $service->getServiceTypeLabel(),
                'unit_price' => (float) $service->unit_price,
                'vendor_unit_price' => (float) $service->vendor_unit_price,
                'discount_amount' => (float) $service->discount_amount,
                'discount_limit' => $service->discount_limit,
                'thumbnail_url' => $service->thumbnail_url,
                'is_active' => $service->is_active,
                'property_id' => $service->property_id,
                'is_default' => $service->is_default,
                'default_quantity' => $service->default_quantity,
                'default_frequency' => $service->default_frequency,
                'sort_order' => $service->sort_order,
                'created_at' => $service->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $service->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        // Get service type options
        $serviceTypes = [
            'extra_bed' => 'Tempat Tidur Tambahan',
            'breakfast' => 'Sarapan',
            'airport_transfer' => 'Transfer Bandara',
            'bbq_package' => 'Paket BBQ',
            'private_chef' => 'Chef Pribadi',
            'laundry' => 'Laundry',
            'tour_package' => 'Paket Tour',
            'motor_rental' => 'Rental Motor',
            'other' => 'Lainnya',
        ];

        return Inertia::render('Admin/ExtraServices/Index', [
            'services' => $services,
            'filters' => $request->only(['search', 'service_type', 'status']),
            'serviceTypes' => $serviceTypes,
        ]);
    }

    /**
     * Show the form for creating a new service
     */
    public function create(): Response
    {
        $this->authorize('create', ServiceMaster::class);

        $serviceTypes = [
            'extra_bed' => 'Tempat Tidur Tambahan',
            'breakfast' => 'Sarapan',
            'airport_transfer' => 'Transfer Bandara',
            'bbq_package' => 'Paket BBQ',
            'private_chef' => 'Chef Pribadi',
            'laundry' => 'Laundry',
            'tour_package' => 'Paket Tour',
            'motor_rental' => 'Rental Motor',
            'other' => 'Lainnya',
        ];

        $properties = Property::active()->get(['id', 'name']);

        return Inertia::render('Admin/ExtraServices/Create', [
            'serviceTypes' => $serviceTypes,
            'properties' => $properties,
        ]);
    }

    /**
     * Store a newly created service
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', ServiceMaster::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'service_type' => ['required', 'in:extra_bed,breakfast,airport_transfer,bbq_package,private_chef,laundry,tour_package,motor_rental,other'],
            'unit_price' => 'required|numeric|min:0',
            'vendor_unit_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_limit' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'thumbnail' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'property_id' => 'nullable|exists:properties,id',
            'is_default' => 'nullable|boolean',
            'default_quantity' => 'nullable|integer|min:1',
            'default_frequency' => 'nullable|in:once,per_night,first_night,first_two_nights',
        ]);

        // Get max sort_order if not provided
        if (! isset($validated['sort_order'])) {
            $validated['sort_order'] = ServiceMaster::max('sort_order') + 1;
        }

        // Handle thumbnail upload
        $thumbnailPath = null;
        if ($request->hasFile('thumbnail')) {
            $thumbnailPath = $this->storeThumbnail($request->file('thumbnail'));
        }

        $service = ServiceMaster::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'service_type' => $validated['service_type'],
            'unit_price' => $validated['unit_price'],
            'vendor_unit_price' => $validated['vendor_unit_price'] ?? 0,
            'discount_amount' => $validated['discount_amount'] ?? 0,
            'discount_limit' => $validated['discount_limit'] ?? null,
            'thumbnail_path' => $thumbnailPath,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'],
            'property_id' => $validated['property_id'] ?? null,
            'is_default' => (bool) ($validated['is_default'] ?? false),
            'default_quantity' => $validated['default_quantity'] ?? 1,
            'default_frequency' => $validated['default_frequency'] ?? 'once',
        ]);

        return redirect()
            ->route('admin.extra-services.index')
            ->with('success', 'Extra service berhasil ditambahkan.');
    }

    /**
     * Display the specified service
     */
    public function show(ServiceMaster $service): Response
    {
        $this->authorize('view', $service);

        return Inertia::render('Admin/ExtraServices/Show', [
            'service' => [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'service_type' => $service->service_type,
                'service_type_label' => $service->getServiceTypeLabel(),
                'unit_price' => (float) $service->unit_price,
                'thumbnail_url' => $service->thumbnail_url,
                'is_active' => $service->is_active,
                'sort_order' => $service->sort_order,
                'created_at' => $service->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $service->updated_at->format('Y-m-d H:i:s'),
                'booking_services_count' => $service->bookingServices()->count(),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified service
     */
    public function edit(ServiceMaster $service): Response
    {
        $this->authorize('update', $service);

        $serviceTypes = [
            'extra_bed' => 'Tempat Tidur Tambahan',
            'breakfast' => 'Sarapan',
            'airport_transfer' => 'Transfer Bandara',
            'bbq_package' => 'Paket BBQ',
            'private_chef' => 'Chef Pribadi',
            'laundry' => 'Laundry',
            'tour_package' => 'Paket Tour',
            'motor_rental' => 'Rental Motor',
            'other' => 'Lainnya',
        ];

        $properties = Property::active()->get(['id', 'name']);

        return Inertia::render('Admin/ExtraServices/Edit', [
            'service' => [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'service_type' => $service->service_type,
                'unit_price' => (float) $service->unit_price,
                'vendor_unit_price' => (float) $service->vendor_unit_price,
                'discount_amount' => (float) $service->discount_amount,
                'discount_limit' => $service->discount_limit,
                'thumbnail_url' => $service->thumbnail_url,
                'thumbnail_path' => $service->thumbnail_path,
                'is_active' => $service->is_active,
                'sort_order' => $service->sort_order,
                'property_id' => $service->property_id,
                'is_default' => $service->is_default,
                'default_quantity' => $service->default_quantity,
                'default_frequency' => $service->default_frequency,
            ],
            'serviceTypes' => $serviceTypes,
            'properties' => $properties,
        ]);
    }

    /**
     * Update the specified service
     */
    public function update(Request $request, ServiceMaster $service): RedirectResponse
    {
        $this->authorize('update', $service);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'service_type' => ['required', 'in:extra_bed,breakfast,airport_transfer,bbq_package,private_chef,laundry,tour_package,motor_rental,other'],
            'unit_price' => 'required|numeric|min:0',
            'vendor_unit_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_limit' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'thumbnail' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'property_id' => 'nullable|exists:properties,id',
            'is_default' => 'nullable|boolean',
            'default_quantity' => 'nullable|integer|min:1',
            'default_frequency' => 'nullable|in:once,per_night,first_night,first_two_nights',
        ]);

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            // Delete old thumbnail
            if ($service->thumbnail_path) {
                Storage::disk('public')->delete($service->thumbnail_path);
            }
            $validated['thumbnail_path'] = $this->storeThumbnail($request->file('thumbnail'));
        }

        $service->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'service_type' => $validated['service_type'],
            'unit_price' => $validated['unit_price'],
            'vendor_unit_price' => $validated['vendor_unit_price'] ?? 0,
            'discount_amount' => $validated['discount_amount'] ?? 0,
            'discount_limit' => $validated['discount_limit'] ?? null,
            'is_active' => $validated['is_active'] ?? $service->is_active,
            'sort_order' => $validated['sort_order'] ?? $service->sort_order,
            'thumbnail_path' => $validated['thumbnail_path'] ?? $service->thumbnail_path,
            'property_id' => $validated['property_id'] ?? null,
            'is_default' => (bool) ($validated['is_default'] ?? false),
            'default_quantity' => $validated['default_quantity'] ?? 1,
            'default_frequency' => $validated['default_frequency'] ?? 'once',
        ]);

        return redirect()
            ->route('admin.extra-services.index')
            ->with('success', 'Extra service berhasil diperbarui.');
    }

    /**
     * Remove the specified service
     */
    public function destroy(ServiceMaster $service): RedirectResponse
    {
        $this->authorize('delete', $service);

        // Check if service is used in any bookings
        if ($service->bookingServices()->count() > 0) {
            return redirect()
                ->route('admin.extra-services.index')
                ->with('error', 'Tidak dapat menghapus service yang sudah digunakan dalam booking.');
        }

        // Delete thumbnail
        if ($service->thumbnail_path) {
            Storage::disk('public')->delete($service->thumbnail_path);
        }

        $service->delete();

        return redirect()
            ->route('admin.extra-services.index')
            ->with('success', 'Extra service berhasil dihapus.');
    }

    /**
     * Toggle service status
     */
    public function toggleStatus(ServiceMaster $service): JsonResponse
    {
        $this->authorize('update', $service);

        $service->update([
            'is_active' => ! $service->is_active,
        ]);

        return response()->json([
            'success' => true,
            'is_active' => $service->is_active,
            'message' => $service->is_active ? 'Service diaktifkan.' : 'Service dinonaktifkan.',
        ]);
    }

    /**
     * Upload thumbnail for service
     */
    public function uploadThumbnail(Request $request, ServiceMaster $service): JsonResponse
    {
        $this->authorize('update', $service);

        $validator = Validator::make($request->all(), [
            'thumbnail' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Delete old thumbnail
        if ($service->thumbnail_path) {
            Storage::disk('public')->delete($service->thumbnail_path);
        }

        $thumbnailPath = $this->storeThumbnail($request->file('thumbnail'));

        $service->update(['thumbnail_path' => $thumbnailPath]);

        return response()->json([
            'success' => true,
            'thumbnail_url' => $service->fresh()->thumbnail_url,
            'message' => 'Thumbnail berhasil diupload.',
        ]);
    }

    /**
     * Store thumbnail and generate optimized version
     */
    private function storeThumbnail($file): string
    {
        // Generate secure filename
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $extension = $file->getClientOriginalExtension();
        $safeName = Str::slug($originalName).'_'.time().'_'.Str::random(8).'.'.$extension;

        // Store in service-masters directory
        $directory = 'service-masters';
        $path = $file->storeAs($directory, $safeName, 'public');

        // Generate thumbnail (300x200px cover crop)
        $fullPath = Storage::disk('public')->path($path);
        $manager = new ImageManager(new Driver);
        $image = $manager->read($fullPath);
        $image->cover(300, 200);
        $image->save($fullPath, quality: 85);

        return $path;
    }
}
