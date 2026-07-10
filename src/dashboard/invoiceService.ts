import { supabase } from '../core/services/supabase';
import { TABLES } from '../constants';
import { throwIfError } from '../services/errors';
import type { InvoiceRecord } from './invoice.types';

class InvoiceService {
  /**
   * Creates an invoice record in the database.
   * @param {Omit<InvoiceRecord, 'id' | 'created_at'>} details - The details of the invoice to create.
   * @returns {Promise<InvoiceRecord>} The newly created invoice record.
   * @throws {AppError} If the database insertion fails.
   * @throws {Error} If the database returns no data without an error.
   */
  async createInvoiceRecord(details: Omit<InvoiceRecord, 'id' | 'created_at'>): Promise<InvoiceRecord> {
    const { data, error } = await supabase.from(TABLES.invoices).insert(details).select().single();
    throwIfError(error, 'Failed to create invoice record.');
    if (!data) {
      throw new Error('createInvoiceRecord returned no data, but no error was thrown.');
    }
    return data;
  }
}

export const invoiceService = new InvoiceService();