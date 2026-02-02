<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckImageSupport extends Command
{
    protected $signature = 'image:check-support';
    protected $description = 'Check image processing capabilities';

    public function handle()
    {
        $this->info('=== Image Processing Support Check ===');
        $this->newLine();

        // Check extensions
        $this->info('📦 PHP Extensions:');
        $this->line('  GD: ' . (extension_loaded('gd') ? '✅ Installed' : '❌ Not installed'));
        $this->line('  Imagick: ' . (extension_loaded('imagick') ? '✅ Installed' : '❌ Not installed'));
        $this->newLine();

        // Check GD formats
        if (extension_loaded('gd')) {
            $this->info('🎨 GD Supported Formats:');
            $this->line('  WebP: ' . (function_exists('imagewebp') ? '✅ Yes' : '❌ No'));
            $this->line('  JPEG: ' . (function_exists('imagejpeg') ? '✅ Yes' : '❌ No'));
            $this->line('  PNG: ' . (function_exists('imagepng') ? '✅ Yes' : '❌ No'));
            $this->line('  GIF: ' . (function_exists('imagegif') ? '✅ Yes' : '❌ No'));
            $this->newLine();
        }

        // Check Imagick formats
        if (extension_loaded('imagick')) {
            $this->info('🎨 Imagick Supported Formats:');

            $imagick = new \Imagick();
            $formats = $imagick->queryFormats();

            $checkFormats = ['WEBP', 'JPEG', 'JPG', 'PNG', 'GIF'];
            foreach ($checkFormats as $format) {
                $supported = in_array($format, $formats);
                $this->line('  ' . $format . ': ' . ($supported ? '✅ Yes' : '❌ No'));
            }

            $this->newLine();
            $this->info('📊 Imagick Version: ' . phpversion('imagick'));

            // Check ImageMagick version
            $version = $imagick->getVersion();
            $this->line('  ImageMagick: ' . ($version['versionString'] ?? 'Unknown'));

            $this->newLine();
        }

        // Check Intervention Image
        $this->info('📚 Intervention Image:');
        try {
            $manager = new \Intervention\Image\ImageManager(
                new \Intervention\Image\Drivers\Imagick\Driver()
            );
            $this->line('  Imagick Driver: ✅ Available');
        } catch (\Exception $e) {
            $this->line('  Imagick Driver: ❌ Error - ' . $e->getMessage());
        }

        try {
            $manager = new \Intervention\Image\ImageManager(
                new \Intervention\Image\Drivers\Gd\Driver()
            );
            $this->line('  GD Driver: ✅ Available');
        } catch (\Exception $e) {
            $this->line('  GD Driver: ❌ Error - ' . $e->getMessage());
        }

        $this->newLine();
        $this->info('✅ Check complete!');

        return 0;
    }
}
