<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PropertyMediaService
{
    public function __construct(
        private ImageService $imageService
    ) {}

    /**
     * Store uploaded media files for a property
     *
     * @param  array<UploadedFile>  $files
     * @return array<PropertyMedia>
     *
     * @throws \Exception
     */
    public function storeMedia(array $files, Property $property): array
    {
        $uploadedFiles = [];

        foreach ($files as $file) {
            // Generate secure filename
            $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $extension = $file->getClientOriginalExtension();
            $safeName = Str::slug($originalName).'_'.time().'_'.Str::random(8).'.'.$extension;

            // Store file securely
            $path = $this->storeFileSecurely($file, $safeName, $property);

            if (! $path) {
                throw new \Exception('Failed to store file securely: '.$file->getClientOriginalName());
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
                    \Log::warning('Thumbnail generation failed during upload', [
                        'media_id' => $media->id,
                        'error' => $thumbnailError->getMessage(),
                    ]);
                }
            }

            $uploadedFiles[] = $media;
        }

        return $uploadedFiles;
    }

    /**
     * Store file with security measures
     */
    private function storeFileSecurely(UploadedFile $file, string $safeName, Property $property): string|false
    {
        try {
            $directory = "properties/{$property->slug}/media";
            $path = $file->storeAs($directory, $safeName, 'public');

            if (! $path) {
                return false;
            }

            // Set proper file permissions
            $fullPath = Storage::disk('public')->path($path);
            if (file_exists($fullPath)) {
                @chmod($fullPath, 0644);
            }

            return $path;
        } catch (\Exception $e) {
            \Log::error('Secure file storage failed in service', [
                'file' => $safeName,
                'property_id' => $property->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Generate thumbnail for media
     */
    private function generateThumbnail(PropertyMedia $media): void
    {
        $thumbnailPath = $this->imageService->generateThumbnail(
            $media->file_path,
            300,
            200
        );

        $media->update(['thumbnail_path' => $thumbnailPath]);
    }

    /**
     * Validate if uploaded file is a legitimate image file
     */
    public function isValidImageFile(UploadedFile $file): bool
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

            if (! $isValid) {
                return false;
            }

            // Additional validation using GD/Imagick if available
            if (extension_loaded('gd')) {
                $imageInfo = @getimagesize($file->getRealPath());
                if ($imageInfo === false) {
                    return false;
                }

                $allowedMimeTypes = [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                ];

                if (! in_array($imageInfo['mime'], $allowedMimeTypes)) {
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            \Log::warning('Image validation failed in service', [
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
