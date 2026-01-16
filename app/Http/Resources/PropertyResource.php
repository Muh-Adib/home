<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'address' => $this->address,
            
            // Capacity
            'capacity' => [
                'min' => $this->capacity,
                'max' => $this->capacity_max,
            ],
            
            // Pricing
            'pricing' => [
                'base_rate' => $this->base_rate,
                'formatted_base_rate' => $this->formatted_base_rate,
                'cleaning_fee' => $this->cleaning_fee,
                'extra_bed_rate' => $this->extra_bed_rate,
                'weekend_premium_percent' => $this->weekend_premium_percent,
                'weekend_premium_type' => $this->weekend_premium_type ?? 'percentage',
                'weekend_premium_fixed' => $this->weekend_premium_fixed ?? 0,
            ],
            
            // Media
            'cover_image' => $this->cover_image,
            'images' => $this->whenLoaded('media', function () {
                return $this->media->map(fn($media) => [
                    'url' => $media->getUrl(),
                    'thumb' => $media->getUrl('thumb'),
                ]);
            }),
            
            // Amenities
            'amenities' => $this->whenLoaded('amenities', function () {
                return $this->amenities->map(fn($amenity) => [
                    'id' => $amenity->id,
                    'name' => $amenity->name,
                    'icon' => $amenity->icon,
                ]);
            }),
            
            // Owner (admin only)
            'owner' => $this->when(
                $request->user()?->isAdmin(),
                new UserResource($this->whenLoaded('owner'))
            ),
            
            // Status
            'is_active' => $this->is_active,
            'status' => $this->is_active ? 'active' : 'inactive',
            
            // Metadata
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
