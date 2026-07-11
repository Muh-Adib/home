<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Property;
use App\Models\Review;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function __construct(protected ImageService $imageService) {}

    /**
     * Guest submits a review, authenticated via payment_token on the booking.
     * Link is sent directly via WhatsApp — no separate email verification needed.
     */
    public function store(Request $request, Booking $booking): RedirectResponse
    {
        // Verify ownership via payment_token (link was sent directly to the guest)
        $token = $request->input('payment_token') ?? $request->query('payment_token');

        if (! $token || ! $booking->isPaymentTokenValid($token)) {
            return back()->withErrors(['message' => 'Link tidak valid atau sudah kedaluwarsa.']);
        }

        // Booking must be checked_out
        if ($booking->booking_status !== 'checked_out') {
            return back()->withErrors(['message' => 'Ulasan hanya dapat diberikan setelah checkout.']);
        }

        // Prevent duplicate reviews
        if ($booking->review()->exists()) {
            return redirect()->route('home')->with('info', 'Anda sudah memberikan ulasan untuk booking ini.');
        }

        $request->validate([
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
            'photo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:3072',
        ]);

        $photoPath = null;

        if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
            try {
                $result = $this->imageService->upload($request->file('photo'), [
                    'directory' => 'reviews',
                    'max_width' => 1000,
                    'max_height' => 1000,
                    'quality' => 75,
                    'convert_to_webp' => true,
                ]);
                $photoPath = $result->success ? $result->path : null;
            } catch (\Throwable $e) {
                Log::warning('Review photo upload failed', ['error' => $e->getMessage()]);
            }
        }

        Review::create([
            'booking_id' => $booking->id,
            'property_id' => $booking->property_id,
            'user_id' => $booking->user_id,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'photo_path' => $photoPath,
            'is_approved' => false, // Require admin approval
        ]);

        return redirect()->route('home')
            ->with('success', 'Terima kasih! Ulasan Anda telah dikirim dan akan ditampilkan setelah diverifikasi.');
    }

    /**
     * Admin: toggle is_approved on a review.
     */
    public function adminApprove(Request $request, Review $review)
    {
        $review->update([
            'is_approved' => ! $review->is_approved,
            'is_verified' => true,
            'responded_by' => Auth::id(),
            'responded_at' => now(),
        ]);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $review->is_approved ? 'Ulasan telah dipublikasikan.' : 'Ulasan disembunyikan.',
                'review' => $review,
            ]);
        }

        return back()->with('success', $review->is_approved ? 'Ulasan telah dipublikasikan.' : 'Ulasan disembunyikan.');
    }

    /**
     * Admin: edit review content and/or admin response, then optionally approve.
     */
    public function adminUpdate(Request $request, Review $review)
    {
        $request->validate([
            'rating' => 'nullable|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
            'admin_response' => 'nullable|string|max:1000',
            'is_approved' => 'nullable|boolean',
        ]);

        $data = array_filter([
            'rating' => $request->rating,
            'comment' => $request->comment,
            'admin_response' => $request->admin_response,
            'is_approved' => $request->has('is_approved') ? (bool) $request->is_approved : null,
            'responded_by' => Auth::id(),
            'responded_at' => now(),
            'is_verified' => true,
        ], fn ($v) => ! is_null($v));

        $review->update($data);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Ulasan berhasil diperbarui.',
                'review' => $review,
            ]);
        }

        return back()->with('success', 'Ulasan berhasil diperbarui.');
    }

    /**
     * Public: get approved reviews for a property.
     */
    public function getPropertyReviews(Property $property): JsonResponse
    {
        $reviews = Review::with(['booking'])
            ->where('property_id', $property->id)
            ->where('is_approved', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'photo_path' => $review->photo_path,
                'guest_name' => $review->guest_name,
                'created_at' => $review->created_at->format('d M Y'),
            ]);

        return response()->json([
            'reviews' => $reviews,
            'average_rating' => round(Review::where('property_id', $property->id)->where('is_approved', true)->avg('rating'), 1),
            'total_reviews' => Review::where('property_id', $property->id)->where('is_approved', true)->count(),
        ]);
    }

    /**
     * Public: read-only list of reviews for a property (Inertia page if needed).
     */
    public function index(Property $property)
    {
        $reviews = Review::with(['booking'])
            ->where('property_id', $property->id)
            ->where('is_approved', true)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('Reviews/Index', [
            'property' => $property,
            'reviews' => $reviews,
        ]);
    }
}
