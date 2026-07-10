export interface RazorpayOrder {
  id: string; // The Razorpay Order ID
  entity: 'order';
  amount: number; // in the smallest currency unit (e.g., paise for INR)
  amount_paid: number;
  amount_due: number;
  currency: 'INR';
  receipt: string; // Your internal receipt ID
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, any>;
  created_at: number; // Unix timestamp
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id: string;
    payment_id: string;
  };
}

export interface PaymentRecord {
    id: string;
    created_at: string;
    appointment_id?: string | null;
    owner_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    provider: 'razorpay' | 'stripe';
    provider_payment_id: string;
    provider_order_id: string;
}

export interface InvoiceRecord {
    id: string;
    created_at: string;
    appointment_id: string;
    payment_id: string;
    amount: number;
    gst?: number;
    total_amount: number;
    invoice_pdf_url?: string;
}