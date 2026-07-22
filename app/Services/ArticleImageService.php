<?php

namespace App\Services;

use App\Models\Article;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * ArticleImageService - Handle article image uploads with WebP compression
 *
 * Features:
 * - Auto WebP conversion dengan quality 88
 * - Resize if too large (max 1920x1080)
 * - Sharpening untuk maintain quality
 * - Cleanup orphaned images
 */
class ArticleImageService
{
    public function __construct(
        private ImageService $imageService
    ) {}

    /**
     * Upload and process article image
     *
     * @throws \Exception
     */
    public function uploadImage(UploadedFile $file, ?Article $article = null): array
    {
        // Determine directory path
        $directory = 'articles/images';
        if ($article) {
            $directory .= '/'.substr($article->slug, 0, 50);
        }

        // Upload using centralized ImageService
        $result = $this->imageService->upload($file, [
            'directory' => $directory,
            'max_width' => 1920,
            'max_height' => 1080,
            'quality' => 88,
            'convert_to_webp' => true,
            'sharpen' => true,
        ]);

        if (! $result->success) {
            throw new \Exception($result->error ?? 'Failed to upload image');
        }

        return [
            'success' => true,
            'path' => $result->path,
            'url' => $result->url,
            'filename' => $result->filename,
            'size' => $result->size,
            'width' => $result->width,
            'height' => $result->height,
            'original_size' => $result->originalSize,
            'compression_ratio' => $result->compressionRatio,
        ];
    }

    /**
     * Upload multiple images at once
     */
    public function uploadMultiple(array $files, ?Article $article = null): array
    {
        $results = [];

        foreach ($files as $file) {
            try {
                $results[] = $this->uploadImage($file, $article);
            } catch (\Exception $e) {
                $results[] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                    'filename' => $file->getClientOriginalName(),
                ];
            }
        }

        return $results;
    }

    /**
     * Delete image from storage
     */
    public function deleteImage(string $path): bool
    {
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }

        return false;
    }

    /**
     * Re-optimize existing image
     *
     * @throws \Exception
     */
    public function optimizeExistingImage(string $path): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (! file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        $originalSize = filesize($fullPath);

        // Optimize using centralized ImageService
        $this->imageService->optimize($path, [
            'max_width' => 1920,
            'max_height' => 1080,
            'quality' => 88,
        ]);

        $newSize = filesize($fullPath);

        return [
            'success' => true,
            'path' => $path,
            'original_size' => $originalSize,
            'new_size' => $newSize,
            'savings' => $originalSize - $newSize,
            'compression_ratio' => round((($originalSize - $newSize) / $originalSize) * 100, 2),
        ];
    }

    /**
     * Generate thumbnail variant
     */
    public function generateThumbnail(string $path, int $width = 400, int $height = 300): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (! file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        // Generate thumbnail using centralized ImageService
        $thumbnailPath = $this->imageService->generateThumbnail($path, $width, $height);

        return [
            'success' => true,
            'path' => $thumbnailPath,
            'url' => Storage::disk('public')->url($thumbnailPath),
            'width' => $width,
            'height' => $height,
            'size' => filesize(Storage::disk('public')->path($thumbnailPath)),
        ];
    }

    /**
     * Cleanup orphaned images (images not referenced in any article)
     */
    public function cleanupOrphanedImages(bool $dryRun = true): array
    {
        $allImages = Storage::disk('public')->allFiles('articles/images');
        $orphaned = [];

        foreach ($allImages as $imagePath) {
            $url = Storage::disk('public')->url($imagePath);

            // Check if image is referenced in any article
            $referenced = Article::where('content', 'like', "%{$url}%")
                ->orWhere('featured_image', $url)
                ->exists();

            if (! $referenced) {
                $orphaned[] = $imagePath;

                if (! $dryRun) {
                    Storage::disk('public')->delete($imagePath);
                }
            }
        }

        return [
            'total_images' => count($allImages),
            'orphaned_count' => count($orphaned),
            'orphaned_files' => $orphaned,
            'dry_run' => $dryRun,
            'deleted' => ! $dryRun,
        ];
    }

    /**
     * Validate uploaded image
     *
     * @throws \Exception
     */
    private function validateImage(UploadedFile $file): void
    {
        // Check file size (max 10MB)
        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new \Exception('Image size must be less than 10MB');
        }

        // Check mime type
        $allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (! in_array($file->getMimeType(), $allowedMimeTypes)) {
            throw new \Exception('Invalid image format. Allowed: JPG, PNG, GIF, WebP');
        }

        // Validate image dimensions
        $imageInfo = @getimagesize($file->getRealPath());
        if (! $imageInfo) {
            throw new \Exception('Invalid image file');
        }

        [$width, $height] = $imageInfo;
        if ($width < 100 || $height < 100) {
            throw new \Exception('Image dimensions must be at least 100x100 pixels');
        }

        if ($width > 8192 || $height > 8192) {
            throw new \Exception('Image dimensions must not exceed 8192x8192 pixels');
        }
    }

    /**
     * Get image info
     */
    public function getImageInfo(string $path): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (! file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        $imageInfo = getimagesize($fullPath);

        return [
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'size' => filesize($fullPath),
            'width' => $imageInfo[0],
            'height' => $imageInfo[1],
            'mime' => $imageInfo['mime'],
        ];
    }
}
