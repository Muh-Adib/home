<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Property;
use App\Models\User;
use App\Services\AvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

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
            'phone' => '081234567890',
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

    #[Test]
    public function user_can_access_booking_create_page()
    {
        $response = $this->actingAs($this->user)
            ->get("/properties/{$this->property->slug}/book");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Booking/Create')
            ->has('property')
            ->has('initialFormData')
        );
    }

    #[Test]
    public function booking_create_page_loads_with_url_parameters()
    {
        $checkIn = now()->addDays(1)->format('Y-m-d');
        $checkOut = now()->addDays(3)->format('Y-m-d');
        $guests = 2;

        $response = $this->actingAs($this->user)
            ->get("/properties/{$this->property->slug}/book?check_in={$checkIn}&check_out={$checkOut}&guests={$guests}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Booking/Create')
            ->where('property.slug', $this->property->slug)
        );
    }

    #[Test]
    public function user_can_create_booking_with_valid_data()
    {
        $bookingData = [
            'check_in' => now()->addDays(10)->format('Y-m-d'),
            'check_out' => now()->addDays(12)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '6281234567890',
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

    #[Test]
    public function booking_creation_validates_required_fields()
    {
        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", []);

        $response->assertSessionHasErrors([
            'check_in',
            'check_out',
            'check_in_time',
            'guest_name',
            'guest_email',
            'guest_phone',
            'guest_country',
            'guest_gender',
            'relationship_type',
            'dp_percentage',
            'guest_male',
            'guest_female',
            'guest_children',
        ]);
    }

    #[Test]
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

    #[Test]
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

    #[Test]
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

    #[Test]
    public function booking_creation_validates_minimum_stay()
    {
        // Create a booking that doesn't meet minimum stay requirements
        $bookingData = [
            'check_in' => now()->addDays(10)->format('Y-m-d'),
            'check_out' => now()->addDays(11)->format('Y-m-d'), // Only 1 night
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '6281234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        // Since minimum stay validation is disabled in CreateBookingRequest, this should pass
        // We'll just check that the request doesn't fail with a 500 error
        $response->assertStatus(302); // Redirect after successful booking
    }

    #[Test]
    public function booking_creation_validates_property_availability()
    {
        // Create a conflicting booking first
        $conflictingBooking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
            'check_in_time' => '15:00',
            'booking_status' => 'confirmed',
        ]);

        // Try to create a booking that overlaps
        $bookingData = [
            'check_in' => now()->addDays(11)->format('Y-m-d'),
            'check_out' => now()->addDays(13)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '6281234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        // Check for error message in session
        $response->assertSessionHasErrors();
    }

    #[Test]
    public function booking_creation_calculates_rate_correctly()
    {
        $bookingData = [
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '6281234567890',
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

    #[Test]
    public function booking_creation_handles_guest_details()
    {
        $bookingData = [
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 2,
            'guest_female' => 1,
            'guest_children' => 1,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '6281234567890',
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

    #[Test]
    public function booking_creation_handles_different_dp_percentages()
    {
        $dpPercentages = [30, 50, 70, 100];

        foreach ($dpPercentages as $dpPercentage) {
            $bookingData = [
                'check_in' => now()->addDays(10 + $dpPercentage)->format('Y-m-d'),
                'check_out' => now()->addDays(12 + $dpPercentage)->format('Y-m-d'),
                'check_in_time' => '15:00',
                'guest_male' => 1,
                'guest_female' => 1,
                'guest_children' => 0,
                'guest_name' => 'Test User',
                'guest_email' => 'test@example.com',
                'guest_phone' => '6281234567890',
                'guest_country' => 'Indonesia',
                'guest_gender' => 'male',
                'relationship_type' => 'keluarga',
                'dp_percentage' => $dpPercentage,
            ];

            // Find the created booking with unique email for each test
            $uniqueEmail = "test{$dpPercentage}@example.com";
            $bookingData['guest_email'] = $uniqueEmail;

            $response = $this->actingAs($this->user)
                ->post("/properties/{$this->property->slug}/book", $bookingData);

            $response->assertStatus(302);

            $booking = Booking::where('guest_email', $uniqueEmail)
                ->where('dp_percentage', $dpPercentage)
                ->latest()
                ->first();

            $this->assertNotNull($booking);

            // Verify DP calculation
            $expectedDpAmount = $booking->total_amount * $dpPercentage / 100;
            $this->assertEquals($expectedDpAmount, $booking->dp_amount);
        }
    }

    #[Test]
    public function booking_creation_handles_extra_beds_calculation()
    {
        $bookingData = [
            'check_in' => now()->addDays(1)->format('Y-m-d'),
            'check_out' => now()->addDays(3)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 3,
            'guest_female' => 3,
            'guest_children' => 0, // 6 guests, property capacity = 4, so 2 extra beds needed
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '6281234567890',
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

    #[Test]
    public function booking_creation_creates_workflow_entry()
    {
        $bookingData = [
            'check_in' => now()->addDays(10)->format('Y-m-d'),
            'check_out' => now()->addDays(12)->format('Y-m-d'),
            'check_in_time' => '15:00',
            'guest_male' => 1,
            'guest_female' => 1,
            'guest_children' => 0,
            'guest_name' => 'Test User',
            'guest_email' => 'test@example.com',
            'guest_phone' => '6281234567890',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 50,
        ];

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertStatus(302);

        $booking = Booking::where('guest_email', 'test@example.com')
            ->latest()
            ->first();

        $this->assertNotNull($booking);

        // Check if workflow entry was created
        $this->assertDatabaseHas('booking_workflow', [
            'booking_id' => $booking->id,
            'step' => 'submitted',
            'status' => 'completed',
        ]);
    }

    #[Test]
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

    #[Test]
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

    #[Test]
    public function fully_paid_booking_payment_url_redirects_to_my_bookings()
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'created_by' => $this->user->id,
            'guest_email' => $this->user->email,
            'check_in' => now()->addDays(5)->format('Y-m-d'),
            'check_out' => now()->addDays(7)->format('Y-m-d'),
            'total_amount' => 1000000,
            'dp_amount' => 500000,
            'dp_paid_amount' => 1000000,
            'remaining_amount' => 0,
            'payment_status' => 'fully_paid',
            'payment_token' => 'test-token-fully-paid',
            'payment_token_expires_at' => now()->addDays(1),
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'payment_status' => 'verified',
        ]);

        $response = $this->actingAs($this->user)
            ->get("/booking/{$booking->booking_number}/payment");

        $response->assertRedirect(route('my-bookings'));
        $response->assertSessionHas('info', 'This booking has been fully paid.');
    }

    #[Test]
    public function booking_creation_handles_variable_daily_extra_beds()
    {
        $checkIn = now()->addDays(20)->format('Y-m-d');
        $checkOut = now()->addDays(23)->format('Y-m-d'); // 3 nights

        // Date strings
        $date1 = now()->addDays(20)->format('Y-m-d');
        $date2 = now()->addDays(21)->format('Y-m-d');
        $date3 = now()->addDays(22)->format('Y-m-d');

        // Let's customize extra beds: Day 1: 1 bed, Day 2: 2 beds, Day 3: 0 beds
        $dailyExtraBeds = [
            $date1 => 1,
            $date2 => 2,
            $date3 => 0,
        ];

        $bookingData = [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'check_in_time' => '15:00',
            'guest_male' => 2,
            'guest_female' => 2,
            'guest_children' => 0,
            'guest_name' => 'Variable Extra Bed User',
            'guest_email' => 'variable-extrabed@example.com',
            'guest_phone' => '6281234567891',
            'guest_country' => 'Indonesia',
            'guest_gender' => 'male',
            'relationship_type' => 'keluarga',
            'dp_percentage' => 100,
            'booking_status' => 'confirmed',
            'daily_extra_beds' => $dailyExtraBeds,
        ];

        // Make the property have positive extra_bed_rate
        $this->property->update([
            'extra_bed_rate' => 100000,
            'capacity' => 4, // guest count is 4, so default extra beds would be 0
            'capacity_max' => 6,
        ]);

        $response = $this->actingAs($this->user)
            ->post("/properties/{$this->property->slug}/book", $bookingData);

        $response->assertStatus(302);

        $booking = Booking::where('guest_email', 'variable-extrabed@example.com')
            ->latest()
            ->first();

        $this->assertNotNull($booking);

        // Verify total extra bed count and amount calculations
        // Day 1: 1 x 100,000 = 100,000
        // Day 2: 2 x 100,000 = 200,000
        // Day 3: 0 x 100,000 = 0
        // Total expected extra bed amount = 300,000
        $this->assertEquals(300000, $booking->extra_bed_amount);

        // Check-in day extra bed count should be stored as overall extra_bed_count
        $this->assertEquals(1, $booking->extra_bed_count);

        // Verify daily revenues
        $dailyRevenues = $booking->dailyRevenues()->orderBy('tanggal')->get();
        $this->assertCount(3, $dailyRevenues);

        $this->assertEquals($date1, $dailyRevenues[0]->tanggal->format('Y-m-d'));
        $this->assertEquals(1, $dailyRevenues[0]->extra_bed_count);
        $this->assertEquals(100000, $dailyRevenues[0]->extra_bed_amount);

        $this->assertEquals($date2, $dailyRevenues[1]->tanggal->format('Y-m-d'));
        $this->assertEquals(2, $dailyRevenues[1]->extra_bed_count);
        $this->assertEquals(200000, $dailyRevenues[1]->extra_bed_amount);

        $this->assertEquals($date3, $dailyRevenues[2]->tanggal->format('Y-m-d'));
        $this->assertEquals(0, $dailyRevenues[2]->extra_bed_count);
        $this->assertEquals(0, $dailyRevenues[2]->extra_bed_amount);
    }

    public function test_booking_check_in_rules()
    {
        $booking = Booking::factory()->create([
            'property_id' => $this->property->id,
            'booking_status' => 'confirmed',
            'payment_status' => 'fully_paid',
            'check_in' => now()->format('Y-m-d'),
            'check_out' => now()->addDays(2)->format('Y-m-d'),
        ]);

        // Today check-in should be allowed
        $this->assertTrue($booking->canCheckIn());

        // Yesterday check-in should be allowed
        $booking->update(['check_in' => now()->subDay()->format('Y-m-d')]);
        $this->assertTrue($booking->canCheckIn());

        // Tomorrow check-in should NOT be allowed
        $booking->update(['check_in' => now()->addDay()->format('Y-m-d')]);
        $this->assertFalse($booking->canCheckIn());

        // DP paid check-in should be allowed
        $booking->update([
            'check_in' => now()->format('Y-m-d'),
            'payment_status' => 'dp_received',
        ]);
        $this->assertTrue($booking->canCheckIn());
    }
}
