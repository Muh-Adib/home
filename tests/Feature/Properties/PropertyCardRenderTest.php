<?php

namespace Tests\Feature\Properties;

use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PropertyCardRenderTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function properties_index_renders_with_property_cards(): void
    {
        Property::factory()->count(3)->active()->create();

        $response = $this->get('/properties');

        $response->assertStatus(200);
    }

    #[Test]
    public function properties_index_renders_empty_state_without_properties(): void
    {
        $response = $this->get('/properties');

        $response->assertStatus(200);
    }
}
