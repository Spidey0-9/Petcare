import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CheckoutRequest = {
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
  returnUrl?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseClient(authorization: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );
}

function getAuthHeader() {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization) return json({ error: 'Missing authorization header' }, 401);

    const supabase = getSupabaseClient(authorization);
    const { data: userData, error: userError } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json() as CheckoutRequest;
    const amount = Number(body.amount);
    const currency = (body.currency ?? 'INR').toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Amount must be greater than zero' }, 400);

    const userId = userData.user.id;
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        order_id: body.orderId ?? null,
        appointment_id: body.appointmentId ?? null,
        amount,
        method: 'online_gateway',
        status: 'created',
      })
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    const mode = Deno.env.get('PAYMENT_GATEWAY_MODE') ?? 'razorpay';
    const returnUrl = body.returnUrl ?? `petcareplus://payment-return?payment_id=${payment.id}`;

    if (mode === 'mock' || !Deno.env.get('RAZORPAY_KEY_ID') || !Deno.env.get('RAZORPAY_KEY_SECRET')) {
      const checkoutUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}mock_payment_id=${payment.id}`;
      const { data: session, error: sessionError } = await supabase
        .from('payment_gateway_sessions')
        .insert({
          user_id: userId,
          payment_id: payment.id,
          provider: 'mock',
          provider_session_id: `mock_${payment.id}`,
          checkout_url: checkoutUrl,
          status: 'created',
          amount,
          currency,
          metadata: body.metadata ?? {},
        })
        .select('*')
        .single();

      if (sessionError) throw sessionError;
      return json({ provider: 'mock', payment, session, checkoutUrl });
    }

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency,
        accept_partial: false,
        description: body.description ?? 'PetCare+ payment',
        reference_id: payment.id,
        customer: body.customer,
        notify: { sms: false, email: false },
        callback_url: returnUrl,
        callback_method: 'get',
        notes: {
          payment_id: payment.id,
          order_id: body.orderId ?? '',
          appointment_id: body.appointmentId ?? '',
          membership_plan: body.membershipPlan ?? '',
        },
      }),
    });

    const razorpay = await razorpayResponse.json();
    if (!razorpayResponse.ok) return json({ error: 'Razorpay checkout creation failed', details: razorpay }, 502);

    const { data: session, error: sessionError } = await supabase
      .from('payment_gateway_sessions')
      .insert({
        user_id: userId,
        payment_id: payment.id,
        provider: 'razorpay',
        provider_session_id: razorpay.id,
        checkout_url: razorpay.short_url,
        status: 'created',
        amount,
        currency,
        metadata: body.metadata ?? {},
      })
      .select('*')
      .single();

    if (sessionError) throw sessionError;
    return json({ provider: 'razorpay', payment, session, checkoutUrl: razorpay.short_url });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unable to create payment session' }, 500);
  }
});
