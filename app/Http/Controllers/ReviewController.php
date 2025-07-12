<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'property_id' => 'required|exists:properties,id',
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $booking = Booking::findOrFail($request->booking_id);
        
        // Check if user can review this booking
        if ($booking->guest_email !== Auth::user()->email) {
            return back()->withErrors(['message' => 'Anda tidak dapat memberikan ulasan untuk booking ini']);
        }

        // Check if booking is checked out
        if ($booking->booking_status !== 'checked_out') {
            return back()->withErrors(['message' => 'Anda hanya dapat memberikan ulasan setelah checkout']);
        }

        // Check if review already exists
        if ($booking->review) {
            return back()->withErrors(['message' => 'Anda sudah memberikan ulasan untuk booking ini']);
        }

        // Create review
        Review::create([
            'booking_id' => $request->booking_id,
            'property_id' => $request->property_id,
            'user_id' => Auth::id(),
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        return back()->with('success', 'Ulasan berhasil disimpan');
    }

    public function getPropertyReviews($propertyId)
    {
        $reviews = Review::with(['user', 'booking'])
            ->where('property_id', $propertyId)
            ->where('is_approved', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($review) {
                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'guest_name' => $review->guest_name,
                    'created_at' => $review->created_at->format('d M Y'),
                    'stars' => $review->stars,
                ];
            });

        $averageRating = Review::where('property_id', $propertyId)
            ->where('is_approved', true)
            ->avg('rating');

        $totalReviews = Review::where('property_id', $propertyId)
            ->where('is_approved', true)
            ->count();

        return response()->json([
            'reviews' => $reviews,
            'average_rating' => round($averageRating, 1),
            'total_reviews' => $totalReviews,
        ]);
    }

    public function canReview($bookingId)
    {
        $booking = Booking::findOrFail($bookingId);
        
        $canReview = $booking->guest_email === Auth::user()->email &&
                    $booking->booking_status === 'checked_out' &&
                    !$booking->review;

        return response()->json(['can_review' => $canReview]);
    }
}
