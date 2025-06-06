<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyMedia;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Inertia\Inertia;

class MediaController extends Controller
{
    /**
     * Upload property media
     */
    public function upload(Request $request, Property $property)
    {
        // Debug logging
        \Log::info('Media upload request received', [
            'property_id' => $property->id,
            'property_slug' => $property->slug,
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'has_files' => $request->hasFile('files'),
            'all_keys' => array_keys($request->all()),
            'file_keys' => $request->hasFile('files') ? array_keys($request->file('files')) : []
        ]);
        
        $validator = Validator::make($request->all(), [
            'files' => 'required|array',
            'files.*' => 'required|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,webm|max:51200', // 50MB max
            'type' => 'required|in:image,video',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            \Log::error('Media upload validation failed', [
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->except('files'),
                'files_count' => $request->hasFile('files') ? count($request->file('files')) : 0
            ]);
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $uploadedFiles = [];
        $files = $request->file('files');

        if (!is_array($files)) {
            $files = [$files];
        }

        foreach ($files as $file) {
            try {
                $media = $this->processAndStoreMedia($file, $property, $request->get('type'));
                $uploadedFiles[] = $media;
            } catch (\Exception $e) {
                return redirect()->back()->with('error', 'Upload failed: ' . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', count($uploadedFiles) . ' files uploaded successfully');
    }

    /**
     * Update media details
     */
    public function update(Request $request, PropertyMedia $media): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0',
            'is_featured' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // If setting as featured, unset other featured images for this property
        if ($request->get('is_featured')) {
            PropertyMedia::where('property_id', $media->property_id)
                ->where('id', '!=', $media->id)
                ->update(['is_featured' => false]);
        }

        $updateData = $request->only(['alt_text', 'is_featured']);
        if ($request->has('caption')) {
            $updateData['description'] = $request->get('caption');
        }
        if ($request->has('sort_order')) {
            $updateData['display_order'] = $request->get('sort_order');
        }

        $media->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Media updated successfully',
            'data' => $media->fresh()
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
                'message' => 'Media deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete media: ' . $e->getMessage()
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
                'errors' => $validator->errors()
            ], 422);
        }

        $mediaIds = $request->get('media_ids');

        foreach ($mediaIds as $index => $mediaId) {
            PropertyMedia::where('id', $mediaId)
                ->where('property_id', $property->id)
                ->update(['display_order' => $index + 1]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Media reordered successfully'
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
            'data' => $media
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
            'data' => $media->fresh()
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
                if (!$mediaItem->thumbnail_path) {
                    $this->generateThumbnail($mediaItem);
                    $processed++;
                }
            } catch (\Exception $e) {
                // Log error but continue processing
                \Log::error("Failed to generate thumbnail for media {$mediaItem->id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Generated {$processed} thumbnails",
            'processed' => $processed
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
                \Log::error("Failed to optimize image {$mediaItem->id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Optimized {$optimized} images",
            'optimized' => $optimized
        ]);
    }

    // Private helper methods

    private function processAndStoreMedia($file, Property $property, string $type): PropertyMedia
    {
        $filename = $this->generateUniqueFilename($file);
        $path = "properties/{$property->slug}/" . $filename;

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

        $originalPath = Storage::disk('public')->path($media->file_path);
        $thumbnailFilename = 'thumb_' . basename($media->file_path);
        $thumbnailPath = dirname($media->file_path) . '/' . $thumbnailFilename;
        $thumbnailFullPath = Storage::disk('public')->path($thumbnailPath);

        // Create thumbnail using Intervention Image v3
        $manager = new ImageManager(new Driver());
        $image = $manager->read($originalPath);
        $image->cover(300, 200);
        $image->save($thumbnailFullPath, quality: 80);

        $media->update(['thumbnail_path' => $thumbnailPath]);
    }

    private function optimizeImage(PropertyMedia $media): void
    {
        if ($media->media_type !== 'image') {
            return;
        }

        $originalPath = Storage::disk('public')->path($media->file_path);
        
        // Optimize image
        $manager = new ImageManager(new Driver());
        $image = $manager->read($originalPath);
        
        // Resize if too large
        if ($image->width() > 1920 || $image->height() > 1080) {
            $image->scaleDown(1920, 1080);
        }

        // Save with compression
        $image->save($originalPath, quality: 85);

        // Update file size
        $newSize = filesize($originalPath);
        $media->update(['file_size' => $newSize]);
    }
}