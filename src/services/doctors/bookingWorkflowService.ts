import { appointmentService, AppointmentBookingPayload } from '../../appointments/services/appointmentService';
import { paymentService } from './paymentService';
import { invoiceService } from '../../dashboard/invoiceService';
import { notificationService } from '../notifications/notificationService';
import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import { throwIfError } from '../errors';
import type { RazorpaySuccessResponse } from './payment.types';
import type { AppointmentRecord } from '../../types';

const PLATFORM_FEE_INR = 50;
const GST_RATE = 0.18;

function calculateAmounts(baseFee: number) {
  const platformFee = PLATFORM_FEE_INR;
  const feeWithPlatform = baseFee + platformFee;
  const gst = feeWithPlatform * GST_RATE;
  const totalAmount = feeWithPlatform + gst;
  return {
    platformFee,
    gst,
    totalAmount,
    totalAmountInPaise: Math.round(totalAmount * 100),
  };
}

class BookingWorkflowService {
  /**
   * Step 1 of Booking: Create a Razorpay order and get details for checkout.
   * This involves calculating the total amount, creating a server-side Razorpay order,
   * and fetching user details to pre-fill the payment form.
   * @param bookingPayload - The details of the appointment being booked.
   * @returns An object containing Razorpay order details and prefill information for the checkout UI.
   * @throws {Error} If the current user cannot be determined.
   */
  async initiateBookingAndPayment(bookingPayload: AppointmentBookingPayload) {
    const { totalAmountInPaise } = calculateAmounts(bookingPayload.fee);
    const receiptId = `receipt_appt_${Date.now()}`;
    const order = await paymentService.createRazorpayOrder(totalAmountInPaise, receiptId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Could not get current user for payment.');
    
    const { data: profile } = await supabase.from(TABLES.profiles).select('full_name, phone').eq('id', user.id).single();

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      prefill: {
        name: profile?.full_name ?? 'Pet Owner',
        email: user.email ?? '',
        contact: profile?.phone ?? '',
      },
      notes: {
        appointmentType: bookingPayload.appointmentType,
        doctorId: bookingPayload.doctorId,
        petId: bookingPayload.petId,
      },
    };
  }

  /**
   * Step 2 of Booking: Verify payment and create all related records.
   * This function should be called from the Razorpay success handler.
   * It's designed to be atomic, but true atomicity requires a single backend transaction.
   * @param {RazorpaySuccessResponse} paymentData - The success response from Razorpay.
   * @param {AppointmentBookingPayload} bookingPayload - The original booking payload.
   * @returns {Promise<AppointmentRecord>} The newly created appointment record.
   * @throws {Error} If payment verification fails or if any database operation fails.
   */
  async finalizeBookingAfterPayment(
    paymentData: RazorpaySuccessResponse,
    bookingPayload: AppointmentBookingPayload,
  ): Promise<AppointmentRecord> {
    // 1. Verify Payment
    const verification = await paymentService.verifyRazorpayPayment(paymentData);
    if (!verification.success) {
      throw new Error(`Payment verification failed: ${verification.message}`);
    }

    // The following steps should ideally be in a single database transaction
    // or a single Supabase Edge Function to ensure atomicity.

    // 2. Create Payment Record
    const { gst, totalAmount } = calculateAmounts(bookingPayload.fee);
    const paymentRecord = await paymentService.createPaymentRecord({
      owner_id: bookingPayload.ownerId,
      amount: totalAmount,
      currency: 'INR',
      status: 'completed',
      provider: 'razorpay',
      provider_payment_id: paymentData.razorpay_payment_id,
      provider_order_id: paymentData.razorpay_order_id,
    });

    // 3. Create Appointment
    const appointmentRecord = await appointmentService.createAppointmentAfterPayment(
      bookingPayload,
      paymentRecord.id,
    );

    // 4. Link Payment to Appointment (update payment record)
    await supabase
      .from(TABLES.payments)
      .update({ appointment_id: appointmentRecord.id })
      .eq('id', paymentRecord.id);

    // 5. Create Invoice
    await invoiceService.createInvoiceRecord({
      appointment_id: appointmentRecord.id,
      payment_id: paymentRecord.id,
      amount: bookingPayload.fee,
      gst: Math.round(gst * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
    });

    // 6. Generate Notifications (placeholders for real messages)
    await Promise.all([
      notificationService.createNotification(bookingPayload.ownerId, `Your appointment is booked and awaiting confirmation.`, appointmentRecord.id, 'appointment_booked'),
      notificationService.createNotification(bookingPayload.doctorId, `You have a new appointment request.`, appointmentRecord.id, 'new_appointment_request'),
    ]);

    // 7. Return the created appointment
    return appointmentRecord;
  }
}

export const bookingWorkflowService = new BookingWorkflowService();