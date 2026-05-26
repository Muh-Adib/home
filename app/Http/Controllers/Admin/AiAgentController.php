<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiEscalation;
use App\Models\AiLead;
use App\Models\ApiToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin controller for AI Agent management.
 *
 * Covers:
 * - API token management (create, revoke, list)
 * - AI leads dashboard
 * - AI escalations queue
 * - Conversation log viewer
 */
class AiAgentController extends Controller
{
    /**
     * GET /admin/ai-agent
     *
     * Main dashboard: stats overview + recent escalations.
     */
    public function index(): Response
    {
        // Cache stats for 60 seconds to avoid hammering DB on every page load
        $stats = Cache::remember('ai_agent_dashboard_stats', 60, function () {
            return [
                'total_leads' => AiLead::count(),
                'new_leads' => AiLead::where('status', 'new')->count(),
                'converted_leads' => AiLead::where('status', 'converted')->count(),
                'active_conversations' => AiConversation::where('status', 'active')->count(),
                'pending_escalations' => AiEscalation::whereIn('status', ['created', 'claimed'])->count(),
                'critical_escalations' => AiEscalation::where('urgency', 'critical')
                    ->whereIn('status', ['created', 'claimed'])->count(),
                'active_tokens' => ApiToken::active()->count(),
            ];
        });

        $recentEscalations = AiEscalation::with('lead')
            ->whereIn('status', ['created', 'claimed'])
            ->orderByRaw("FIELD(urgency, 'critical', 'high', 'medium', 'low')")
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'escalation_id' => $e->escalation_id,
                'trigger' => $e->trigger,
                'urgency' => $e->urgency,
                'summary' => $e->summary,
                'status' => $e->status,
                'lead_name' => $e->lead?->name,
                'lead_phone' => $e->lead?->phone,
                'created_at' => $e->created_at->diffForHumans(),
                'created_at_iso' => $e->created_at->toISOString(),
            ]);

        $recentLeads = AiLead::orderByDesc('captured_at')
            ->limit(5)
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name ?? 'Anonim',
                'phone' => $l->phone,
                'intent_type' => $l->intent_type,
                'urgency' => $l->urgency,
                'status' => $l->status,
                'captured_at' => $l->captured_at?->diffForHumans(),
            ]);

        return Inertia::render('Admin/AiAgent/Index', [
            'stats' => $stats,
            'recentEscalations' => $recentEscalations,
            'recentLeads' => $recentLeads,
        ]);
    }

    // =========================================================================
    // API Tokens
    // =========================================================================

    /**
     * GET /admin/ai-agent/tokens
     */
    public function tokens(): Response
    {
        $tokens = ApiToken::with('createdBy')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'client_name' => $t->client_name,
                'token_preview' => substr($t->token, 0, 12).'...',
                'scopes' => $t->scopes,
                'is_active' => $t->is_active,
                'last_used_at' => $t->last_used_at?->diffForHumans(),
                'expires_at' => $t->expires_at?->format('Y-m-d'),
                'created_by' => $t->createdBy?->name,
                'created_at' => $t->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('Admin/AiAgent/Tokens', [
            'tokens' => $tokens,
        ]);
    }

    /**
     * POST /admin/ai-agent/tokens
     */
    public function storeToken(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'client_name' => 'nullable|string|max:100',
            'expires_in_days' => 'nullable|integer|min:1|max:3650',
        ]);

        $tokenString = ApiToken::generateToken();

        $token = ApiToken::create([
            'name' => $request->input('name'),
            'token' => substr($tokenString, 0, 12).'...', // Store preview only, not raw
            'token_hash' => ApiToken::hashToken($tokenString),
            'client_name' => $request->input('client_name'),
            'scopes' => null, // Full access
            'is_active' => true,
            'expires_at' => $request->filled('expires_in_days')
                ? now()->addDays($request->integer('expires_in_days'))
                : null,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $tokenString, // Only shown once
            'id' => $token->id,
            'name' => $token->name,
            'message' => 'Token berhasil dibuat. Simpan token ini — tidak akan ditampilkan lagi.',
        ]);
    }

    /**
     * PATCH /admin/ai-agent/tokens/{token}/toggle
     */
    public function toggleToken(ApiToken $token): JsonResponse
    {
        $token->update(['is_active' => ! $token->is_active]);

        return response()->json([
            'success' => true,
            'is_active' => $token->is_active,
            'message' => $token->is_active ? 'Token diaktifkan.' : 'Token dinonaktifkan.',
        ]);
    }

    /**
     * DELETE /admin/ai-agent/tokens/{token}
     */
    public function destroyToken(ApiToken $token): JsonResponse
    {
        $token->delete();

        return response()->json([
            'success' => true,
            'message' => 'Token dihapus.',
        ]);
    }

    // =========================================================================
    // Leads
    // =========================================================================

    /**
     * GET /admin/ai-agent/leads
     */
    public function leads(Request $request): Response
    {
        $query = AiLead::orderByDesc('captured_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('urgency')) {
            $query->where('urgency', $request->input('urgency'));
        }

        if ($request->filled('intent')) {
            $query->where('intent_type', $request->input('intent'));
        }

        if ($request->filled('search')) {
            $search = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $leads = $query->paginate(20)->through(fn ($l) => [
            'id' => $l->id,
            'name' => $l->name ?? 'Anonim',
            'phone' => $l->phone,
            'email' => $l->email,
            'intent_type' => $l->intent_type,
            'intent_summary' => $l->intent_summary,
            'units_inquired' => $l->units_inquired,
            'preferred_check_in' => $l->preferred_check_in?->format('Y-m-d'),
            'preferred_check_out' => $l->preferred_check_out?->format('Y-m-d'),
            'guests' => $l->guests,
            'urgency' => $l->urgency,
            'persona_tag' => $l->persona_tag,
            'channel' => $l->channel,
            'status' => $l->status,
            'tags' => $l->tags,
            'captured_at' => $l->captured_at?->format('Y-m-d H:i'),
            'captured_at_human' => $l->captured_at?->diffForHumans(),
            'whatsapp_url' => 'https://wa.me/'.preg_replace('/[^0-9]/', '', $l->phone),
        ]);

        return Inertia::render('Admin/AiAgent/Leads', [
            'leads' => $leads,
            'filters' => $request->only(['status', 'urgency', 'intent', 'search']),
        ]);
    }

    /**
     * PATCH /admin/ai-agent/leads/{lead}/status
     */
    public function updateLeadStatus(Request $request, AiLead $lead): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:new,contacted,converted,lost',
        ]);

        $lead->update(['status' => $request->input('status')]);

        return response()->json([
            'success' => true,
            'status' => $lead->status,
        ]);
    }

    // =========================================================================
    // Escalations
    // =========================================================================

    /**
     * GET /admin/ai-agent/escalations
     */
    public function escalations(Request $request): Response
    {
        $query = AiEscalation::with('lead', 'claimedBy')
            ->orderByRaw("FIELD(urgency, 'critical', 'high', 'medium', 'low')")
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        } else {
            // Default: show pending only
            $query->whereIn('status', ['created', 'claimed']);
        }

        if ($request->filled('urgency')) {
            $query->where('urgency', $request->input('urgency'));
        }

        $escalations = $query->paginate(20)->through(fn ($e) => [
            'id' => $e->id,
            'escalation_id' => $e->escalation_id,
            'conversation_id' => $e->conversation_id,
            'trigger' => $e->trigger,
            'urgency' => $e->urgency,
            'summary' => $e->summary,
            'context' => $e->context,
            'recommended_action' => $e->recommended_action,
            'channel_preference' => $e->channel_preference,
            'status' => $e->status,
            'claimed_by' => $e->claimedBy?->name,
            'claimed_at' => $e->claimed_at?->diffForHumans(),
            'resolved_at' => $e->resolved_at?->format('Y-m-d H:i'),
            'created_at' => $e->created_at->format('Y-m-d H:i'),
            'created_at_human' => $e->created_at->diffForHumans(),
            'lead' => $e->lead ? [
                'id' => $e->lead->id,
                'name' => $e->lead->name ?? 'Anonim',
                'phone' => $e->lead->phone,
                'whatsapp_url' => 'https://wa.me/'.preg_replace('/[^0-9]/', '', $e->lead->phone),
            ] : null,
        ]);

        return Inertia::render('Admin/AiAgent/Escalations', [
            'escalations' => $escalations,
            'filters' => $request->only(['status', 'urgency']),
        ]);
    }

    /**
     * PATCH /admin/ai-agent/escalations/{escalation}/claim
     */
    public function claimEscalation(AiEscalation $escalation): JsonResponse
    {
        if ($escalation->status !== 'created') {
            return response()->json([
                'success' => false,
                'message' => 'Eskalasi ini sudah di-claim atau selesai.',
            ], 422);
        }

        $escalation->update([
            'status' => 'claimed',
            'claimed_by' => auth()->id(),
            'claimed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eskalasi berhasil di-claim.',
        ]);
    }

    /**
     * PATCH /admin/ai-agent/escalations/{escalation}/resolve
     */
    public function resolveEscalation(AiEscalation $escalation): JsonResponse
    {
        $escalation->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eskalasi ditandai selesai.',
        ]);
    }

    // =========================================================================
    // Conversations
    // =========================================================================

    /**
     * GET /admin/ai-agent/conversations
     */
    public function conversations(Request $request): Response
    {
        $query = AiConversation::with('lead')
            ->orderByDesc('last_activity_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('channel')) {
            $query->where('channel', $request->input('channel'));
        }

        $conversations = $query->paginate(20)->through(fn ($c) => [
            'id' => $c->id,
            'conversation_id' => $c->conversation_id,
            'channel' => $c->channel,
            'status' => $c->status,
            'summary' => $c->summary,
            'tags' => $c->tags,
            'started_at' => $c->started_at?->format('Y-m-d H:i'),
            'last_activity_at' => $c->last_activity_at?->diffForHumans(),
            'lead' => $c->lead ? [
                'id' => $c->lead->id,
                'name' => $c->lead->name ?? 'Anonim',
                'phone' => $c->lead->phone,
            ] : null,
        ]);

        return Inertia::render('Admin/AiAgent/Conversations', [
            'conversations' => $conversations,
            'filters' => $request->only(['status', 'channel']),
        ]);
    }

    /**
     * GET /admin/ai-agent/conversations/{conversationId}
     */
    public function showConversation(string $conversationId): Response
    {
        $conversation = AiConversation::with([
            'messages' => fn ($q) => $q->orderBy('sent_at'),
            'lead',
        ])->where('conversation_id', $conversationId)->firstOrFail();

        return Inertia::render('Admin/AiAgent/ConversationDetail', [
            'conversation' => [
                'id' => $conversation->id,
                'conversation_id' => $conversation->conversation_id,
                'channel' => $conversation->channel,
                'status' => $conversation->status,
                'summary' => $conversation->summary,
                'tags' => $conversation->tags,
                'started_at' => $conversation->started_at?->format('Y-m-d H:i'),
                'last_activity_at' => $conversation->last_activity_at?->format('Y-m-d H:i'),
                'messages' => $conversation->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'role' => $m->role,
                    'content' => $m->content,
                    'metadata' => $m->metadata,
                    'sent_at' => $m->sent_at->format('H:i:s'),
                    'sent_at_full' => $m->sent_at->format('Y-m-d H:i:s'),
                ])->values(),
                'lead' => $conversation->lead ? [
                    'id' => $conversation->lead->id,
                    'name' => $conversation->lead->name,
                    'phone' => $conversation->lead->phone,
                    'intent_type' => $conversation->lead->intent_type,
                    'status' => $conversation->lead->status,
                ] : null,
            ],
        ]);
    }
}
