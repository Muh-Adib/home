<?php

namespace Tests\Feature;

use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SeoCanonicalTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function homepage_has_correct_canonical_url()
    {
        $response = $this->get('/');

        $response->assertStatus(200);

        // Assert Inertia prop 'seo.url' is correct
        $page = $response->viewData('page');
        $this->assertEquals(url('/'), $page['props']['seo']['url']);

        // Verify dirty URL is cleaned
        $responseDirty = $this->get('/?utm_source=test&fbclid=123');
        $responseDirty->assertStatus(200);
        $pageDirty = $responseDirty->viewData('page');
        $this->assertEquals(url('/'), $pageDirty['props']['seo']['url']);
    }

    #[Test]
    public function properties_index_handles_pagination_in_canonical()
    {
        // Create enough properties to force pagination (assuming 12 per page)
        Property::factory()->count(25)->create(['status' => 'active']);

        // Page 1
        $response = $this->get(route('properties.index'));
        $page = $response->viewData('page');
        $this->assertEquals(route('properties.index'), $page['props']['seo']['url']);

        // Page 2
        $response2 = $this->get(route('properties.index', ['page' => 2]));
        $page2 = $response2->viewData('page');
        $this->assertEquals(route('properties.index').'?page=2', $page2['props']['seo']['url']);

        // Page 2 with dirty params
        $responseDirty = $this->get(route('properties.index', ['page' => 2, 'sort' => 'price_low']));
        $pageDirty = $responseDirty->viewData('page');
        // Sort param SHOULD NOT be in canonical, but page SHOULD
        $this->assertEquals(route('properties.index').'?page=2', $pageDirty['props']['seo']['url']);
    }

    #[Test]
    public function property_detail_has_clean_canonical()
    {
        $property = Property::factory()->create([
            'status' => 'active',
            'name' => 'Test Villa',
            'slug' => 'test-villa',
        ]);

        $response = $this->get(route('properties.show', $property->slug));
        $page = $response->viewData('page');

        $this->assertEquals(route('properties.show', $property->slug), $page['props']['seo']['url']);

        // Dirty URL
        $responseDirty = $this->get(route('properties.show', $property->slug).'?clid=123');
        $pageDirty = $responseDirty->viewData('page');
        $this->assertEquals(route('properties.show', $property->slug), $pageDirty['props']['seo']['url']);
    }
}
