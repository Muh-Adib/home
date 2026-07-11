<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function makeCheckedOutBooking(): Booking
    {
        $booking = Booking::factory()->create([
            'booking_status' => 'checked_out',
            'payment_token' => 'valid-token-123',
            'payment_token_expires_at' => now()->addDays(7),
        ]);

        return $booking;
    }

    // =========================================================================
    // Guest: store review
    // =========================================================================

    #[Test]
    public function guest_can_submit_review_with_valid_token(): void
    {
        $booking = $this->makeCheckedOutBooking();

        $response = $this->post(route('bookings.review.store', $booking->booking_number), [
            'payment_token' => 'valid-token-123',
            'rating' => 5,
            'comment' => 'Sangat memuaskan!',
        ]);

        $response->assertRedirect(route('home'));

        $this->assertDatabaseHas('reviews', [
            'booking_id' => $booking->id,
            'rating' => 5,
            'comment' => 'Sangat memuaskan!',
            'is_approved' => false,
        ]);
    }

    #[Test]
    public function guest_cannot_submit_review_with_invalid_token(): void
    {
        $booking = $this->makeCheckedOutBooking();

        $response = $this->post(route('bookings.review.store', $booking->booking_number), [
            'payment_token' => 'wrong-token',
            'rating' => 4,
        ]);

        $response->assertSessionHasErrors('message');
        $this->assertDatabaseMissing('reviews', ['booking_id' => $booking->id]);
    }

    #[Test]
    public function guest_cannot_submit_review_if_not_checked_out(): void
    {
        $booking = Booking::factory()->create([
            'booking_status' => 'confirmed',
            'payment_token' => 'valid-token-123',
            'payment_token_expires_at' => now()->addDays(7),
        ]);

        $response = $this->post(route('bookings.review.store', $booking->booking_number), [
            'payment_token' => 'valid-token-123',
            'rating' => 5,
        ]);

        $response->assertSessionHasErrors('message');
        $this->assertDatabaseMissing('reviews', ['booking_id' => $booking->id]);
    }

    #[Test]
    public function guest_cannot_submit_duplicate_review(): void
    {
        $booking = $this->makeCheckedOutBooking();

        Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'guest_name' => $booking->guest_name,
            'rating' => 4,
            'is_approved' => false,
        ]);

        $response = $this->post(route('bookings.review.store', $booking->booking_number), [
            'payment_token' => 'valid-token-123',
            'rating' => 5,
        ]);

        $response->assertRedirect(route('home'));
        $this->assertDatabaseCount('reviews', 1);
    }

    #[Test]
    public function review_requires_valid_rating(): void
    {
        $booking = $this->makeCheckedOutBooking();

        $response = $this->post(route('bookings.review.store', $booking->booking_number), [
            'payment_token' => 'valid-token-123',
            'rating' => 6, // invalid
        ]);

        $response->assertSessionHasErrors('rating');
    }

    // =========================================================================
    // Admin: approve review
    // =========================================================================

    #[Test]
    public function admin_can_approve_review(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $booking = $this->makeCheckedOutBooking();

        $review = Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'guest_name' => $booking->guest_name,
            'rating' => 5,
            'is_approved' => false,
        ]);

        $response = $this->actingAs($admin)
            ->patch(route('admin.reviews.approve', $review->id));

        $response->assertRedirect();
        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_approved' => true,
        ]);
    }

    #[Test]
    public function admin_can_toggle_review_approval(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $booking = $this->makeCheckedOutBooking();

        $review = Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'guest_name' => $booking->guest_name,
            'rating' => 4,
            'is_approved' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.reviews.approve', $review->id));

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_approved' => false,
        ]);
    }

    #[Test]
    public function admin_can_update_review_content(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $booking = $this->makeCheckedOutBooking();

        $review = Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'guest_name' => $booking->guest_name,
            'rating' => 3,
            'comment' => 'Original comment',
            'is_approved' => false,
        ]);

        $response = $this->actingAs($admin)
            ->put(route('admin.reviews.update', $review->id), [
                'comment' => 'Updated comment',
                'admin_response' => 'Terima kasih atas ulasannya!',
                'is_approved' => true,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'comment' => 'Updated comment',
            'admin_response' => 'Terima kasih atas ulasannya!',
            'is_approved' => true,
        ]);
    }

    #[Test]
    public function unauthenticated_user_cannot_approve_review(): void
    {
        $booking = $this->makeCheckedOutBooking();

        $review = Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'guest_name' => $booking->guest_name,
            'rating' => 4,
            'is_approved' => false,
        ]);

        $this->patch(route('admin.reviews.approve', $review->id))
            ->assertRedirect(route('login'));
    }
}
