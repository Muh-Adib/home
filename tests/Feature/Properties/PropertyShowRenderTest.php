<?php

namespace Tests\Feature\Properties;

use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PropertyShowRenderTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function property_show_page_renders_successfully(): void
    {
        $property = Property::factory()->active()->create();

        $response = $this->get("/properties/{$property->slug}");

        $response->assertStatus(200);
    }

    #[Test]
    public function property_show_page_renders_with_search_params(): void
    {
        $property = Property::factory()->active()->create();

        $response = $this->get("/properties/{$property->slug}?check_in=2025-07-01&check_out=2025-07-03&guests=2");

        $response->assertStatus(200);
    }
}
