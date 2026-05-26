<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiConversationMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API v1 — Conversations
 *
 * Logs AI conversations for audit, admin dashboard, and training data.
 * Every turn should be logged for full transparency.
 */
class ConversationApiController extends Controller
{
    /**
     * POST /api/v1/conversations
     *
     * Create or update a conversation session.
     * Idempotent: same conversation_id updates existing record.
     */
    public function upsert(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|string|max:100',
            'channel' => 'nullable|in:web_chat,whatsapp,instagram',
            'user_identifier' => 'nullable|string|max:200',
            'status' => 'nullable|in:active,escalated,closed,abandoned',
            'lead_id' => 'nullable|integer|exists:ai_leads,id',
            'summary' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
            'started_at' => 'nullable|date',
        ]);

        $conversationId = $request->input('conversation_id');
        $existing = AiConversation::where('conversation_id', $conversationId)->first();

        if ($existing) {
            // Update — only touch fields that were explicitly sent
            $updates = ['last_activity_at' => now()];

            if ($request->filled('status')) {
                $updates['status'] = $request->input('status');
            }
            if ($request->filled('summary')) {
                $updates['summary'] = $request->input('summary');
            }
            if ($request->has('tags')) {
                $updates['tags'] = $request->input('tags');
            }
            if ($request->has('lead_id')) {
                $updates['lead_id'] = $request->input('lead_id');
            }
            if ($request->filled('user_identifier')) {
                $updates['user_identifier'] = $request->input('user_identifier');
            }

            $existing->update($updates);
            $conversation = $existing;
            $statusCode = 200;
        } else {
            // Create — set all fields with defaults
            $conversation = AiConversation::create([
                'conversation_id' => $conversationId,
                'channel' => $request->input('channel', 'web_chat'),
                'user_identifier' => $request->input('user_identifier'),
                'lead_id' => $request->input('lead_id'),
                'status' => $request->input('status', 'active'),
                'summary' => $request->input('summary'),
                'tags' => $request->input('tags'),
                'started_at' => $request->input('started_at')
                    ? now()->parse($request->input('started_at'))
                    : now(),
                'last_activity_at' => now(),
            ]);
            $statusCode = 201;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $conversation->id,
                'conversation_id' => $conversation->conversation_id,
                'status' => $conversation->status,
                'created' => $statusCode === 201,
            ],
            'meta' => $this->meta($request),
        ], $statusCode);
    }

    /**
     * POST /api/v1/conversations/{conversationId}/messages
     *
     * Append a message turn to a conversation.
     */
    public function appendMessage(Request $request, string $conversationId): JsonResponse
    {
        $request->validate([
            'role' => 'required|in:user,assistant,system,tool',
            'content' => 'required|string|max:10000',
            'timestamp' => 'nullable|date',
            'metadata' => 'nullable|array',
            'metadata.tools_called' => 'nullable|array|max:20',
            'metadata.latency_ms' => 'nullable|integer|min:0',
            'metadata.tokens' => 'nullable|array',
        ]);

        $conversation = AiConversation::where('conversation_id', $conversationId)->firstOrFail();

        $message = AiConversationMessage::create([
            'conversation_id' => $conversation->id,
            'role' => $request->input('role'),
            'content' => $request->input('content'),
            'metadata' => $request->input('metadata'),
            'sent_at' => $request->input('timestamp') ? now()->parse($request->input('timestamp')) : now(),
        ]);

        // Update conversation last activity
        $conversation->update(['last_activity_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'message_id' => $message->id,
                'conversation_id' => $conversationId,
                'sent_at' => $message->sent_at->toISOString(),
            ],
            'meta' => $this->meta($request),
        ], 201);
    }

    /**
     * GET /api/v1/conversations/{conversationId}
     *
     * Get full conversation transcript with messages.
     */
    public function show(Request $request, string $conversationId): JsonResponse
    {
        $request->validate([
            'limit' => 'nullable|integer|min:1|max:500',
            'offset' => 'nullable|integer|min:0',
        ]);

        $limit = $request->integer('limit', 200);
        $offset = $request->integer('offset', 0);

        $conversation = AiConversation::with('lead')
            ->where('conversation_id', $conversationId)
            ->firstOrFail();

        $messages = AiConversationMessage::where('conversation_id', $conversation->id)
            ->orderBy('sent_at')
            ->skip($offset)
            ->take($limit)
            ->get();

        $totalMessages = AiConversationMessage::where('conversation_id', $conversation->id)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $conversation->id,
                'conversation_id' => $conversation->conversation_id,
                'channel' => $conversation->channel,
                'status' => $conversation->status,
                'summary' => $conversation->summary,
                'tags' => $conversation->tags,
                'started_at' => $conversation->started_at?->toISOString(),
                'last_activity_at' => $conversation->last_activity_at?->toISOString(),
                'lead' => $conversation->lead ? [
                    'id' => $conversation->lead->id,
                    'name' => $conversation->lead->name,
                    'phone' => $conversation->lead->phone,
                    'intent_type' => $conversation->lead->intent_type,
                ] : null,
                'messages' => $messages->map(fn ($m) => [
                    'id' => $m->id,
                    'role' => $m->role,
                    'content' => $m->content,
                    'metadata' => $m->metadata,
                    'sent_at' => $m->sent_at->toISOString(),
                ])->values(),
                'message_count' => $totalMessages,
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $totalMessages,
                ],
            ],
            'meta' => $this->meta($request),
        ]);
    }

    /**
     * GET /api/v1/conversations
     *
     * List conversations with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|in:active,escalated,closed,abandoned',
            'channel' => 'nullable|in:web_chat,whatsapp,instagram',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'has_escalation' => 'nullable|boolean',
            'limit' => 'nullable|integer|min:1|max:100',
            'offset' => 'nullable|integer|min:0',
        ]);

        $query = AiConversation::with('lead')
            ->orderByDesc('last_activity_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('channel')) {
            $query->where('channel', $request->input('channel'));
        }

        if ($request->filled('from_date')) {
            $query->where('started_at', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->where('started_at', '<=', $request->input('to_date'));
        }

        if ($request->boolean('has_escalation')) {
            $query->where('status', 'escalated');
        }

        $limit = $request->integer('limit', 20);
        $offset = $request->integer('offset', 0);
        $total = $query->count();
        $conversations = $query->skip($offset)->take($limit)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'conversations' => $conversations->map(fn ($c) => [
                    'id' => $c->id,
                    'conversation_id' => $c->conversation_id,
                    'channel' => $c->channel,
                    'status' => $c->status,
                    'summary' => $c->summary,
                    'started_at' => $c->started_at?->toISOString(),
                    'last_activity_at' => $c->last_activity_at?->toISOString(),
                    'lead' => $c->lead ? [
                        'id' => $c->lead->id,
                        'name' => $c->lead->name,
                        'phone' => $c->lead->phone,
                    ] : null,
                ])->values(),
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
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
