import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VerifyRequest = {
  paymentId: string;
  providerSessionId?: string;
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

function mapRazorpayStatus(status: string) {
  if (status === 'paid') return 'paid';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'expired') return 'expired';
  return 'pending';
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

    const { paymentId, providerSessionId } = await req.json() as VerifyRequest;
    if (!paymentId) return json({ error: 'paymentId is required' }, 400);

    const { data: session, error: sessionError } = await supabase
      .from('payment_gateway_sessions')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return json({ error: 'Payment session not found' }, 404);

    let nextStatus = 'pending';
    let providerReference = providerSessionId ?? session.provider_session_id;

    if (session.provider === 'mock') {
      nextStatus = 'paid';
    } else {
      const linkId = providerSessionId ?? session.provider_session_id;
      if (!linkId) return json({ error: 'Missing provider session id' }, 400);

      const razorpayResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${linkId}`, {
        headers: { Authorization: getAuthHeader() },
      });
      const razorpay = await razorpayResponse.json();
      if (!razorpayResponse.ok) return json({ error: 'Razorpay verification failed', details: razorpay }, 502);

      nextStatus = mapRazorpayStatus(razorpay.status);
      providerReference = razorpay.id ?? linkId;
    }

    const paymentStatus = nextStatus === 'paid' ? 'paid' : nextStatus === 'pending' ? 'pending' : 'failed';

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ status: paymentStatus, provider_reference: providerReference })
      .eq('id', paymentId)
      .eq('user_id', userData.user.id)
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    const { data: updatedSession, error: updateSessionError } = await supabase
      .from('payment_gateway_sessions')
      .update({ status: nextStatus, provider_session_id: providerReference })
      .eq('id', session.id)
      .select('*')
      .single();

    if (updateSessionError) throw updateSessionError;

    return json({ payment, session: updatedSession, status: paymentStatus });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unable to verify payment session' }, 500);
  }
});
