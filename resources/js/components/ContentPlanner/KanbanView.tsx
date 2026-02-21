import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Sparkles, Calendar, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentPlan {
    id: number;
    uuid: string;
    title: string;
    description: string | null;
    target_keywords: string[];
    target_audience: string | null;
    content_type: string | null;
    status: string;
    priority: number;
    planned_publish_date: string | null;
    creator?: { name: string };
    assignee?: { name: string };
    article?: { id: number; slug: string };
}

interface KanbanColumn {
    id: string;
    title: string;
    plans: ContentPlan[];
}

interface KanbanViewProps {
    columns: Record<string, ContentPlan[]>;
    onStatusChange: (planUuid: string, newStatus: string) => void;
    onConvertToArticle: (planUuid: string) => void;
    onCardClick?: (uuid: string) => void;
}

const STATUS_CONFIG = {
    idea: { label: 'Idea', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    researching: { label: 'Researching', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    outlining: { label: 'Outlining', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    writing: { label: 'Writing', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    reviewing: { label: 'Reviewing', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    scheduled: { label: 'Scheduled', color: 'bg-green-100 text-green-700 border-green-300' },
    published: { label: 'Published', color: 'bg-teal-100 text-teal-700 border-teal-300' },
};

function PlanCard({ plan, onConvertToArticle, onCardClick }: { plan: ContentPlan; onConvertToArticle: (uuid: string) => void; onCardClick?: (uuid: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.uuid });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer mb-3",
                isDragging && "opacity-50 ring-2 ring-blue-500"
            )}
            onClick={() => onCardClick ? onCardClick(plan.uuid) : router.get(route('admin.content-plans.show', plan.uuid))}
        >
            <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm line-clamp-2">{plan.title || 'Untitled'}</h4>
                <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium shrink-0 ml-2',
                    `priority-${plan.priority}`
                )}>
                    P{plan.priority}
                </span>
            </div>

            {plan.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{plan.description}</p>
            )}

            <div className="flex flex-wrap gap-1 mb-3">
                {plan.target_keywords?.slice(0, 3).map((kw, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {kw}
                    </span>
                ))}
            </div>

            {plan.planned_publish_date && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3 h-3" />
                    {new Date(plan.planned_publish_date).toLocaleDateString()}
                </div>
            )}

            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7"
                    onClick={(e) => {
                        e.stopPropagation();
                        router.get(route('admin.content-plans.show', plan.uuid));
                    }}
                >
                    <Edit className="w-3 h-3 mr-1" />
                    Open
                </Button>

                {!plan.article && (
                    <Button
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                            e.stopPropagation();
                            onConvertToArticle(plan.uuid);
                        }}
                    >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Article
                    </Button>
                )}
            </div>

            {plan.article && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    ✓ Article created
                </div>
            )}
        </div>
    );
}

function KanbanColumn({ status, title, plans, onConvertToArticle, onCardClick }: { status: string; title: string; plans: ContentPlan[]; onConvertToArticle: (uuid: string) => void; onCardClick?: (uuid: string) => void }) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];

    return (
        <div className="flex-shrink-0 w-80">
            <div className={cn('rounded-t-lg border-2 px-4 py-2', config.color)}>
                <h3 className="font-semibold text-sm flex items-center justify-between">
                    {title}
                    <span className="text-xs opacity-75">({plans.length})</span>
                </h3>
            </div>
            <div className="bg-gray-50 rounded-b-lg border-2 border-t-0 border-gray-200 p-3 min-h-[500px]">
                <SortableContext items={plans.map(p => p.uuid)} strategy={verticalListSortingStrategy}>
                    {plans.map(plan => (
                        <PlanCard key={plan.uuid} plan={plan} onConvertToArticle={onConvertToArticle} onCardClick={onCardClick} />
                    ))}
                </SortableContext>
                {plans.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                        No plans in this stage
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KanbanView({ columns, onStatusChange, onConvertToArticle, onCardClick }: KanbanViewProps) {
    const [activeUuid, setActiveUuid] = React.useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveUuid(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveUuid(null);
            return;
        }

        // Find which column the item was dropped into
        const activeUuid = active.id as string;
        const overId = over.id as string;

        // Find the status of the dropped zone
        let newStatus = '';

        // If dropped directly on a column (id is the status string)
        if (typeof over.id === 'string' && STATUS_CONFIG[over.id as keyof typeof STATUS_CONFIG]) {
            newStatus = over.id;
        } else {
            // Dropped on another card, find that card's column
            for (const [status, plans] of Object.entries(columns)) {
                if (plans.some(p => p.uuid === overId)) {
                    newStatus = status;
                    break;
                }
            }
        }

        if (newStatus && newStatus !== findPlanStatus(activeUuid, columns)) {
            onStatusChange(activeUuid, newStatus);
        }

        setActiveUuid(null);
    };

    const findPlanStatus = (planUuid: string, cols: Record<string, ContentPlan[]>): string => {
        for (const [status, plans] of Object.entries(cols)) {
            if (plans.some(p => p.uuid === planUuid)) {
                return status;
            }
        }
        return '';
    };

    const statuses = ['idea', 'researching', 'outlining', 'writing', 'reviewing', 'scheduled', 'published'];

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {statuses.map(status => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        title={STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
                        plans={columns[status] || []}
                        onConvertToArticle={onConvertToArticle}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>
        </DndContext>
    );
}
