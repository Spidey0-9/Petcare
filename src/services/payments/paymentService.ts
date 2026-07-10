import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import { logDatabaseFailure } from '../database/databaseDiagnostics';

export type PaymentMethod = 'upi' | 'credit_card' | 'debit_card' | 'wallet' | 'cash_on_delivery' | 'online_gateway';

export type PaymentRecord = {
  id?: string;
  user_id?: string;
  order_id?: string | null;
  appointment_id?: string | null;
  amount: number;
  method: PaymentMethod;
  status?: string;
  provider_reference?: string | null;
  created_at?: string;
};

export type InvoiceRecord = {
  id?: string;
  user_id?: string;
  order_id?: string | null;
  payment_id?: string | null;
  invoice_number: string;
  file_url?: string | null;
  total: number;
  created_at?: string;
};

export type CheckoutSessionRequest = {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string | null;
  appointmentId?: string | null;
  membershipPlan?: 'monthly' | 'yearly' | null;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  metadata?: Record<string, unknown>;
};

export type CheckoutSession = {
  provider: 'razorpay';
  payment: PaymentRecord & { id: string };
  session: {
    id: string;
    provider_session_id?: string | null;
    checkout_url?: string | null;
  };
  checkoutUrl: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value?: string | null) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export class PaymentService {
  private readonly payments = new SupabaseRepository<PaymentRecord>(TABLES.payments);
  private readonly invoices = new SupabaseRepository<InvoiceRecord>(TABLES.invoices);

  createPayment(payload: Partial<PaymentRecord>) {
    return this.payments.create(payload);
  }

  updatePaymentStatus(id: string, status: string, providerReference?: string) {
    return this.payments.update(id, { status, provider_reference: providerReference });
  }

  listPayments(userId: string) {
    return this.payments.list({ filters: { user_id: userId }, orderBy: 'created_at' });
  }

  createInvoice(payload: Partial<InvoiceRecord>) {
    return this.invoices.create(payload);
  }

  async createCheckoutSession(payload: CheckoutSessionRequest) {
    const returnUrl = Linking.createURL('payment-return');
    const { data, error } = await supabase.functions.invoke('create-payment-session', {
      body: {
        ...payload,
        orderId: normalizeUuid(payload.orderId),
        appointmentId: normalizeUuid(payload.appointmentId),
        currency: payload.currency ?? 'INR',
        returnUrl,
      },
    });

    if (error) throw new Error(error.message || 'Payment gateway is unavailable.');
    if (!data?.checkoutUrl || !data?.payment?.id) throw new Error('Payment gateway did not return a checkout session.');
    return data as CheckoutSession;
  }

  async verifyCheckoutSession(paymentId: string, providerSessionId?: string | null) {
    const { data, error } = await supabase.functions.invoke('verify-payment-session', {
      body: {
        paymentId,
        providerSessionId,
      },
    });

    if (error) throw new Error(error.message || 'Payment verification is unavailable.');
    return data as { status: string; payment: PaymentRecord; session: unknown };
  }

  async startCheckout(payload: CheckoutSessionRequest) {
    try {
      const checkout = await this.createCheckoutSession(payload);
      const returnUrl = Linking.createURL('payment-return');
      await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, returnUrl);
      return await this.verifyCheckoutSession(checkout.payment.id, checkout.session.provider_session_id);
    } catch (error) {
      await logDatabaseFailure({
        module: 'PaymentService',
        table: TABLES.payments,
        operation: 'startCheckout',
        query: 'create and verify payment gateway session',
      }, error);
      throw error;
    }
  }

}

export const paymentService = new PaymentService();

