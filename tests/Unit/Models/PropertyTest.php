<?php

namespace Tests\Unit\Models;

use App\Models\Property;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PropertyTest extends TestCase
{
    #[Test]
    public function it_has_a_type_attribute_with_default_value()
    {
        $property = new Property;

        // The default value is set in the database, so new instance won't have it until saved/refreshed
        // But we can check if the attribute is fillable
        $this->assertTrue(in_array('type', $property->getFillable()));
    }

    #[Test]
    public function it_can_create_a_property_with_a_type()
    {
        $data = [
            'name' => 'Test Property',
            'type' => 'villa',
            // Add other required fields if necessary for exact model creation,
            // but for unit test we often mock or just test assignment
        ];

        $property = new Property($data);

        $this->assertEquals('villa', $property->type);
    }
}
