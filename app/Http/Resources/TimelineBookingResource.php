<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimelineBookingResource extends JsonResource
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
            'property_id' => $this->property_id,
            'guest_name' => $this->guest_name,
            'guest_email' => $this->guest_email,
            'guest_phone' => $this->guest_phone,
            'check_in' => $this->check_in instanceof Carbon ? $this->check_in->toDateString() : $this->check_in,
            'check_out' => $this->check_out instanceof Carbon ? $this->check_out->toDateString() : $this->check_out,
            'nights' => $this->nights,
            'total_amount' => $this->total_amount,
            'remaining_amount' => $this->remaining_amount ?? 0,
            'extra_bed_count' => $this->extra_bed_count ?? 0,
            'booking_status' => $this->booking_status,
            'payment_status' => $this->payment_status,
            'guest_count' => $this->guest_count,
            'source' => $this->source,
            'external_id' => $this->external_id,
            'external_reservation_url' => $this->external_reservation_url,
            'property' => $this->whenLoaded('property', function () {
                return [
                    'id' => $this->property->id,
                    'name' => $this->property->name,
                    'capacity' => $this->property->capacity,
                    'base_rate' => $this->property->base_rate,
                    'payment_method_id' => $this->property->payment_method_id,
                    'bank_account_id' => $this->property->bank_account_id,
                ];
            }),
            'payments' => $this->whenLoaded('payments'),
            'services' => $this->whenLoaded('services'),
        ];
    }
}
