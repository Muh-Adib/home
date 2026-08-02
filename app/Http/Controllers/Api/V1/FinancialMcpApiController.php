<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DeploymentDiagnosticService;
use App\Services\PropertyFinancialReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialMcpApiController extends Controller
{
    protected PropertyFinancialReportService $reportService;

    public function __construct(PropertyFinancialReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Get Financial Report per property based on ownership schema for any period
     */
    public function getMonthlyReport(Request $request): JsonResponse
    {
        $month = $request->filled('month') ? (int) $request->input('month') : null;
        $year = $request->filled('year') ? (int) $request->input('year') : null;
        $from = $request->input('from');
        $to = $request->input('to');
        $propertyId = $request->input('property_id') ? (int) $request->input('property_id') : null;
        $saveToDb = $request->boolean('save', true);

        $reportData = $this->reportService->generateMonthlyReport(
            month: $month,
            year: $year,
            propertyId: $propertyId,
            saveToDatabase: $saveToDb,
            from: $from,
            to: $to
        );

        return response()->json([
            'success' => true,
            'data' => $reportData,
        ]);
    }

    /**
     * Record a new property expense
     */
    public function recordExpense(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'property_slug' => 'nullable|string|exists:properties,slug',
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:500',
            'expense_category' => 'nullable|string',
            'expense_scope' => 'nullable|in:operational,capital,prive',
            'expense_date' => 'nullable|date',
            'vendor' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (empty($validated['property_id']) && empty($validated['property_slug'])) {
            return response()->json([
                'success' => false,
                'error' => 'Harap berikan property_id atau property_slug.',
            ], 422);
        }

        $expense = $this->reportService->recordExpense($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran Rp '.number_format($expense->amount, 0, ',', '.').' berhasil dicatat.',
            'expense' => $expense,
        ]);
    }

    /**
     * Run full diagnostic and data auto-repair
     */
    public function diagnose(DeploymentDiagnosticService $diagnosticService): JsonResponse
    {
        $result = $diagnosticService->runFullDiagnosticAndRepair();

        return response()->json([
            'success' => true,
            'result' => $result,
        ]);
    }
}
