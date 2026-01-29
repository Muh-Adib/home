<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use App\Models\Article;

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
    /**
     * Upload and process article image
     * 
     * @param UploadedFile $file
     * @param Article|null $article
     * @return array
     * @throws \Exception
     */
    public function uploadImage(UploadedFile $file, ?Article $article = null): array
    {
        // Validate image
        $this->validateImage($file);

        // Generate unique filename
        $baseFilename = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $timestamp = now()->format('YmdHis');
        $random = Str::random(8);
        $webpFilename = "{$baseFilename}_{$timestamp}_{$random}.webp";

        // Prepare directory path
        $directory = 'articles/images';
        if ($article) {
            $directory .= '/' . $article->slug;
        }

        $webpPath = "{$directory}/{$webpFilename}";
        $webpFullPath = Storage::disk('public')->path($webpPath);

        // Ensure directory exists
        if (!file_exists(dirname($webpFullPath))) {
            mkdir(dirname($webpFullPath), 0755, true);
        }

        // Process image with Intervention Image
        $manager = new ImageManager(new Driver());
        $image = $manager->read($file->getRealPath());

        // Get original dimensions
        $originalWidth = $image->width();
        $originalHeight = $image->height();

        // Resize if too large (maintain aspect ratio)
        if ($originalWidth > 1920 || $originalHeight > 1080) {
            $image->scaleDown(1920, 1080);
        }

        // Add sharpening for better quality after resize
        $image->sharpen(10);

        // Convert to WebP with quality 88 (optimal balance)
        $image->toWebp(88)->save($webpFullPath);

        // Get file size after compression
        $fileSize = filesize($webpFullPath);

        return [
            'success' => true,
            'path' => $webpPath,
            'url' => Storage::disk('public')->url($webpPath),
            'filename' => $webpFilename,
            'size' => $fileSize,
            'width' => $image->width(),
            'height' => $image->height(),
            'original_size' => $file->getSize(),
            'compression_ratio' => round((1 - ($fileSize / $file->getSize())) * 100, 2),
        ];
    }

    /**
     * Upload multiple images at once
     * 
     * @param array $files
     * @param Article|null $article
     * @return array
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
     * 
     * @param string $path
     * @return bool
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
     * @param string $path
     * @return array
     * @throws \Exception
     */
    public function optimizeExistingImage(string $path): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        $originalSize = filesize($fullPath);

        // Re-process image
        $manager = new ImageManager(new Driver());
        $image = $manager->read($fullPath);

        // Resize if needed
        if ($image->width() > 1920 || $image->height() > 1080) {
            $image->scaleDown(1920, 1080);
        }

        $image->sharpen(10);
        $image->toWebp(88)->save($fullPath);

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
     * 
     * @param string $path
     * @param int $width
     * @param int $height
     * @return array
     */
    public function generateThumbnail(string $path, int $width = 400, int $height = 300): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        // Generate thumbnail filename
        $pathInfo = pathinfo($path);
        $thumbnailFilename = $pathInfo['filename'] . '_thumb.' . $pathInfo['extension'];
        $thumbnailPath = $pathInfo['dirname'] . '/' . $thumbnailFilename;
        $thumbnailFullPath = Storage::disk('public')->path($thumbnailPath);

        // Create thumbnail
        $manager = new ImageManager(new Driver());
        $image = $manager->read($fullPath);
        $image->cover($width, $height);
        $image->toWebp(80)->save($thumbnailFullPath);

        return [
            'success' => true,
            'path' => $thumbnailPath,
            'url' => Storage::disk('public')->url($thumbnailPath),
            'width' => $width,
            'height' => $height,
            'size' => filesize($thumbnailFullPath),
        ];
    }

    /**
     * Cleanup orphaned images (images not referenced in any article)
     * 
     * @param bool $dryRun
     * @return array
     */
    public function cleanupOrphanedImages(bool $dryRun = true): array
    {
        $allImages = Storage::disk('public')->allFiles('articles/images');
        $orphaned = [];

        foreach ($allImages as $imagePath) {
            $url = Storage::disk('public')->url($imagePath);

            // Check if image is referenced in any article
            $referenced = \App\Models\Article::where('content', 'like', "%{$url}%")
                ->orWhere('featured_image', $url)
                ->exists();

            if (!$referenced) {
                $orphaned[] = $imagePath;

                if (!$dryRun) {
                    Storage::disk('public')->delete($imagePath);
                }
            }
        }

        return [
            'total_images' => count($allImages),
            'orphaned_count' => count($orphaned),
            'orphaned_files' => $orphaned,
            'dry_run' => $dryRun,
            'deleted' => !$dryRun,
        ];
    }

    /**
     * Validate uploaded image
     * 
     * @param UploadedFile $file
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
        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            throw new \Exception('Invalid image format. Allowed: JPG, PNG, GIF, WebP');
        }

        // Validate image dimensions
        $imageInfo = @getimagesize($file->getRealPath());
        if (!$imageInfo) {
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
     * 
     * @param string $path
     * @return array
     */
    public function getImageInfo(string $path): array
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
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
