import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventInput, EventClickArg, EventDropArg } from '@fullcalendar/core';

// Import FullCalendar CSS
import '@fullcalendar/core/main.css';
import '@fullcalendar/daygrid/main.css';

export interface CalendarEvent {
    id: string; // This is the UUID
    title: string;
    start: string;
    backgroundColor?: string;
    borderColor?: string;
    extendedProps?: {
        status: string;
        priority: number;
        content_type: string;
        has_article: boolean;
    };
}

interface CalendarViewProps {
    events: CalendarEvent[];
    onEventClick: (event: any) => void;
    onDateClick: (date: Date) => void;
    onEventDrop: (event: any) => void;
}

export default function CalendarView({ events, onEventClick, onDateClick, onEventDrop }: CalendarViewProps) {
    const handleEventClick = (clickInfo: EventClickArg) => {
        onEventClick(clickInfo);
    };

    const handleDateClick = (arg: DateClickArg) => {
        onDateClick(arg.date);
    };

    const handleEventDrop = (dropInfo: EventDropArg) => {
        onEventDrop(dropInfo);
    };

    return (
        <div className="calendar-container">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                editable={true}
                eventDrop={handleEventDrop}
                height="auto"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek',
                }}
                eventClassNames={(arg) => {
                    const status = arg.event.extendedProps?.status || '';
                    return [`status-${status}`];
                }}
            />
        </div>
    );
}
