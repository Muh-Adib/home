<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API v1 — Leads (CRM)
 *
 * Stores and manages leads captured by AI Agent during conversations.
 * Supports idempotency to prevent duplicate leads from retries.
 */
class LeadApiController extends Controller
{
    /**
     * POST /api/v1/leads
     *
     * Create a new lead from AI conversation.
     * Idempotent: same phone + conversation_id returns existing lead.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'nullable|string|max:200',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email|max:200',
            'intent' => 'nullable|array',
            'intent.type' => 'nullable|in:booking_ready,researching,pricing_check,faq_only',
            'intent.summary' => 'nullable|string|max:500',
            'intent.units_inquired' => 'nullable|array',
            'intent.preferred_dates' => 'nullable|array',
            'intent.preferred_dates.check_in' => 'nullable|date',
            'intent.preferred_dates.check_out' => 'nullable|date',
            'intent.guests' => 'nullable|integer|min:1',
            'tags' => 'nullable|array',
            'urgency' => 'nullable|in:urgent,this_week,this_month,flexible',
            'persona_tag' => 'nullable|in:family,couple,group,business,unknown',
            'channel' => 'nullable|in:web_chat,whatsapp,instagram',
            'conversation_id' => 'nullable|string|max:100',
            'captured_at' => 'nullable|date',
        ]);

        $intent = $request->input('intent', []);
        $phone = $request->input('phone');
        $conversationId = $request->input('conversation_id');

        // Idempotency: check if lead already exists for this conversation
        $existingLead = null;
        if ($conversationId) {
            $existingLead = AiLead::where('conversation_id', $conversationId)
                ->where('phone', $phone)
                ->first();
        }

        if ($existingLead) {
            // Explicit update — only overwrite fields that are provided and non-null
            $updates = [];

            if ($request->input('name') !== null) {
                $updates['name'] = $request->input('name');
            }
            if ($request->input('email') !== null) {
                $updates['email'] = $request->input('email');
            }
            if (isset($intent['type'])) {
                $updates['intent_type'] = $intent['type'];
            }
            if (isset($intent['summary'])) {
                $updates['intent_summary'] = $intent['summary'];
            }
            if (isset($intent['units_inquired'])) {
                $updates['units_inquired'] = $intent['units_inquired'];
            }
            if (isset($intent['preferred_dates']['check_in'])) {
                $updates['preferred_check_in'] = $intent['preferred_dates']['check_in'];
            }
            if (isset($intent['preferred_dates']['check_out'])) {
                $updates['preferred_check_out'] = $intent['preferred_dates']['check_out'];
            }
            if (isset($intent['guests'])) {
                $updates['guests'] = $intent['guests'];
            }
            if ($request->input('urgency') !== null) {
                $updates['urgency'] = $request->input('urgency');
            }

            if (! empty($updates)) {
                $existingLead->update($updates);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'lead_id' => $existingLead->id,
                    'status' => $existingLead->status,
                    'assigned_to' => $existingLead->assigned_to,
                    'created_at' => $existingLead->created_at->toISOString(),
                    'updated' => true,
                    'next_follow_up_suggested' => now()->addDay()->setTime(10, 0)->toISOString(),
                ],
                'meta' => $this->meta($request),
            ], 200);
        }

        // Create new lead
        $lead = AiLead::create([
            'name' => $request->input('name'),
            'phone' => $phone,
            'email' => $request->input('email'),
            'intent_type' => $intent['type'] ?? 'researching',
            'intent_summary' => $intent['summary'],
            'units_inquired' => $intent['units_inquired'] ?? [],
            'preferred_check_in' => $intent['preferred_dates']['check_in'] ?? null,
            'preferred_check_out' => $intent['preferred_dates']['check_out'] ?? null,
            'guests' => $intent['guests'] ?? null,
            'tags' => $request->input('tags', []),
            'urgency' => $request->input('urgency', 'flexible'),
            'persona_tag' => $request->input('persona_tag', 'unknown'),
            'channel' => $request->input('channel', 'web_chat'),
            'conversation_id' => $conversationId,
            'status' => 'new',
            'captured_at' => $request->input('captured_at') ? now()->parse($request->input('captured_at')) : now(),
            'next_follow_up_at' => now()->addDay()->setTime(10, 0),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'lead_id' => $lead->id,
                'status' => $lead->status,
                'assigned_to' => null,
                'created_at' => $lead->created_at->toISOString(),
                'next_follow_up_suggested' => $lead->next_follow_up_at?->toISOString(),
            ],
            'meta' => $this->meta($request),
        ], 201);
    }

    /**
     * PATCH /api/v1/leads/{lead}
     *
     * Update lead info (e.g. upgrade intent from researching to booking_ready).
     */
    public function update(Request $request, AiLead $lead): JsonResponse
    {
        $request->validate([
            'intent' => 'nullable|array',
            'intent.type' => 'nullable|in:booking_ready,researching,pricing_check,faq_only',
            'intent.summary' => 'nullable|string|max:500',
            'intent.preferred_unit' => 'nullable|string',
            'tags_add' => 'nullable|array',
            'urgency' => 'nullable|in:urgent,this_week,this_month,flexible',
            'status' => 'nullable|in:new,contacted,converted,lost',
        ]);

        $intent = $request->input('intent', []);
        $updates = array_filter([
            'intent_type' => $intent['type'] ?? null,
            'intent_summary' => $intent['summary'] ?? null,
            'urgency' => $request->input('urgency'),
            'status' => $request->input('status'),
        ], fn ($v) => $v !== null);

        // Merge tags
        if ($request->filled('tags_add')) {
            $currentTags = $lead->tags ?? [];
            $updates['tags'] = array_unique(array_merge($currentTags, $request->input('tags_add')));
        }

        // Add preferred unit to units_inquired
        if (! empty($intent['preferred_unit'])) {
            $currentUnits = $lead->units_inquired ?? [];
            if (! in_array($intent['preferred_unit'], $currentUnits)) {
                $updates['units_inquired'] = array_merge($currentUnits, [$intent['preferred_unit']]);
            }
        }

        $lead->update($updates);

        return response()->json([
            'success' => true,
            'data' => [
                'lead_id' => $lead->id,
                'status' => $lead->status,
                'updated_at' => $lead->updated_at->toISOString(),
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
