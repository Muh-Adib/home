<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_number' => $this->booking_number,

            // Property Information
            'property' => new PropertyResource($this->whenLoaded('property')),
            'property_id' => $this->property_id,

            // Guest Information
            'guest' => [
                'name' => $this->guest_name,
                'email' => $this->guest_email,
                'phone' => $this->guest_phone,
                'country' => $this->guest_country,
                'id_number' => $this->guest_id_number,
                'gender' => $this->guest_gender,
            ],

            // Guest Count
            'guest_count' => [
                'total' => $this->guest_count,
                'male' => $this->guest_male,
                'female' => $this->guest_female,
                'children' => $this->guest_children,
            ],

            // Dates
            'dates' => [
                'check_in' => $this->check_in->toDateString(),
                'check_out' => $this->check_out->toDateString(),
                'check_in_time' => $this->check_in_time,
                'nights' => $this->nights,
            ],

            // Financial
            'financial' => [
                'base_amount' => $this->base_amount,
                'extra_bed_amount' => $this->extra_bed_amount,
                'tax_amount' => $this->tax_amount,
                'total_amount' => $this->total_amount,
                'dp_amount' => $this->dp_amount,
                'dp_percentage' => $this->dp_percentage,
                'remaining_amount' => $this->remaining_amount,
                'formatted_total' => $this->formatted_total_amount,
            ],

            // Status
            'status' => [
                'booking' => $this->booking_status,
                'payment' => $this->payment_status,
                'verification' => $this->verification_status ?? null,
                'color' => $this->getStatusColor(),
            ],

            // Additional Info
            'relationship_type' => $this->relationship_type,
            'special_requests' => $this->special_requests,
            'internal_notes' => $this->when(
                $request->user()?->isAdmin(),
                $this->internal_notes
            ),
            'source' => $this->source,
            'external_id' => $this->external_id,
            'external_reservation_url' => $this->external_reservation_url,
            'external_phone' => $this->external_phone,

            // Metadata
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'verified_at' => $this->verified_at?->toISOString(),
            'verified_by' => new UserResource($this->whenLoaded('verifiedBy')),

            // Permissions
            'can' => [
                'update' => $this->when(
                    $request->user(),
                    fn() => $request->user()->can('update', $this->resource)
                ),
                'delete' => $this->when(
                    $request->user(),
                    fn() => $request->user()->can('delete', $this->resource)
                ),
            ],
        ];
    }

    // ✅ REMOVED: getStatusColor() - Now using $this->getStatusColor() from Model's HasBookingStatus trait
}
