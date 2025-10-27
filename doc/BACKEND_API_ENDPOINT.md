# Backend API Endpoint untuk Property Stats

## Endpoint: GET /api/admin/properties/{id}/stats

### Request Parameters
- `id` (path): Property ID
- `from` (query): Start date (YYYY-MM-DD)
- `to` (query): End date (YYYY-MM-DD)  
- `period` (query): Data aggregation period ('day', 'week', 'month')

### Response Format
```json
{
  "kpis": {
    "revenue_total": 12500000,
    "occupancy_rate": 72.3,
    "total_bookings": 48,
    "average_rating": 4.6
  },
  "trend": [
    {
      "date": "2025-01-01",
      "revenue": 500000,
      "occupancy": 60
    },
    {
      "date": "2025-01-02", 
      "revenue": 750000,
      "occupancy": 80
    }
  ],
  "breakdown": {
    "source": {
      "direct": 20,
      "ota": 18,
      "walkin": 10
    }
  },
  "bookings": [
    {
      "id": 1001,
      "booking_number": "BK250101001",
      "guest_name": "John Doe",
      "check_in": "2025-01-03",
      "check_out": "2025-01-05", 
      "status": "confirmed",
      "total_amount": 250000
    }
  ]
}
```

### Implementation Notes

1. **KPI Calculation**:
   - `revenue_total`: Sum of all confirmed bookings in date range
   - `occupancy_rate`: Percentage of booked nights vs available nights
   - `total_bookings`: Count of all bookings in date range
   - `average_rating`: Average of all guest ratings

2. **Trend Data**:
   - Group by period (day/week/month)
   - Calculate daily revenue and occupancy
   - Sort by date ascending

3. **Breakdown**:
   - Group bookings by source (direct, ota, walkin)
   - Count bookings per source

4. **Performance**:
   - Cache results for 5 minutes
   - Use database indexes on booking dates
   - Limit trend data to reasonable size (max 365 days)

### Laravel Controller Example
```php
public function stats(Request $request, Property $property)
{
    $from = $request->get('from', now()->subDays(30));
    $to = $request->get('to', now());
    $period = $request->get('period', 'day');
    
    // Calculate KPIs
    $kpis = [
        'revenue_total' => $property->bookings()
            ->where('booking_status', 'confirmed')
            ->whereBetween('check_in', [$from, $to])
            ->sum('total_amount'),
        'occupancy_rate' => $this->calculateOccupancyRate($property, $from, $to),
        'total_bookings' => $property->bookings()
            ->whereBetween('created_at', [$from, $to])
            ->count(),
        'average_rating' => $property->bookings()
            ->whereNotNull('guest_rating')
            ->avg('guest_rating')
    ];
    
    // Generate trend data
    $trend = $this->generateTrendData($property, $from, $to, $period);
    
    // Booking breakdown
    $breakdown = [
        'source' => $property->bookings()
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('source')
            ->selectRaw('source, count(*) as count')
            ->pluck('count', 'source')
    ];
    
    // Recent bookings
    $bookings = $property->bookings()
        ->whereBetween('created_at', [$from, $to])
        ->latest()
        ->limit(10)
        ->get(['id', 'booking_number', 'guest_name', 'check_in', 'check_out', 'booking_status', 'total_amount']);
    
    return response()->json([
        'kpis' => $kpis,
        'trend' => $trend,
        'breakdown' => $breakdown,
        'bookings' => $bookings
    ]);
}
```

