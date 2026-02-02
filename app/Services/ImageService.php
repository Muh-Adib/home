<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;

/**
 * ImageService - Centralized image processing service
 * 
 * Handles all image operations across the application:
 * - Upload & Convert to WebP
 * - Resize & Optimize
 * - Thumbnail Generation
 * - Validation
 * - Multiple Driver Support (Imagick/GD)
 */
class ImageService
{
    private ImageManager $manager;
    private string $driver;

    public function __construct()
    {
        $this->driver = $this->detectOptimalDriver();
        $this->manager = $this->createManager();
    }

    /**
     * Upload and process image
     * 
     * @param UploadedFile $file
     * @param array $options Configuration options
     * @return ImageUploadResult
     * @throws \Exception
     */
    public function upload(UploadedFile $file, array $options = []): ImageUploadResult
    {
        try {
            // Merge with defaults
            $config = array_merge($this->getDefaultOptions(), $options);

            // Validate image
            $this->validate($file, $config);

            // Generate filename
            $filename = $this->generateFilename($file, $config);
            $directory = $config['directory'];
            $path = "{$directory}/{$filename}";
            $fullPath = Storage::disk('public')->path($path);

            // Ensure directory exists
            $this->ensureDirectoryExists(dirname($fullPath));

            // Process image
            $image = $this->manager->read($file->getRealPath());
            $originalWidth = $image->width();
            $originalHeight = $image->height();
            $originalSize = $file->getSize();

            // Resize if needed
            if ($originalWidth > $config['max_width'] || $originalHeight > $config['max_height']) {
                $image->scaleDown($config['max_width'], $config['max_height']);
            }

            // Add sharpening for better quality after resize
            if ($config['sharpen']) {
                $image->sharpen(10);
            }

            // Convert and save
            if ($config['convert_to_webp']) {
                $image->toWebp($config['quality'])->save($fullPath);
            } else {
                $image->save($fullPath, quality: $config['quality']);
            }

            $fileSize = filesize($fullPath);

            // Generate thumbnail if requested
            $thumbnailPath = null;
            $thumbnailUrl = null;
            if ($config['generate_thumbnail']) {
                $thumbnailPath = $this->generateThumbnail(
                    $path,
                    $config['thumbnail_width'],
                    $config['thumbnail_height']
                );
                $thumbnailUrl = Storage::disk('public')->url($thumbnailPath);
            }

            return new ImageUploadResult(
                success: true,
                path: $path,
                url: Storage::disk('public')->url($path),
                filename: $filename,
                size: $fileSize,
                width: $image->width(),
                height: $image->height(),
                thumbnailPath: $thumbnailPath,
                thumbnailUrl: $thumbnailUrl,
                originalSize: $originalSize,
                compressionRatio: round((1 - ($fileSize / $originalSize)) * 100, 2),
            );

        } catch (\Exception $e) {
            \Log::error('Image upload failed', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
                'driver' => $this->driver,
            ]);

            return new ImageUploadResult(
                success: false,
                path: '',
                url: '',
                filename: '',
                size: 0,
                width: 0,
                height: 0,
                error: $e->getMessage(),
            );
        }
    }

    /**
     * Generate thumbnail for existing image
     * 
     * @param string $path Relative path from storage/public
     * @param int $width
     * @param int $height
     * @return string Thumbnail path
     */
    public function generateThumbnail(string $path, int $width = 300, int $height = 200): string
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        // Generate thumbnail filename
        $pathInfo = pathinfo($path);
        $suffix = config('image.thumbnail.suffix', '_thumb');
        $thumbnailFilename = $pathInfo['filename'] . $suffix . '.' . $pathInfo['extension'];
        $thumbnailPath = $pathInfo['dirname'] . '/' . $thumbnailFilename;
        $thumbnailFullPath = Storage::disk('public')->path($thumbnailPath);

        // Create thumbnail
        $image = $this->manager->read($fullPath);
        $image->cover($width, $height);

        // Save with appropriate format
        if (str_ends_with($path, '.webp')) {
            $image->toWebp(config('image.thumbnail.quality', 80))->save($thumbnailFullPath);
        } else {
            $image->save($thumbnailFullPath, quality: config('image.thumbnail.quality', 80));
        }

        return $thumbnailPath;
    }

    /**
     * Optimize existing image
     * 
     * @param string $path Relative path from storage/public
     * @param array $options
     * @return void
     */
    public function optimize(string $path, array $options = []): void
    {
        $fullPath = Storage::disk('public')->path($path);

        if (!file_exists($fullPath)) {
            throw new \Exception("Image not found: {$path}");
        }

        $config = array_merge([
            'max_width' => config('image.max_dimensions.width', 1920),
            'max_height' => config('image.max_dimensions.height', 1920),
            'quality' => config('image.quality.webp', 85),
        ], $options);

        $image = $this->manager->read($fullPath);

        // Resize if needed
        if ($image->width() > $config['max_width'] || $image->height() > $config['max_height']) {
            $image->scaleDown($config['max_width'], $config['max_height']);
        }

        // Save optimized
        if (str_ends_with($path, '.webp')) {
            $image->toWebp($config['quality'])->save($fullPath);
        } else {
            $image->save($fullPath, quality: $config['quality']);
        }
    }

    /**
     * Validate uploaded image
     * 
     * @param UploadedFile $file
     * @param array $config
     * @throws \Exception
     */
    public function validate(UploadedFile $file, array $config = []): void
    {
        $validation = config('image.validation');

        // Check file size
        $maxSize = $config['max_file_size'] ?? $validation['max_file_size'];
        if ($file->getSize() > $maxSize) {
            throw new \Exception('Image size must be less than ' . ($maxSize / 1024 / 1024) . 'MB');
        }

        // Check mime type
        $allowedMimeTypes = $config['allowed_mime_types'] ?? $validation['allowed_mime_types'];
        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            throw new \Exception('Invalid image format. Allowed: JPG, PNG, GIF, WebP');
        }

        // Validate image dimensions
        $imageInfo = @getimagesize($file->getRealPath());
        if (!$imageInfo) {
            throw new \Exception('Invalid image file');
        }

        [$width, $height] = $imageInfo;

        $minWidth = $validation['min_dimensions']['width'];
        $minHeight = $validation['min_dimensions']['height'];
        $maxWidth = $validation['max_dimensions']['width'];
        $maxHeight = $validation['max_dimensions']['height'];

        if ($width < $minWidth || $height < $minHeight) {
            throw new \Exception("Image dimensions must be at least {$minWidth}x{$minHeight} pixels");
        }

        if ($width > $maxWidth || $height > $maxHeight) {
            throw new \Exception("Image dimensions must not exceed {$maxWidth}x{$maxHeight} pixels");
        }
    }

    /**
     * Get current driver name
     */
    public function getDriver(): string
    {
        return $this->driver;
    }

    /**
     * Detect optimal image driver
     */
    private function detectOptimalDriver(): string
    {
        $preferredDriver = config('image.driver', 'imagick');
        $autoFallback = config('image.auto_fallback', true);

        // Check if preferred driver is available
        if ($preferredDriver === 'imagick' && extension_loaded('imagick')) {
            return 'imagick';
        }

        if ($preferredDriver === 'gd' && extension_loaded('gd')) {
            return 'gd';
        }

        // Auto fallback
        if ($autoFallback) {
            if (extension_loaded('imagick')) {
                return 'imagick';
            }
            if (extension_loaded('gd')) {
                return 'gd';
            }
        }

        throw new \Exception('No image processing driver available. Please install Imagick or GD extension.');
    }

    /**
     * Create ImageManager with detected driver
     */
    private function createManager(): ImageManager
    {
        $driver = match ($this->driver) {
            'imagick' => new ImagickDriver(),
            'gd' => new GdDriver(),
            default => throw new \Exception("Unsupported driver: {$this->driver}"),
        };

        return new ImageManager($driver);
    }

    /**
     * Generate unique filename
     */
    private function generateFilename(UploadedFile $file, array $config): string
    {
        if (isset($config['filename'])) {
            $base = $config['filename'];
        } else {
            $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        }

        $timestamp = now()->format('YmdHis');
        $random = Str::random(8);

        $extension = $config['convert_to_webp'] ? 'webp' : $file->getClientOriginalExtension();

        return "{$base}_{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Ensure directory exists
     */
    private function ensureDirectoryExists(string $path): void
    {
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
        }
    }

    /**
     * Get default options
     */
    private function getDefaultOptions(): array
    {
        return [
            'directory' => 'uploads/images',
            'max_width' => config('image.max_dimensions.width', 1920),
            'max_height' => config('image.max_dimensions.height', 1920),
            'quality' => config('image.quality.webp', 85),
            'convert_to_webp' => true,
            'generate_thumbnail' => false,
            'thumbnail_width' => config('image.thumbnail.width', 300),
            'thumbnail_height' => config('image.thumbnail.height', 200),
            'sharpen' => true,
            'preserve_original' => false,
            'max_file_size' => config('image.validation.max_file_size'),
            'allowed_mime_types' => config('image.validation.allowed_mime_types'),
        ];
    }
}
