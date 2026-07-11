<?php

namespace App\Exports;

use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LookupsSheet implements FromCollection, WithEvents, WithHeadings, WithTitle
{
    public function title(): string
    {
        return 'Lookups';
    }

    public function headings(): array
    {
        return [
            'Property Name',
            'Property Capacity',
            'Property Max Capacity',
            'Payment Method',
            'Account Number',
            'User Name',
        ];
    }

    public function collection()
    {
        $properties = Property::select('name', 'capacity', 'capacity_max')->get();
        $paymentMethods = PaymentMethod::active()->get();
        $users = User::where('role', '!=', 'guest')->pluck('name')->toArray();

        $maxCount = max($properties->count(), $paymentMethods->count(), count($users));

        $data = [];
        for ($i = 0; $i < $maxCount; $i++) {
            $prop = $properties->get($i);
            $pm = $paymentMethods->get($i);
            $user = $users[$i] ?? null;

            $data[] = [
                $prop ? $prop->name : '',
                $prop ? $prop->capacity : '',
                $prop ? $prop->capacity_max : '',
                $pm ? $pm->name : '',
                $pm ? $pm->account_number : '',
                $user ?? '',
            ];
        }

        return new Collection($data);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Hide the lookups sheet so it does not distract the user
                $event->sheet->getDelegate()->setSheetState(Worksheet::SHEETSTATE_HIDDEN);
            },
        ];
    }
}
