<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarBookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'booking_number' => $this->booking_number,
            'property_id' => $this->property_id,
            'property' => $this->whenLoaded('property', function () {
                return [
                    'id' => $this->property->id,
                    'name' => $this->property->name,
                    'address' => $this->property->address,
                ];
            }),
            'property_name' => $this->whenLoaded('property', fn () => $this->property->name),
            'guest_name' => $this->guest_name,
            'guest_count' => $this->guest_count,
            'check_in' => $this->check_in instanceof Carbon ? $this->check_in->toDateString() : $this->check_in,
            'check_out' => $this->check_out instanceof Carbon ? $this->check_out->toDateString() : $this->check_out,
            'nights' => $this->nights,
            'total_amount' => $this->total_amount,
            'formatted_total_amount' => $this->formatted_total_amount,
            'booking_status' => $this->booking_status,
            'payment_status' => $this->payment_status,
            'external_reservation_url' => $this->external_reservation_url,
            'status_color' => $this->getStatusColor(),
            'can_edit' => $user ? $user->can('update', $this->resource) : false,
        ];
    }
}
