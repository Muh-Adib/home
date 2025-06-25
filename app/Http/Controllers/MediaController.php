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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MediaController extends Controller
{
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
                'max:51200', // 50MB max file size for videos
                function ($attribute, $value, $fail) {
                    // Custom validation for file content security
                    if ($value->getMimeType() && str_starts_with($value->getMimeType(), 'image/')) {
                        if (!$this->isValidImageFile($value)) {
                            $fail('The ' . $attribute . ' contains invalid or potentially dangerous content.');
                        }
                        // Validate image dimensions
                        $imageInfo = @getimagesize($value->getRealPath());
                        if ($imageInfo) {
                            [$width, $height] = $imageInfo;
                            if ($width < 200 || $height < 200 || $width > 4096 || $height > 4096) {
                                $fail('Images must be between 200x200 and 4096x4096 pixels.');
                            }
                        }
                    }
                },
            ],
        ], [
            'files.*.mimes' => 'Only JPG, JPEG, PNG, WebP, GIF, MP4, MOV, AVI, and WebM files are allowed.',
            'files.*.max' => 'Each file must be less than 50MB.',
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
            
            $uploadedFiles = [];
            $storage = Storage::disk('public');
            
            foreach ($request->file('files') as $file) {
                // Generate secure filename
                $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
                $extension = $file->getClientOriginalExtension();
                $safeName = Str::slug($originalName) . '_' . time() . '_' . Str::random(8) . '.' . $extension;
                
                // Store file with security checks
                $path = $this->storeFileSecurely($file, $safeName, $property);
                
                if (!$path) {
                    throw new \Exception('Failed to store file securely: ' . $file->getClientOriginalName());
                }
                
                // Determine media type
                $mediaType = str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'video';
                
                // Create media record
                $media = PropertyMedia::create([
                    'property_id' => $property->id,
                    'media_type' => $mediaType,
                    'file_name' => $safeName,
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'category' => 'exterior', // Default to exterior as per migration default
                    'title' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                    'alt_text' => '',
                    'description' => '',
                    'display_order' => PropertyMedia::where('property_id', $property->id)->max('display_order') + 1,
                    'is_featured' => false,
                    'is_cover' => false,
                ]);
                
                // Generate thumbnails immediately for images
                if ($mediaType === 'image') {
                    try {
                        $this->generateThumbnail($media);
                    } catch (\Exception $thumbnailError) {
                        // Log thumbnail generation error but don't fail the upload
                        \Log::warning('Thumbnail generation failed', [
                            'media_id' => $media->id,
                            'error' => $thumbnailError->getMessage(),
                        ]);
                    }
                }
                
                $uploadedFiles[] = [
                    'id' => $media->id,
                    'file_name' => $media->file_name,
                    'url' => $media->url,
                    'size' => $media->file_size,
                ];
                
                \Log::info('File uploaded successfully', [
                    'media_id' => $media->id,
                    'property_id' => $property->id,
                    'file_name' => $safeName,
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
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validate if uploaded file is a legitimate image file
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @return bool
     */
    private function isValidImageFile($file)
    {
        try {
            // Check file signature (magic bytes)
            $handle = fopen($file->getRealPath(), 'rb');
            $header = fread($handle, 16);
            fclose($handle);
            
            // Define valid image signatures
            $signatures = [
                'jpg' => [0xFF, 0xD8, 0xFF],
                'png' => [0x89, 0x50, 0x4E, 0x47],
                'gif' => [0x47, 0x49, 0x46],
                'webp' => [0x52, 0x49, 0x46, 0x46],
            ];
            
            $isValid = false;
            foreach ($signatures as $format => $signature) {
                if (substr($header, 0, count($signature)) === implode('', array_map('chr', $signature))) {
                    $isValid = true;
                    break;
                }
            }
            
            if (!$isValid) {
                return false;
            }
            
            // Additional validation using GD/Imagick if available
            if (extension_loaded('gd')) {
                $imageInfo = @getimagesize($file->getRealPath());
                if ($imageInfo === false) {
                    return false;
                }
                
                // Check if mime type matches file extension
                $allowedMimeTypes = [
                    'image/jpeg', 'image/jpg', 'image/png', 
                    'image/gif', 'image/webp'
                ];
                
                if (!in_array($imageInfo['mime'], $allowedMimeTypes)) {
                    return false;
                }
            }
            
            return true;
            
        } catch (\Exception $e) {
            \Log::warning('Image validation failed', [
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Store file with additional security measures
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $safeName
     * @param Property $property
     * @return string|false
     */
    private function storeFileSecurely($file, $safeName, $property)
    {
        try {
            $directory = "properties/{$property->id}/media";
            $path = $file->storeAs($directory, $safeName, 'public');
            
            if (!$path) {
                return false;
            }
            
            // Set proper file permissions
            $fullPath = storage_path('app/public/' . $path);
            if (file_exists($fullPath)) {
                chmod($fullPath, 0644); // Read/write for owner, read for others
            }
            
            return $path;
            
        } catch (\Exception $e) {
            \Log::error('Secure file storage failed', [
                'file' => $safeName,
                'property_id' => $property->id,
                'error' => $e->getMessage(),
            ]);
            return false;
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
                'errors' => $validator->errors()
            ], 422);
        }

        // If setting as featured, unset other featured images for this property
        if ($request->get('is_featured')) {
            PropertyMedia::where('property_id', $media->property_id)
                ->where('id', '!=', $media->id)
                ->update(['is_featured' => false]);
        }

        // If setting as cover, unset other cover images for this property
        if ($request->get('is_cover')) {
            PropertyMedia::where('property_id', $media->property_id)
                ->where('id', '!=', $media->id)
                ->update(['is_cover' => false]);
        }

        $updateData = $request->only(['title', 'alt_text', 'category', 'is_featured', 'is_cover']);
        if ($request->has('description')) {
            $updateData['description'] = $request->get('description');
        }
        if ($request->has('display_order')) {
            $updateData['display_order'] = $request->get('display_order');
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