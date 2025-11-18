/**
 * API Services Index
 * Export all services from single entry point
 */

export { propertiesService, default as PropertiesService } from './properties.service';
export { bookingsService, default as BookingsService } from './bookings.service';
export { paymentsService, default as PaymentsService } from './payments.service';
export { notificationsService, default as NotificationsService } from './notifications.service';

// Re-export types
export type * from './properties.service';
export type * from './bookings.service';
export type * from './payments.service';
export type * from './notifications.service';



