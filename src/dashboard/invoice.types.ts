export interface InvoiceRecord {
  id: string;
  created_at: string;
  appointment_id: string;
  payment_id: string;
  amount: number;
  gst: number;
  total_amount: number;
}