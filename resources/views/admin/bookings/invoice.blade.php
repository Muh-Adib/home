<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $booking->booking_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #334155;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 24px;
        }
        .top-bar {
            height: 5px;
            background: #1c6396;
            margin-bottom: 25px;
            border-radius: 2px;
        }
        .logo-text {
            font-size: 26px;
            font-weight: 800;
            color: #1c6396;
            letter-spacing: 0.5px;
            margin: 0;
            line-height: 1.1;
        }
        .logo-sub {
            font-size: 9px;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
            line-height: 1.2;
        }
        .invoice-title {
            font-size: 24px;
            font-weight: 800;
            color: #1e293b;
            margin: 0;
            letter-spacing: 1px;
        }
        .invoice-number {
            font-size: 13px;
            color: #1c6396;
            font-weight: bold;
            margin-top: 4px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 9px;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-confirmed {
            background-color: #ecfdf5;
            color: #047857;
        }
        .badge-pending {
            background-color: #fffbeb;
            color: #b45309;
        }
        .badge-checked_in {
            background-color: #eff6ff;
            color: #1d4ed8;
        }
        .badge-checked_out {
            background-color: #f8fafc;
            color: #475569;
        }
        .badge-cancelled {
            background-color: #fdf2f2;
            color: #b91c1c;
        }
        .badge-paid {
            background-color: #ecfdf5;
            color: #047857;
        }
        .badge-unpaid {
            background-color: #fdf2f2;
            color: #b91c1c;
        }
        .badge-partially {
            background-color: #fffbeb;
            color: #b45309;
        }
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .info-cell {
            width: 50%;
            vertical-align: top;
        }
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-left: 3px solid #1c6396;
            border-radius: 0 6px 6px 0;
            padding: 15px;
            margin-right: 12px;
            min-height: 125px;
        }
        .info-card-last {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-left: 3px solid #f9c511;
            border-radius: 0 6px 6px 0;
            padding: 15px;
            margin-left: 12px;
            min-height: 125px;
        }
        .info-card-title {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
            margin-bottom: 10px;
        }
        .info-row {
            margin-bottom: 6px;
            font-size: 11.5px;
        }
        .info-label {
            font-weight: 600;
            color: #64748b;
            display: inline-block;
            width: 100px;
        }
        .info-value {
            color: #1e293b;
            font-weight: 500;
        }
        .table-title {
            font-size: 13px;
            font-weight: 700;
            color: #1c6396;
            margin-top: 25px;
            margin-bottom: 12px;
            border-left: 3px solid #f9c511;
            padding-left: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #1c6396;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 10px 12px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 11.5px;
            color: #334155;
        }
        .items-table tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .totals-label-cell {
            width: 65%;
            text-align: right;
            padding: 6px 12px;
            font-size: 11.5px;
            color: #475569;
        }
        .totals-value-cell {
            width: 35%;
            text-align: right;
            padding: 6px 12px;
            font-size: 11.5px;
            font-weight: 600;
            color: #1e293b;
        }
        .grand-total-label {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            border-top: 2px solid #1c6396;
            padding-top: 10px;
        }
        .grand-total-value {
            font-size: 15px;
            font-weight: 700;
            color: #1c6396;
            border-top: 2px solid #1c6396;
            padding-top: 10px;
        }
        .notes-section {
            margin-top: 30px;
            padding: 15px;
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: 6px;
        }
        .notes-title {
            font-size: 10px;
            font-weight: 700;
            color: #b45309;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        .footer {
            margin-top: 45px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Top decorative bar -->
        <div class="top-bar"></div>

        <!-- Logo & Title Header -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
                <td style="vertical-align: middle;">
                    <table style="border-collapse: collapse; border: none; margin: 0; padding: 0;">
                        <tr>
                            <td style="vertical-align: middle; padding-right: 15px; line-height: 0;">
                                @if(file_exists(public_path('logo.svg')))
                                    <img src="data:image/svg+xml;base64,{{ base64_encode(file_get_contents(public_path('logo.svg'))) }}" style="width: 60px; height: 60px; display: block;" />
                                @endif
                            </td>
                            <td style="vertical-align: middle;">
                                <h1 class="logo-text">HOMSJOGJA</h1>
                                <div class="logo-sub">Kenyamanan Terbaik di Jantung Kota Jogjakarta</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                    <h2 class="invoice-title">INVOICE</h2>
                    <div class="invoice-number">#{{ $booking->booking_number }}</div>
                    <div style="margin-top: 5px; font-size: 10.5px; color: #64748b; font-weight: 500;">
                        Date Created: {{ $booking->created_at ? $booking->created_at->format('d M Y') : now()->format('d M Y') }}
                    </div>
                </td>
            </tr>
        </table>

        <!-- Info Grid -->
        <table class="info-grid">
            <tr>
                <!-- Client Details -->
                <td class="info-cell">
                    <div class="info-card">
                        <div class="info-card-title">Billing Details</div>
                        <div class="info-row">
                            <span class="info-label">Guest Name</span>
                            <span class="info-value">: {{ $booking->guest_name }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email</span>
                            <span class="info-value">: {{ $booking->guest_email }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone</span>
                            <span class="info-value">: {{ $booking->guest_phone }}</span>
                        </div>
                        @if($booking->guest_country)
                            <div class="info-row">
                                <span class="info-label">Country</span>
                                <span class="info-value">: {{ $booking->guest_country }}</span>
                            </div>
                        @endif
                        <div class="info-row" style="margin-top: 10px;">
                            <span class="info-label">Booking Status</span>
                            <span class="info-value">
                                @if($booking->booking_status === 'confirmed')
                                    <span class="badge badge-confirmed">Confirmed</span>
                                @elseif($booking->booking_status === 'pending_verification')
                                    <span class="badge badge-pending">Pending Verification</span>
                                @elseif($booking->booking_status === 'checked_in')
                                    <span class="badge badge-checked_in">Checked In</span>
                                @elseif($booking->booking_status === 'checked_out')
                                    <span class="badge badge-checked_out">Checked Out</span>
                                @else
                                    <span class="badge badge-cancelled">{{ ucfirst($booking->booking_status) }}</span>
                                @endif
                            </span>
                        </div>
                    </div>
                </td>
                <!-- Booking Details -->
                <td class="info-cell">
                    <div class="info-card-last">
                        <div class="info-card-title">Stay & Property Information</div>
                        <div class="info-row">
                            <span class="info-label">Property</span>
                            <span class="info-value">: {{ $booking->property->name }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Check-in</span>
                            <span class="info-value">: {{ $booking->check_in->format('d M Y') }} ({{ $booking->check_in_time ?? '14:00' }})</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Check-out</span>
                            <span class="info-value">: {{ $booking->check_out->format('d M Y') }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Duration</span>
                            <span class="info-value">: {{ $booking->nights }} nights</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Guests Count</span>
                            <span class="info-value">: {{ $booking->guest_count }} persons</span>
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Daily breakdown / Items table -->
        <h3 class="table-title">Room Charge Details</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 25%;">Date</th>
                    <th style="width: 35%;">Room Rate (Tarif Kamar)</th>
                    <th style="width: 20%;">Extra Bed</th>
                    <th style="width: 20%; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $rateCalc = $booking->rate_calculation;
                    $dailyBreakdown = $rateCalc['breakdown']['daily_breakdown'] ?? [];
                @endphp
                @if(!empty($dailyBreakdown))
                    @foreach($dailyBreakdown as $date => $day)
                        @php
                            $premiumsSum = 0;
                            if (!empty($day['premiums'])) {
                                foreach ($day['premiums'] as $prem) {
                                    $premiumsSum += $prem['amount'];
                                }
                            }
                            $roomRate = $day['base_rate'] + $premiumsSum;
                        @endphp
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($date)->format('d M Y') }}</td>
                            <td>Rp {{ number_format($roomRate, 0, ',', '.') }}</td>
                            <td>
                                @if(($day['extra_bed_count'] ?? 0) > 0)
                                    Rp {{ number_format(($day['extra_bed_rate'] ?? 100000) * $day['extra_bed_count'], 0, ',', '.') }}
                                    <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
                                        {{ $day['extra_bed_count'] }} x Rp {{ number_format($day['extra_bed_rate'] ?? 100000, 0, ',', '.') }}
                                    </div>
                                @else
                                    -
                                @endif
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #1e293b;">
                                Rp {{ number_format($day['final_rate'], 0, ',', '.') }}
                            </td>
                        </tr>
                    @endforeach
                @else
                    <tr>
                        <td>{{ $booking->check_in->format('d M Y') }} - {{ $booking->check_out->format('d M Y') }}</td>
                        <td>Rp {{ number_format($booking->base_amount, 0, ',', '.') }}</td>
                        <td>
                            @if($booking->extra_bed_count > 0)
                                Rp {{ number_format($booking->extra_bed_amount, 0, ',', '.') }}
                                <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">{{ $booking->extra_bed_count }} beds</div>
                            @else
                                -
                            @endif
                        </td>
                        <td style="text-align: right; font-weight: 700; color: #1e293b;">
                            Rp {{ number_format($booking->base_amount + $booking->extra_bed_amount, 0, ',', '.') }}
                        </td>
                    </tr>
                @endif
            </tbody>
        </table>

        <!-- Extra Services if any -->
        @if($booking->services && $booking->services->count() > 0)
            <h3 class="table-title">Extra Services</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 45%;">Service Name</th>
                        <th style="width: 20%;">Price</th>
                        <th style="width: 15%;">Quantity</th>
                        <th style="width: 20%; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($booking->services as $service)
                        <tr>
                            <td>
                                <strong>{{ $service->service_name }}</strong>
                                @if($service->service_date)
                                    <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                                        Tanggal: {{ \Carbon\Carbon::parse($service->service_date)->format('d M Y') }}
                                    </div>
                                @endif
                            </td>
                            <td>
                                Rp {{ number_format($service->unit_price, 0, ',', '.') }}
                                @if($service->discount_amount > 0)
                                    <div style="font-size: 9px; color: #e11d48; margin-top: 1px;">
                                        Diskon: -Rp {{ number_format($service->discount_amount, 0, ',', '.') }}
                                    </div>
                                @endif
                            </td>
                            <td>{{ $service->quantity }}</td>
                            <td style="text-align: right; font-weight: 700; color: #1e293b;">
                                Rp {{ number_format($service->total_price, 0, ',', '.') }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        <!-- Totals & Payment Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
                <!-- Payment Status Badge info -->
                <td style="width: 45%; vertical-align: top;">
                    <div style="font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Payment Details</div>
                    <div class="info-row">
                        <span class="info-label" style="width: 60px;">Status</span>
                        <span class="info-value">: 
                            @if($booking->payment_status === 'fully_paid')
                                <span class="badge badge-paid">Fully Paid</span>
                            @elseif($booking->payment_status === 'dp_received')
                                <span class="badge badge-partially">DP Received</span>
                            @else
                                <span class="badge badge-unpaid">DP Pending</span>
                            @endif
                        </span>
                    </div>
                    @if($booking->dp_amount > 0)
                        <div class="info-row" style="margin-top: 8px;">
                            <span class="info-label" style="width: 120px;">Required DP ({{ $booking->dp_percentage }}%)</span> 
                            <span class="info-value">: Rp {{ number_format($booking->dp_amount, 0, ',', '.') }}</span>
                        </div>
                    @endif
                </td>
                <!-- Breakdown totals -->
                <td style="width: 55%; vertical-align: top;">
                    <table class="totals-table">
                        @php
                            $totalWeekendPremium = isset($rateCalc['weekend_premium']) ? $rateCalc['weekend_premium'] : 0;
                            $totalSeasonalPremium = isset($rateCalc['seasonal_premium']) ? $rateCalc['seasonal_premium'] : 0;
                            $mergedRoomRate = $booking->base_amount + $totalWeekendPremium + $totalSeasonalPremium;
                        @endphp
                        <tr>
                            <td class="totals-label-cell">Room Rate (Tarif Kamar)</td>
                            <td class="totals-value-cell">Rp {{ number_format($mergedRoomRate, 0, ',', '.') }}</td>
                        </tr>
                        @if($booking->extra_bed_amount > 0)
                            <tr>
                                <td class="totals-label-cell">Extra Bed ({{ $booking->extra_bed_count }}x)</td>
                                <td class="totals-value-cell">+Rp {{ number_format($booking->extra_bed_amount, 0, ',', '.') }}</td>
                            </tr>
                        @endif
                        @if($booking->service_amount > 0)
                            <tr>
                                <td class="totals-label-cell">Extra Services Total</td>
                                <td class="totals-value-cell">+Rp {{ number_format($booking->service_amount, 0, ',', '.') }}</td>
                            </tr>
                        @endif
                        @if($booking->tax_amount > 0)
                            <tr>
                                <td class="totals-label-cell">Taxes & Fees</td>
                                <td class="totals-value-cell">+Rp {{ number_format($booking->tax_amount, 0, ',', '.') }}</td>
                            </tr>
                        @endif
                        @if($booking->discount_amount > 0)
                            <tr>
                                <td class="totals-label-cell" style="color: #e11d48; font-weight: bold;">Diskon</td>
                                <td class="totals-value-cell" style="color: #e11d48;">-Rp {{ number_format($booking->discount_amount, 0, ',', '.') }}</td>
                            </tr>
                        @endif
                        <tr>
                            <td class="totals-label-cell grand-total-label">Grand Total</td>
                            <td class="totals-value-cell grand-total-value">Rp {{ number_format($booking->total_amount, 0, ',', '.') }}</td>
                        </tr>
                        @php
                            $paidSum = $booking->payments->filter(fn($p) => $p->payment_status === 'verified')->sum('amount');
                            $remaining = max(0, $booking->total_amount - $paidSum);
                        @endphp
                        <tr>
                            <td class="totals-label-cell">Total Amount Paid</td>
                            <td class="totals-value-cell" style="color: #16a34a;">Rp {{ number_format($paidSum, 0, ',', '.') }}</td>
                        </tr>
                        <tr>
                            <td class="totals-label-cell" style="font-weight: bold; border-top: 1px solid #cbd5e1;">Remaining Balance</td>
                            <td class="totals-value-cell" style="font-weight: bold; border-top: 1px solid #cbd5e1; color: {{ $remaining > 0 ? '#b45309' : '#16a34a' }};">
                                Rp {{ number_format($remaining, 0, ',', '.') }}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Special Requests / Internal Notes -->
        @if($booking->special_requests)
            <div class="notes-section">
                <div class="notes-title">Special Requests / Notes</div>
                <div style="font-size: 11px; color: #475569;">{{ $booking->special_requests }}</div>
            </div>
        @endif

        <!-- Footer -->
        <div class="footer">
            Thank you for choosing Homsjogja. We look forward to welcoming you!<br>
            <strong>Homsjogja Property Hospitality</strong><br>
            Yogyakarta, Indonesia | support@homsjogja.com
        </div>
    </div>
</body>
</html>
