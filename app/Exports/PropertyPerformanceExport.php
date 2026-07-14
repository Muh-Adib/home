<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class PropertyPerformanceExport implements WithMultipleSheets
{
    protected array $data;

    protected array $filters;

    protected string $filename;

    public function __construct(array $data, array $filters)
    {
        $this->data = $data;
        $this->filters = $filters;
        $this->filename = 'property_performance_'.now()->format('Y-m-d_His').'.xlsx';
    }

    public function getFilename(): string
    {
        return $this->filename;
    }

    public function sheets(): array
    {
        $sheets = [];

        // 1. Overview Sheet (Indigo / Modern Accent)
        $sheets[] = new PropertyPerformanceOverviewSheet($this->data, $this->filters);

        // 2. Daily Breakdown Sheet PER property (using Property Specific Tab/Header Colors)
        $breakdownByProp = collect($this->data['dailyBreakdown'])->groupBy('property_name');

        $properties = $this->data['properties'] ?? [];
        $propertyColorMap = [];
        foreach ($properties as $prop) {
            $propertyColorMap[$prop['name']] = $prop['color'] ?? '#3b82f6';
        }

        foreach ($breakdownByProp as $propertyName => $items) {
            $color = $propertyColorMap[$propertyName] ?? '#3b82f6';
            $sheets[] = new PropertyPerformanceDailyBreakdownSheet(
                $propertyName,
                $color,
                $items->toArray()
            );
        }

        // 3. Overall Bookings Sheet (Dark Indigo Theme)
        $sheets[] = new PropertyPerformanceBookingsSheet($this->data['overallBookings']);

        return $sheets;
    }
}
