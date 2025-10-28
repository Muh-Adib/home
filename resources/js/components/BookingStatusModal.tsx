import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { 
    AlertTriangle,
    DollarSign,
    CreditCard,
    Calendar,
    User,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Info
} from 'lucide-react';

interface Payment {
    id: number;
    amount: number;
    payment_status: string;
    payment_date: string;
    payment_method: string;
    reference_number?: string;
}

interface BookingStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
    booking: {
        booking_number: string;
        total_amount: number;
        payment_status: string;
        booking_status: string;
        guest_name: string;
        check_in: string;
        check_out: string;
    };
    payments: Payment[];
    loading?: boolean;
}

export default function BookingStatusModal({
    isOpen,
    onClose,
    onConfirm,
    booking,
    payments,
    loading = false
}: BookingStatusModalProps) {
    const [newStatus, setNewStatus] = useState(booking.booking_status);
    const [refundData, setRefundData] = useState({
        refund_amount: 0,
        refund_reason: '',
        refund_method: 'bank_transfer',
        refund_account: '',
        refund_notes: '',
    });
    const [showRefundForm, setShowRefundForm] = useState(false);

    // Calculate total paid amount
    const totalPaid = payments
        .filter(p => p.payment_status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);

    // Calculate refund amount
    const refundAmount = newStatus === 'cancelled' ? totalPaid : 0;

    // Check if status change requires refund
    const requiresRefund = newStatus === 'cancelled' && totalPaid > 0;

    const handleStatusChange = (status: string) => {
        setNewStatus(status);
        setShowRefundForm(status === 'cancelled' && totalPaid > 0);
        
        if (status === 'cancelled' && totalPaid > 0) {
            setRefundData(prev => ({
                ...prev,
                refund_amount: totalPaid
            }));
        }
    };

    const handleConfirm = () => {
        const data = {
            new_status: newStatus,
            refund_data: showRefundForm ? refundData : null,
        };
        onConfirm(data);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="h-4 w-4" />;
            case 'pending_verification': return <Clock className="h-4 w-4" />;
            case 'cancelled': return <XCircle className="h-4 w-4" />;
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-brand-primary" />
                        Change Booking Status
                    </DialogTitle>
                    <DialogDescription>
                        Update booking status for {booking.booking_number}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Booking Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Booking Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Guest:</span>
                                    <span className="ml-2">{booking.guest_name}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Dates:</span>
                                    <span className="ml-2">
                                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">Total Amount:</span>
                                    <span className="ml-2 font-semibold">{formatCurrency(booking.total_amount)}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Total Paid:</span>
                                    <span className="ml-2 font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Current Status:</span>
                                <Badge className={getStatusColor(booking.booking_status)}>
                                    {getStatusIcon(booking.booking_status)}
                                    <span className="ml-1">{booking.booking_status}</span>
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">New Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Label htmlFor="status">Select New Status</Label>
                                <Select value={newStatus} onValueChange={handleStatusChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending_verification">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Pending Verification
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="confirmed">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4" />
                                                Confirmed
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4" />
                                                Cancelled
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4" />
                                                Completed
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Refund Information */}
                    {requiresRefund && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                                    <AlertTriangle className="h-5 w-5" />
                                    Refund Required
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Refund Required</AlertTitle>
                                    <AlertDescription>
                                        Cancelling this booking requires a refund of {formatCurrency(totalPaid)} to the guest.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="refund_amount">Refund Amount</Label>
                                        <Input
                                            id="refund_amount"
                                            type="number"
                                            value={refundData.refund_amount}
                                            onChange={(e) => setRefundData(prev => ({
                                                ...prev,
                                                refund_amount: parseFloat(e.target.value) || 0
                                            }))}
                                            placeholder="Enter refund amount"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="refund_reason">Refund Reason</Label>
                                        <Textarea
                                            id="refund_reason"
                                            value={refundData.refund_reason}
                                            onChange={(e) => setRefundData(prev => ({
                                                ...prev,
                                                refund_reason: e.target.value
                                            }))}
                                            placeholder="Reason for refund..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="refund_method">Refund Method</Label>
                                            <Select 
                                                value={refundData.refund_method} 
                                                onValueChange={(value) => setRefundData(prev => ({
                                                    ...prev,
                                                    refund_method: value
                                                }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="refund_account">Account Details</Label>
                                            <Input
                                                id="refund_account"
                                                value={refundData.refund_account}
                                                onChange={(e) => setRefundData(prev => ({
                                                    ...prev,
                                                    refund_account: e.target.value
                                                }))}
                                                placeholder="Bank account or details"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="refund_notes">Additional Notes</Label>
                                        <Textarea
                                            id="refund_notes"
                                            value={refundData.refund_notes}
                                            onChange={(e) => setRefundData(prev => ({
                                                ...prev,
                                                refund_notes: e.target.value
                                            }))}
                                            placeholder="Additional notes for refund..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Summary */}
                    {payments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={payment.payment_status === 'verified' ? 'default' : 'secondary'}>
                                                        {payment.payment_status}
                                                    </Badge>
                                                    <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(payment.payment_date)} • {payment.payment_method}
                                                {payment.reference_number && ` • ${payment.reference_number}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || (requiresRefund && (!refundData.refund_reason || refundData.refund_amount <= 0))}
                        className="bg-brand-primary hover:bg-brand-primary-dark"
                    >
                        {loading ? (
                            <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Update Status
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
