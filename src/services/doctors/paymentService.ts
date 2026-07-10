import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import { throwIfError } from '../../services/errors';
import type { PaymentRecord, RazorpayOrder, RazorpaySuccessResponse } from './payment.types';

class PaymentService {
  private readonly payments = new SupabaseRepository<PaymentRecord>(TABLES.payments);

  /**
   * Creates a Razorpay order by calling a Supabase Edge Function.
   * This MUST be done on the server-side to protect your Razorpay secret.
   * @param amount - The amount in the smallest currency unit (e.g., paise).
   * @param receiptId - A unique receipt ID for your internal reference.
   * @returns The created Razorpay order object.
   * @throws {Error} If the Edge Function invocation fails or returns no data.
   */
  async createRazorpayOrder(amount: number, receiptId: string): Promise<RazorpayOrder> {
    // In a real app, this invokes a Supabase Edge Function.
    // const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    //   body: { amount, receipt: receiptId },
    // });
    // For demonstration, we'll mock the function call.
    console.log(`[PaymentService] Invoking Edge Function 'create-razorpay-order' with amount: ${amount}`);
    const { data, error } = await this.mockCreateOrder(amount, receiptId);

    throwIfError(error, 'Failed to create Razorpay order.');
    if (!data) throw new Error('No data returned from create-razorpay-order function.');

    return data as RazorpayOrder;
  }

  /**
   * Verifies a Razorpay payment by calling a Supabase Edge Function.
   * This is a critical security step and MUST be done on the server-side.
   * @param paymentResponse - The response object from Razorpay checkout.
   * @returns An object indicating verification success or failure.
   * @throws {Error} If the Edge Function invocation fails or returns no data.
   */
  async verifyRazorpayPayment(paymentResponse: RazorpaySuccessResponse): Promise<{ success: boolean; message: string }> {
    // In a real app, this invokes a Supabase Edge Function.
    // const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    //   body: paymentResponse,
    // });
    // For demonstration, we'll mock the function call.
    console.log(`[PaymentService] Invoking Edge Function 'verify-razorpay-payment'`);
    const { data, error } = await this.mockVerifyPayment(paymentResponse);

    throwIfError(error, 'Failed to verify payment.');
    if (!data) throw new Error('No data returned from verify-razorpay-payment function.');

    return data;
  }

  /**
   * Creates a payment record in the database after successful verification.
   * @param details The payment details to be saved.
   * @returns The newly created payment record from the database.
   * @throws {AppError} If the database insertion fails.
   */
  async createPaymentRecord(
    details: Omit<PaymentRecord, 'id' | 'created_at' | 'appointment_id'>,
  ): Promise<PaymentRecord> {
    const data = await this.payments.create(details);
    return data;
  }

  // --- MOCK IMPLEMENTATIONS (for demonstration) ---
  private async mockCreateOrder(amount: number, receipt: string): Promise<{ data: RazorpayOrder | null, error: any }> {
    await new Promise(res => setTimeout(res, 500)); // Simulate network delay
    const mockOrder: RazorpayOrder = {
      id: `order_${Date.now()}`,
      entity: 'order',
      amount: amount,
      amount_paid: 0,
      amount_due: amount,
      currency: 'INR',
      receipt,
      status: 'created',
      attempts: 0,
      notes: {},
      created_at: Math.floor(Date.now() / 1000),
    };
    return { data: mockOrder, error: null };
  }

  private async mockVerifyPayment(paymentResponse: RazorpaySuccessResponse): Promise<{ data: { success: boolean, message: string }, error: any }> {
    await new Promise(res => setTimeout(res, 500)); // Simulate network delay
    // In a real function, you'd use crypto to verify the signature.
    const isSignatureValid = paymentResponse.razorpay_signature.includes('mock_sig_');
    if (isSignatureValid) {
      return { data: { success: true, message: 'Payment verified successfully.' }, error: null };
    }
    return { data: { success: false, message: 'Payment verification failed: Invalid signature.' }, error: { message: 'Invalid signature' } };
  }
}

export const paymentService = new PaymentService();