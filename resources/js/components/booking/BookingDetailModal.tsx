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

                {/* 2. Body Content - 2 Column Grid */}
                <div className="bg-slate-50 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">

                    {/* Left Column (Main Info) - Span 8 */}
                    <div className="md:col-span-8 space-y-6">

                        {/* Trip Dates & Property - Horizontal Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="outline" className="rounded-md px-2 py-1 bg-slate-50">
                                    <Calendar className="w-3.5 h-3.5 mr-1" /> Trip Overview
                                </Badge>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm text-slate-600 font-medium">{nights} Nights Stay</span>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {/* Check In */}
                                <div className="flex-1 w-full p-4 rounded-lg bg-blue-50/50 border border-blue-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Check In</div>
                                    <div className="text-lg font-bold text-slate-900">{formatDate(booking.check_in)}</div>
                                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> 14:00 Onwards
                                    </div>
                                </div>

                                {/* Arrow/Divider */}
                                <div className="hidden md:flex flex-col items-center justify-center text-slate-300">
                                    <div className="w-full h-px bg-slate-200 w-16 mb-1"></div>
                                    <span className="text-xs font-medium bg-white px-2 text-slate-400">to</span>
                                    <div className="w-full h-px bg-slate-200 w-16 mt-1"></div>
                                </div>

                                {/* Check Out */}
                                <div className="flex-1 w-full p-4 rounded-lg bg-orange-50/50 border border-orange-100 relative overflow-hidden group hover:border-orange-200 transition-colors">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                    <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Check Out</div>
                                    <div className="text-lg font-bold text-slate-900">{formatDate(booking.check_out)}</div>
                                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> Before 12:00
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guest & Services Split */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Guest Info */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-500" /> Guest Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="text-sm text-slate-600">Total Guests</div>
                                        <div className="font-semibold text-slate-900">{booking.guest_count} Persons</div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="p-2 border rounded-lg">
                                            <div className="text-lg font-bold text-slate-700">{booking.guest_male}</div>
                                            <div className="text-[10px] uppercase text-slate-400 font-medium">Male</div>
                                        </div>
                                        <div className="p-2 border rounded-lg">
                                            <div className="text-lg font-bold text-slate-700">{booking.guest_female}</div>
                                            <div className="text-[10px] uppercase text-slate-400 font-medium">Female</div>
                                        </div>
                                        <div className="p-2 border rounded-lg">
                                            <div className="text-lg font-bold text-slate-700">{booking.guest_children}</div>
                                            <div className="text-[10px] uppercase text-slate-400 font-medium">Child</div>
                                        </div>
                                    </div>

                                    <div className="pt-2 space-y-2 border-t border-dashed">
                                        <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{booking.guest_phone}</span>
                                        </a>
                                        <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors group">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 truncate">{booking.guest_email}</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Notes & Specs */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-slate-500" /> Notes & Requests
                                </h3>

                                {booking.special_requests ? (
                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm leading-relaxed border border-yellow-100 flex gap-3">
                                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>"{booking.special_requests}"</span>
                                    </div>
                                ) : (
                                    <div className="text-slate-400 text-sm italic flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg">
                                        <MessageSquare className="w-5 h-5 mb-1 opacity-20" />
                                        No special requests
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Additional Info</div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600 flex items-center gap-2">
                                                <LinkIcon className="w-3.5 h-3.5" /> Source
                                            </span>
                                            <span className="capitalize font-medium">{booking.source || 'Direct'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra Services Table (if exists) */}
                        {booking.services && booking.services.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <h3 className="font-semibold text-slate-700 text-sm">Extra Services</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {booking.services.map((svc, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50/50">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{svc.service_name}</span>
                                                <span className="text-xs text-slate-500">Qty: {svc.quantity}</span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{formatCurrency(svc.total_price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Financials) - Span 4 */}
                    <div className="md:col-span-4 space-y-6">

                        {/* Financial Summary Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-0">
                            <div className="p-5 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-blue-600" /> Payment Summary
                                </h3>
                                <div className="text-xs text-slate-500">Financial breakdown for this booking</div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Base Rate ({nights}x)</span>
                                        <span>{formatCurrency(booking.base_amount || (booking.total_amount * 0.9))}</span>
                                    </div>
                                    {booking.extra_bed_amount > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Extra Bed</span>
                                            <span>{formatCurrency(booking.extra_bed_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-slate-600">
                                        <span>Taxes & Fees</span>
                                        <span>{formatCurrency(booking.tax_amount || (booking.total_amount * 0.1))}</span>
                                    </div>
                                    {booking.services && booking.services.length > 0 && (
                                        <div className="flex justify-between text-purple-600 font-medium">
                                            <span>Extra Services</span>
                                            <span>
                                                {formatCurrency(booking.services.reduce((sum, s) => sum + Number(s.total_price), 0))}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-dashed my-2"></div>

                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-700">Total Amount</span>
                                    <span className="text-2xl font-bold text-slate-900">{formatCurrency(booking.total_amount)}</span>
                                </div>

                                {/* Progress Bar / Status */}
                                <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-100">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500">Payment Status</span>
                                        <span className={isPaidOff ? 'text-green-600 font-bold' : 'text-blue-600 font-bold'}>
                                            {isPaidOff ? 'Paid Off' : `${Math.round((paidAmount / booking.total_amount) * 100)}% API`}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(100, (paidAmount / booking.total_amount) * 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <div className="text-xs text-slate-500">Paid</div>
                                            <div className="font-bold text-green-700">{formatCurrency(paidAmount)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500">Remaining</div>
                                            <div className={`font-bold ${isPaidOff ? 'text-slate-400' : 'text-red-600'}`}>
                                                {formatCurrency(remainingAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History List */}
                            {booking.payments && booking.payments.length > 0 && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Transactions</h4>
                                    <div className="space-y-3">
                                        {booking.payments.map((payment: any) => (
                                            <div key={payment.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-slate-700">{payment.payment_method}</span>
                                                    <span className="font-bold">{formatCurrency(payment.amount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500">
                                                    <span>{formatDate(payment.created_at)}</span>
                                                    <span className={`px-1.5 py-0.5 rounded ${payment.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {payment.payment_status}
                                                    </span>
                                                </div>
                                                {/* Attachment Link */}
                                                {payment.attachment_path && (
                                                    <div className="mt-2 pt-2 border-t border-dashed flex justify-end">
                                                        <a
                                                            href={`/storage/${payment.attachment_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            <LinkIcon className="w-3 h-3" /> View Proof
                                                            {payment.attachment_path.endsWith('.webp') ? '(WebP)' : ''}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
