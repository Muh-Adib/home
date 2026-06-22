<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\PropertyMedia;
use Illuminate\Database\Eloquent\Factories\Factory;

class PropertyMediaFactory extends Factory
{
    protected $model = PropertyMedia::class;

    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'media_type' => 'image',
            'file_path' => 'properties/test-property/media/test.jpg',
            'file_name' => 'test.jpg',
            'file_size' => 1024,
            'mime_type' => 'image/jpeg',
            'category' => 'exterior',
            'title' => 'Test Image',
            'alt_text' => 'Test Image Alt',
            'description' => 'Test Image Description',
            'display_order' => 1,
            'is_featured' => false,
            'is_cover' => false,
        ];
    }
}
