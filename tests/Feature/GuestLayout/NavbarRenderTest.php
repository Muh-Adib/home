<?php

namespace Tests\Feature\GuestLayout;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NavbarRenderTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function guest_homepage_renders_with_default_navbar_variant(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    #[Test]
    public function articles_index_renders_with_minimal_navbar_variant(): void
    {
        $response = $this->get('/articles');
        $response->assertStatus(200);
    }

    #[Test]
    public function properties_index_renders_with_minimal_navbar_variant(): void
    {
        $response = $this->get('/properties');
        $response->assertStatus(200);
    }
}
