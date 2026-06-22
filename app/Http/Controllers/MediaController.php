<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyMedia;
use App\Services\ImageService;
use App\Services\PropertyMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MediaController extends Controller
{
    public function __construct(
        private PropertyMediaService $mediaService
    ) {}

    /**
     * Upload property media
     */
    public function upload(Request $request, Property $property)
    {
        $this->authorize('update', $property);

        $request->validate([
            'files' => 'required|array|max:50',
            'files.*' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,mp4,mov,avi,webm',
                'max:102400', // 100MB max file size (konsisten dengan PHP config)
                function ($attribute, $value, $fail) {
                    // Custom validation for file content security
                    if ($value->getMimeType() && str_starts_with($value->getMimeType(), 'image/')) {
                        if (! $this->mediaService->isValidImageFile($value)) {
                            $fail('The '.$attribute.' contains invalid or potentially dangerous content.');
                        }
                        // Validate image dimensions
                        $imageInfo = @getimagesize($value->getRealPath());
                        if ($imageInfo) {
                            [$width, $height] = $imageInfo;
                            if ($width < 100 || $height < 100 || $width > 8192 || $height > 8192) {
                                $fail('Images must be between 100x100 and 8192x8192 pixels.');
                            }
                        }
                    }
                },
            ],
        ], [
            'files.required' => 'Please select at least one file to upload.',
            'files.array' => 'Files must be uploaded as an array.',
            'files.max' => 'You can upload maximum 50 files at once.',
            'files.*.required' => 'Each file is required.',
            'files.*.file' => 'Each item must be a valid file.',
            'files.*.mimes' => 'Only JPG, JPEG, PNG, WebP, GIF, MP4, MOV, AVI, and WebM files are allowed.',
            'files.*.max' => 'Each file must be less than 100MB.',
        ]);

        // Debug logging
        \Log::info('Media upload request', [
            'property_id' => $property->id,
            'user_id' => auth()->id(),
            'files_count' => count($request->file('files')),
            'ip' => $request->ip(),
        ]);

        try {
            DB::beginTransaction();

            $uploadedMedia = $this->mediaService->storeMedia($request->file('files'), $property);

            $uploadedFiles = [];
            foreach ($uploadedMedia as $media) {
                $uploadedFiles[] = [
                    'id' => $media->id,
                    'file_name' => $media->file_name,
                    'url' => $media->url,
                    'size' => $media->file_size,
                ];

                \Log::info('File uploaded successfully', [
                    'media_id' => $media->id,
                    'property_id' => $property->id,
                    'file_name' => $media->file_name,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Files uploaded successfully',
                'files' => $uploadedFiles,
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            \Log::error('Media upload failed', [
                'property_id' => $property->id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update media details
     */
    public function update(Request $request, PropertyMedia $media): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|in:exterior,living_room,bedroom,kitchen,bathroom,amenities,tour',
            'display_order' => 'nullable|integer|min:0',
            'is_featured' => 'boolean',
            'is_cover' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // If setting as featured, unset other featured images for this property
        if ($request->input('is_featured')) {
            PropertyMedia::where('property_id', $media->property_id)
                ->where('id', '!=', $media->id)
                ->update(['is_featured' => false]);
        }

        // If setting as cover, unset other cover images for this property
        if ($request->input('is_cover')) {
            PropertyMedia::where('property_id', $media->property_id)
                ->where('id', '!=', $media->id)
                ->update(['is_cover' => false]);
        }

        $updateData = $request->only(['title', 'alt_text', 'category', 'is_featured', 'is_cover']);
        if ($request->has('description')) {
            $updateData['description'] = $request->input('description');
        }
        if ($request->has('display_order')) {
            $updateData['display_order'] = $request->input('display_order');
        }

        $media->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Media updated successfully',
            'data' => $media->fresh(),
        ]);
    }

    /**
     * Delete media
     */
    public function destroy(PropertyMedia $media): JsonResponse
    {
        try {
            // Delete files from storage
            Storage::disk('public')->delete($media->file_path);
            if ($media->thumbnail_path) {
                Storage::disk('public')->delete($media->thumbnail_path);
            }

            $media->delete();

            return response()->json([
                'success' => true,
                'message' => 'Media deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete media: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reorder media
     */
    public function reorder(Request $request, Property $property): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'media_ids' => 'required|array',
            'media_ids.*' => 'integer|exists:property_media,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $mediaIds = $request->input('media_ids');

        foreach ($mediaIds as $index => $mediaId) {
            PropertyMedia::where('id', $mediaId)
                ->where('property_id', $property->id)
                ->update(['display_order' => $index + 1]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Media reordered successfully',
        ]);
    }

    /**
     * Get property media
     */
    public function index(Property $property): JsonResponse
    {
        $media = $property->media()
            ->orderBy('display_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $media,
        ]);
    }

    /**
     * Set featured image
     */
    public function setFeatured(Request $request, PropertyMedia $media): JsonResponse
    {
        // Unset current featured image
        PropertyMedia::where('property_id', $media->property_id)
            ->update(['is_featured' => false]);

        // Set new featured image
        $media->update(['is_featured' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Featured image updated successfully',
            'data' => $media->fresh(),
        ]);
    }

    /**
     * Generate media thumbnails
     */
    public function generateThumbnails(Property $property): JsonResponse
    {
        $media = $property->media()->where('media_type', 'image')->get();
        $processed = 0;

        foreach ($media as $mediaItem) {
            try {
                if (! $mediaItem->thumbnail_path) {
                    $this->generateThumbnail($mediaItem);
                    $processed++;
                }
            } catch (\Exception $e) {
                // Log error but continue processing
                \Log::error("Failed to generate thumbnail for media {$mediaItem->id}: ".$e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Generated {$processed} thumbnails",
            'processed' => $processed,
        ]);
    }

    /**
     * Optimize images
     */
    public function optimizeImages(Property $property): JsonResponse
    {
        $media = $property->media()->where('media_type', 'image')->get();
        $optimized = 0;

        foreach ($media as $mediaItem) {
            try {
                $this->optimizeImage($mediaItem);
                $optimized++;
            } catch (\Exception $e) {
                \Log::error("Failed to optimize image {$mediaItem->id}: ".$e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Optimized {$optimized} images",
            'optimized' => $optimized,
        ]);
    }

    // Private helper methods

    private function processAndStoreMedia($file, Property $property, string $type): PropertyMedia
    {
        $filename = $this->generateUniqueFilename($file);
        $path = "properties/{$property->slug}/".$filename;

        // Store original file
        $storedPath = Storage::disk('public')->putFileAs(
            "properties/{$property->slug}",
            $file,
            $filename
        );

        $media = PropertyMedia::create([
            'property_id' => $property->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $storedPath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'media_type' => $type,
            'display_order' => $property->media()->count() + 1,
        ]);

        // Generate thumbnail for images
        if ($type === 'image') {
            $this->generateThumbnail($media);
            $this->optimizeImage($media);
        }

        return $media->fresh();
    }

    private function generateUniqueFilename($file): string
    {
        $extension = $file->getClientOriginalExtension();
        $timestamp = now()->format('YmdHis');
        $random = \Str::random(8);

        return "{$timestamp}_{$random}.{$extension}";
    }

    private function generateThumbnail(PropertyMedia $media): void
    {
        if ($media->media_type !== 'image') {
            return;
        }

        // Generate thumbnail using centralized ImageService
        $thumbnailPath = $this->imageService->generateThumbnail(
            $media->file_path,
            300,
            200
        );

        $media->update(['thumbnail_path' => $thumbnailPath]);
    }

    private function optimizeImage(PropertyMedia $media): void
    {
        if ($media->media_type !== 'image') {
            return;
        }

        // Optimize using centralized ImageService
        $this->imageService->optimize($media->file_path, [
            'max_width' => 1920,
            'max_height' => 1080,
            'quality' => 85,
        ]);

        $newSize = filesize(Storage::disk('public')->path($media->file_path));
        $media->update(['file_size' => $newSize]);
    }
}
