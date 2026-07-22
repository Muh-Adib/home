<?php

declare(strict_types=1);

namespace App\Services;

/**
 * ImageUploadResult - Value object for image upload results
 */
readonly class ImageUploadResult
{
    public function __construct(
        public bool $success,
        public string $path,
        public string $url,
        public string $filename,
        public int $size,
        public int $width,
        public int $height,
        public ?string $thumbnailPath = null,
        public ?string $thumbnailUrl = null,
        public ?int $originalSize = null,
        public ?float $compressionRatio = null,
        public ?string $error = null,
    ) {}

    /**
     * Convert to array for backward compatibility
     */
    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'path' => $this->path,
            'url' => $this->url,
            'filename' => $this->filename,
            'size' => $this->size,
            'width' => $this->width,
            'height' => $this->height,
            'thumbnail_path' => $this->thumbnailPath,
            'thumbnail_url' => $this->thumbnailUrl,
            'original_size' => $this->originalSize,
            'compression_ratio' => $this->compressionRatio,
            'error' => $this->error,
        ];
    }
}
