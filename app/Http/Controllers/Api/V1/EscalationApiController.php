<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiEscalation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * API v1 — Escalations
 *
 * Triggers human admin handoff from AI Agent.
 * Creates escalation record and sends notifications to admin dashboard.
 */
class EscalationApiController extends Controller
{
    /**
     * POST /api/v1/escalations
     *
     * Trigger escalation to human admin.
     * Sends notification to admin dashboard (and optionally WhatsApp group).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|string|max:100',
            'lead_id' => 'nullable|integer|exists:ai_leads,id',
            'trigger' => 'required|in:closing_intent,discount_request,complaint,refund_request,custom_request,out_of_knowledge,explicit_request,negative_sentiment,vip_detected',
            'urgency' => 'required|in:critical,high,medium,low',
            'summary' => 'required|string|max:1000',
            'context' => 'nullable|array',
            'context.preferred_unit' => 'nullable|string',
            'context.dates' => 'nullable|string',
            'context.quote_id' => 'nullable|string',
            'context.total_price' => 'nullable|integer',
            'recommended_action' => 'nullable|string|max:500',
            'channel_preference' => 'nullable|in:whatsapp,phone,email',
        ]);

        // Generate unique escalation ID
        $escalationId = 'esc_'.Str::random(12);

        $escalation = AiEscalation::create([
            'escalation_id' => $escalationId,
            'conversation_id' => $request->input('conversation_id'),
            'lead_id' => $request->input('lead_id'),
            'trigger' => $request->input('trigger'),
            'urgency' => $request->input('urgency'),
            'summary' => $request->input('summary'),
            'context' => $request->input('context'),
            'recommended_action' => $request->input('recommended_action'),
            'channel_preference' => $request->input('channel_preference', 'whatsapp'),
            'status' => 'created',
            'notification_dashboard' => true,
            'notification_whatsapp' => in_array($request->input('urgency'), ['critical', 'high']),
        ]);

        // Update conversation status to escalated
        AiConversation::where('conversation_id', $request->input('conversation_id'))
            ->update(['status' => 'escalated', 'last_activity_at' => now()]);

        // Estimated response time based on urgency
        $estimatedResponseMinutes = match ($request->input('urgency')) {
            'critical' => 2,
            'high' => 5,
            'medium' => 15,
            'low' => 60,
        };

        // TODO: Dispatch notification event (e.g. broadcast to admin dashboard, send WA group message)
        // event(new AiEscalationCreated($escalation));

        return response()->json([
            'success' => true,
            'data' => [
                'escalation_id' => $escalation->escalation_id,
                'case_url' => url("/admin/ai-escalations/{$escalation->escalation_id}"),
                'notification_sent' => [
                    'dashboard' => $escalation->notification_dashboard,
                    'whatsapp_group' => $escalation->notification_whatsapp,
                    'email' => false,
                ],
                'estimated_response_time_minutes' => $estimatedResponseMinutes,
                'created_at' => $escalation->created_at->toISOString(),
            ],
            'meta' => $this->meta($request),
        ], 201);
    }

    /**
     * PATCH /api/v1/escalations/{escalationId}
     *
     * Update escalation status (admin claims, resolves, etc.)
     */
    public function update(Request $request, string $escalationId): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:claimed,in_progress,resolved,abandoned',
            'claimed_by' => 'nullable|integer|exists:users,id',
        ]);

        $escalation = AiEscalation::where('escalation_id', $escalationId)->firstOrFail();

        // Prevent moving backwards in status lifecycle
        $statusOrder = ['created' => 0, 'claimed' => 1, 'in_progress' => 2, 'resolved' => 3, 'abandoned' => 3];
        $currentOrder = $statusOrder[$escalation->status] ?? 0;
        $newOrder = $statusOrder[$request->input('status')] ?? 0;

        if ($newOrder < $currentOrder) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BUSINESS_INVALID_STATUS_TRANSITION',
                    'message' => "Cannot transition from '{$escalation->status}' to '{$request->input('status')}'.",
                ],
            ], 422);
        }

        $updates = ['status' => $request->input('status')];

        if ($request->input('status') === 'claimed') {
            $updates['claimed_by'] = $request->input('claimed_by');
            $updates['claimed_at'] = now();
        }

        if ($request->input('status') === 'resolved') {
            $updates['resolved_at'] = now();
        }

        $escalation->update($updates);

        return response()->json([
            'success' => true,
            'data' => [
                'escalation_id' => $escalation->escalation_id,
                'status' => $escalation->status,
                'updated_at' => $escalation->updated_at->toISOString(),
            ],
            'meta' => $this->meta($request),
        ]);
    }

    private function meta(Request $request): array
    {
        return [
            'request_id' => $request->header('X-Request-Id', uniqid('req_')),
            'timestamp' => now()->toISOString(),
            'api_version' => 'v1',
        ];
    }
}
