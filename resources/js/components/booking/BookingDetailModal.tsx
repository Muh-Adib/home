import React from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getBookingStatusText, formatDate } from "@/utils/date";
import { type Booking } from "@/types";
import {
    Users,
    Building2,
    Calendar,
    Phone,
    Mail,
    DollarSign,
    Eye,
    CheckCircle,
    XCircle,
    UserCheck,
    UserX,
    CreditCard,
    Clock,
    BedDouble,
    Sparkles,
    MessageSquare,
    Link as LinkIcon
} from "lucide-react";
import { Link, router } from "@inertiajs/react";
import { differenceInDays } from "date-fns";

export default function BookingDetailModal({
    booking,
    isOpen,
    onClose,
    canVerify = false,
    canCancel = false,
    canCheckIn = false,
}: {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
    canVerify?: boolean;
    canCancel?: boolean;
    canCheckIn?: boolean;
}) {
    if (!booking) return null;

    const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in)) || 1;

    // Calculate internals if missing (fallback)
    const paidAmount = booking.payments?.reduce((sum, p) => p.payment_status === 'verified' ? sum + p.amount : sum, 0) || booking.dp_amount || 0;
    const remainingAmount = booking.total_amount - paidAmount;
    const isPaidOff = remainingAmount <= 0;

    const handleAction = (action: string) => {
        const routes: Record<string, string> = {
            verify: `/admin/bookings/${booking.booking_number}/verify`,
            reject: `/admin/bookings/${booking.booking_number}/reject`,
            cancel: `/admin/bookings/${booking.booking_number}/cancel`,
            checkin: `/admin/bookings/${booking.booking_number}/checkin`,
            checkout: `/admin/bookings/${booking.booking_number}/checkout`,
        };
        if (routes[action]) {
            router.patch(routes[action]);
            onClose();
        }
    };

    const StatusBadge = ({ status, type }: { status: string, type: 'booking' | 'payment' }) => {
        const styles: Record<string, string> = {
            // Booking
            pending_verification: "bg-yellow-100 text-yellow-800 border-yellow-200",
            confirmed: "bg-green-100 text-green-800 border-green-200",
            checked_in: "bg-blue-100 text-blue-800 border-blue-200",
            checked_out: "bg-gray-100 text-gray-800 border-gray-200",
            cancelled: "bg-red-100 text-red-800 border-red-200",
            // Payment
            fully_paid: "bg-green-100 text-green-800 border-green-200",
            dp_received: "bg-blue-100 text-blue-800 border-blue-200",
            dp_pending: "bg-orange-100 text-orange-800 border-orange-200",
            overdue: "bg-red-100 text-red-800 border-red-200",
            refunded: "bg-purple-100 text-purple-800 border-purple-200",
        };
        const style = styles[status] || "bg-gray-100 text-gray-800";
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
                {status.replace(/_/g, " ").toUpperCase()}
            </span>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* z-[150] to ensure it's above fullscreen elements if possible */}
            <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 border-none shadow-2xl z-[150]">

                {/* 1. Header Section */}
                <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                    {/* Background Pattern/Image */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        {booking.property?.media?.[0]?.url && (
                            <img src={booking.property.media[0].url} className="w-full h-full object-cover blur-sm" />
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10" />

                    <div className="relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold shadow-lg ring-2 ring-white/20">
                                {booking.guest_name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{booking.guest_name}</h2>
                                <div className="flex items-center gap-2 text-slate-300 text-sm mt-1">
                                    <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-xs border border-slate-700">
                                        #{booking.booking_number}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {booking.property?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <StatusBadge status={booking.booking_status} type="booking" />
                            <StatusBadge status={booking.payment_status} type="payment" />
                        </div>
                    </div>
                </div>

                {/* 2. Body Content - 3 Column Grid */}
                <div className="bg-slate-50 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">

                    {/* Col 1: Trip Details & Guests */}
                    <div className="space-y-6">
                        {/* Dates Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Trip Dates
                            </h3>
                            <div className="flex items-center justify-between mb-4 relative">
                                <div className="text-center">
                                    <div className="text-xs text-slate-500 mb-1">Check-in</div>
                                    <div className="font-bold text-slate-900">{formatDate(booking.check_in)}</div>
                                    <div className="text-xs text-slate-400 mt-1">14:00</div>
                                </div>
                                <div className="flex-1 border-t px-2 relative top-[-10px] mx-2 border-dashed border-slate-300">
                                    <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-slate-100 text-xs px-2 py-0.5 rounded-full font-medium text-slate-600">
                                        {nights} Nights
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-500 mb-1">Check-out</div>
                                    <div className="font-bold text-slate-900">{formatDate(booking.check_out)}</div>
                                    <div className="text-xs text-slate-400 mt-1">12:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Guest Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4" /> Guest Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-sm text-slate-600">Total Guests</span>
                                    <span className="font-medium">{booking.guest_count} Person(s)</span>
                                </div>
                                <div className="text-sm text-slate-500 flex gap-4">
                                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {booking.guest_male} Male</span>
                                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {booking.guest_female} Female</span>
                                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {booking.guest_children} Child</span>
                                </div>
                                <div className="pt-3 flex flex-col gap-2">
                                    <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                        <Phone className="w-3.5 h-3.5" /> {booking.guest_phone}
                                    </a>
                                    <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                        <Mail className="w-3.5 h-3.5" /> {booking.guest_email}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Col 2: Services & Notes */}
                    <div className="space-y-6">
                        {/* Special Requests */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full">
                            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Notes
                            </h3>
                            {booking.special_requests ? (
                                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm italic border border-yellow-100">
                                    "{booking.special_requests}"
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm italic">No special requests</div>
                            )}

                            {/* Additional Services List (if any) */}
                            {booking.services && booking.services.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-slate-900 mb-2">Extra Services</h4>
                                    <div className="space-y-2">
                                        {booking.services.map((svc, i) => (
                                            <div key={i} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                                                <span>{svc.service_name} (x{svc.quantity})</span>
                                                <span className="font-medium">{formatCurrency(svc.total_price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Col 3: Financials */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Payment Details
                                </h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Breakdown */}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Base Rate ({nights} nights)</span>
                                    <span className="font-medium">{formatCurrency(booking.base_amount || (booking.total_amount * 0.9))}</span>
                                </div>
                                {booking.extra_bed_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Extra Bed</span>
                                        <span className="font-medium">{formatCurrency(booking.extra_bed_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Taxes & Fees</span>
                                    <span className="font-medium">{formatCurrency(booking.tax_amount || (booking.total_amount * 0.1))}</span>
                                </div>

                                <div className="border-t my-2"></div>

                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-900">Total</span>
                                    <span className="font-bold text-xl text-slate-900">{formatCurrency(booking.total_amount)}</span>
                                </div>

                                {/* Paid vs Remaining */}
                                <div className="bg-slate-50 rounded-lg p-3 mt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-green-700">
                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>
                                        <span className="font-bold">{formatCurrency(paidAmount)}</span>
                                    </div>
                                    {!isPaidOff && (
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Remaining</span>
                                            <span className="font-bold">{formatCurrency(remainingAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Footer Actions */}
                <div className="bg-white p-4 border-t flex flex-wrap justify-between items-center gap-3">
                    <Button variant="outline" asChild size="sm">
                        <Link href={`/admin/bookings/${booking.booking_number}`}>
                            <Eye className="w-4 h-4 mr-2" /> Full Details
                        </Link>
                    </Button>

                    <div className="flex gap-2">
                        {canVerify && booking.booking_status === 'pending_verification' && (
                            <>
                                <Button variant="destructive" size="sm" onClick={() => handleAction('reject')}>
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => handleAction('verify')}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Verify
                                </Button>
                            </>
                        )}

                        {canCheckIn && booking.booking_status === 'confirmed' && (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => handleAction('checkin')}>
                                <UserCheck className="w-4 h-4 mr-2" /> Check In
                            </Button>
                        )}

                        {canCheckIn && booking.booking_status === 'checked_in' && (
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white" size="sm" onClick={() => handleAction('checkout')}>
                                <UserX className="w-4 h-4 mr-2" /> Check Out
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
