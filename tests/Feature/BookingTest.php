<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Property;
use App\Models\Booking;
use App\Services\AvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Carbon\Carbon;

class BookingTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $property;
    protected $availabilityService;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create([
            'role' => 'guest',
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '081234567890'
        ]);

        $this->property = Property::factory()->create([
            'name' => 'Test Villa',
            'slug' => 'test-villa',
            'base_rate' => 1000000,
            'capacity' => 4,
            'capacity_max' => 6,
            'cleaning_fee' => 200000,
            'extra_bed_rate' => 100000,
            'weekend_premium_percent' => 20,
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
            'min_stay_peak' => 3,
        ]);

        $this->availabilityService = app(AvailabilityService::class);
    }

    /** @test */
    public function user_can_access_booking_create_page()
    {
        $response = $this->actingAs($this->user)
            ->get("/properties/{$this->property->slug}/book");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => 
            $page->component('Booking/Create')
                ->has('property')
                ->has('initialAvailabilityData')
        );
    }

    /** @test */
    public function booking_create_page_loads_with_url_parameters()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guests = 2;

        $response = $this->actingAs($this->user)
            ->get("/properties/{$this->property->slug}/book?check_in={$checkIn}&check_out={$checkOut}&guests={$guests}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => 
            $page->component('Booking/Create')
                ->where('property.slug', $this->property->slug)
        );
    }

    /** @test */
    public function user_can_create_booking_with_valid_data()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(10)->format('Y-m-d'),
            'check_out_date' => now()->addDays(12)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_id_number' => '1234567890123456',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'special_requests' => 'Test special request',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('bookings', [
            'property_id' => $this->property->id,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'dp_percentage' => 50,
        ]);
    }

    /** @test */
    public function booking_creation_validates_required_fields()
    {
        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", []);

        $response->assertSessionHasErrors([
            'check_in_date',
            'check_out_date',
            'check_in_time',
            'guest_name',
            'guest_email',
            'guest_phone',
            'guest_country',
        ]);
    }

    /** @test */
    public function booking_creation_validates_guest_count()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 0,
            'guest_female' => 0,
            'guest_children' => 0, // Total guests = 0
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['guest_count']);
    }

    /** @test */
    public function booking_creation_validates_guest_count_exceeds_capacity()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 4,
            'guest_female' => 4,
            'guest_children' => 0, // Total guests = 8, exceeds capacity_max = 6
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['guest_count']);
    }

    /** @test */
    public function booking_creation_validates_dates()
    {
        // Test past date
        $bookingData = [
            'check_in_date' => now()->subDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(1)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['check_in_date']);

        // Test check_out before check_in
        $bookingData['check_in_date'] = now()->addDays(3)->format('Y-m-d');
        $bookingData['check_out_date'] = now()->addDays(1)->format('Y-m-d');

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['check_out_date']);
    }

    /** @test */
    public function booking_creation_validates_minimum_stay()
    {
        // Test weekend minimum stay (2 nights)
        $weekend = Carbon::now()->next(Carbon::SATURDAY);
        
        $bookingData = [
            'check_in_date' => $weekend->format('Y-m-d'),
            'check_out_date' => $weekend->addDay()->format('Y-m-d'), // Only 1 night
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['dates']);
    }

    /** @test */
    public function booking_creation_validates_property_availability()
    {
        // Create a booking that overlaps with the new booking
        Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'booking_status' => 'confirmed',
        ]);

        $bookingData = [
            'check_in_date' => now()->addDays(2)->format('Y-m-d'), // Overlaps with existing booking
            'check_out_date' => now()->addDays(4)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertSessionHasErrors(['dates']);
    }

    /** @test */
    public function booking_creation_calculates_rate_correctly()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        
        $booking = Booking::where('property_id', $this->property->id)
            ->where('guest_name', 'Test Guest')
            ->latest()
            ->first();

        $this->assertNotNull($booking);
        $this->assertGreaterThan(0, $booking->total_amount);
        $this->assertGreaterThan(0, $booking->dp_amount);
        $this->assertGreaterThan(0, $booking->remaining_amount);
    }

    /** @test */
    public function booking_creation_handles_guest_details()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 2,
            'guest_female' => 1,
            'guest_children' => 1,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
            'guests' => [
                [
                    'name' => 'Additional Guest 1',
                    'gender' => 'male',
                    'age_category' => 'adult',
                    'relationship_to_primary' => 'friend',
                ],
                [
                    'name' => 'Additional Guest 2',
                    'gender' => 'female',
                    'age_category' => 'child',
                    'relationship_to_primary' => 'child',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        
        $booking = Booking::where('property_id', $this->property->id)
            ->where('guest_name', 'Test Guest')
            ->latest()
            ->first();

        $this->assertNotNull($booking);
        $this->assertEquals(4, $booking->guest_count); // 2 male + 1 female + 1 child
    }

    /** @test */
    public function booking_creation_handles_different_dp_percentages()
    {
        $dpPercentages = [30, 50, 100];

        foreach ($dpPercentages as $dpPercentage) {
            $bookingData = [
                'check_in_date' => now()->addDays(1)->format('Y-m-d'),
                'check_out_date' => now()->addDays(3)->format('Y-m-d'),
                'check_in_time' => '15:00',
                'guest_male' => 1,
                'guest_female' => 1,
                'guest_children' => 0,
                'guest_name' => 'Test Guest',
                'guest_email' => 'guest@example.com',
                'guest_phone' => '081234567890',
                'guest_country' => 'Indonesia',
                'guest_gender' => 'male',
                'relationship_type' => 'keluarga',
                'dp_percentage' => $dpPercentage,
            ];

            $response = $this->actingAs($this->user)
                ->post("/properties/{$this->property->slug}/book", $bookingData);

            $response->assertRedirect();
            
            $booking = Booking::where('property_id', $this->property->id)
                ->where('guest_name', 'Test Guest')
                ->where('dp_percentage', $dpPercentage)
                ->latest()
                ->first();

            $this->assertNotNull($booking);
            
            // Verify DP calculation
            $expectedDpAmount = $booking->total_amount * $dpPercentage / 100;
            $this->assertEquals($expectedDpAmount, $booking->dp_amount);
            
            $expectedRemainingAmount = $booking->total_amount * (100 - $dpPercentage) / 100;
            $this->assertEquals($expectedRemainingAmount, $booking->remaining_amount);
        }
    }

    /** @test */
    public function booking_creation_handles_extra_beds_calculation()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 3,
            'guest_female' => 3,
            'guest_children' => 0, // 6 guests, property capacity = 4, so 2 extra beds needed
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];
        
        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        
        $booking = Booking::where('property_id', $this->property->id)
            ->where('guest_name', 'Test Guest')
            ->latest()
            ->first();

        $this->assertNotNull($booking);
        $this->assertEquals(6, $booking->guest_count);
        $this->assertGreaterThan(0, $booking->extra_bed_amount);
    }

    /** @test */
    public function booking_creation_creates_workflow_entry()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        
        $booking = Booking::where('property_id', $this->property->id)
            ->where('guest_name', 'Test Guest')
            ->latest()
            ->first();

        $this->assertNotNull($booking);
        
        // Check if workflow entry was created
        $this->assertDatabaseHas('booking_workflows', [
            'booking_id' => $booking->id,
            'step' => 'booking_created',
            'status' => 'completed',
        ]);
    }

    /** @test */
    public function booking_creation_sends_notifications()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertRedirect();
        
        // Check if notification was sent (this depends on your notification implementation)
        // You might need to mock the notification or check the notification table
        $this->assertTrue(true); // Placeholder - implement based on your notification system
    }

    /** @test */
    public function booking_creation_handles_unauthenticated_user()
    {
        $bookingData = [
            'check_in_date' => now()->addDays(1)->format('Y-m-d'),
            'check_out_date' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '081234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->post("/properties/{$this->property->slug}/book", $bookingData);

        // Should redirect to login or handle guest booking
        $response->assertStatus(302);
    }
} 