// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AskAiRequest = {
  hostelId?: string;
  question?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function detectIntent(question: string) {
  const text = question.toLowerCase();
  if (text.includes('not paid') || text.includes('pending rent') || text.includes('rent due') || text.includes('unpaid')) return 'pending_rent';
  if (text.includes('vacant') || text.includes('available bed') || text.includes('free bed') || text.includes('available room')) return 'vacant_beds';
  if (text.includes('vacating') || text.includes('leaving') || text.includes('departure') || text.includes('vacate')) return 'vacating_next_month';
  if (text.includes('decrease') || text.includes('down') || (text.includes('why') && text.includes('profit'))) return 'profit_decrease';
  if (text.includes('profit') || text.includes('income') || text.includes('net')) return 'profit';
  if (text.includes('joined') || text.includes('admission') || text.includes('new tenant')) return 'new_admissions';
  if (text.includes('expense') || text.includes('food') || text.includes('electricity') || text.includes('cost')) return 'expense_analysis';
  if (text.includes('document') || text.includes('aadhaar') || text.includes('agreement') || text.includes('photo')) return 'documents';
  if (text.includes('today') || text.includes('work') || text.includes('task')) return 'daily_ops';
  if (text.includes('report') || text.includes('export') || text.includes('pdf') || text.includes('excel')) return 'reports';
  return 'general';
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
    nextStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10),
    nextEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0)).toISOString().slice(0, 10),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase Edge Function secrets are missing.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userError || !userResult.user) return jsonResponse({ error: 'Invalid session.' }, 401);

  const payload = await req.json().catch(() => ({})) as AskAiRequest;
  const hostelId = payload.hostelId;
  const question = payload.question?.trim();
  if (!hostelId || !question) return jsonResponse({ error: 'hostelId and question are required.' }, 400);

  const { data: membership, error: membershipError } = await supabase
    .from('hostel_members')
    .select('id,role')
    .eq('hostel_id', hostelId)
    .eq('user_id', userResult.user.id)
    .eq('status', 'Active')
    .maybeSingle();

  if (membershipError) return jsonResponse({ error: membershipError.message }, 500);
  if (!membership) return jsonResponse({ error: 'You do not have access to this hostel.' }, 403);

  const intent = detectIntent(question);
  const range = currentMonthRange();

  const [hostelResult, tenantsResult, roomsResult, expensesResult, rentResult] = await Promise.all([
    supabase.from('hostels').select('id,name,address').eq('id', hostelId).single(),
    supabase
      .from('tenants')
      .select('id,full_name,mobile_number,joining_date,vacate_date,monthly_rent,rent_due_day,status,rent_status,beds(bed_number,rooms(room_number,floor))')
      .eq('hostel_id', hostelId),
    supabase
      .from('rooms')
      .select('room_number,floor,beds(bed_number,status)')
      .eq('hostel_id', hostelId),
    supabase
      .from('expenses')
      .select('category,amount,expense_date,vendor')
      .eq('hostel_id', hostelId)
      .gte('expense_date', range.start)
      .lte('expense_date', range.end),
    supabase
      .from('rent_payments')
      .select('amount,paid_amount,due_date,status,tenants(full_name,beds(bed_number,rooms(room_number,floor)))')
      .eq('hostel_id', hostelId)
      .gte('rent_month', range.start)
      .lte('rent_month', range.end),
  ]);

  if (hostelResult.error) return jsonResponse({ error: hostelResult.error.message }, 500);
  if (tenantsResult.error) return jsonResponse({ error: tenantsResult.error.message }, 500);
  if (roomsResult.error) return jsonResponse({ error: roomsResult.error.message }, 500);
  if (expensesResult.error) return jsonResponse({ error: expensesResult.error.message }, 500);
  if (rentResult.error) return jsonResponse({ error: rentResult.error.message }, 500);

  const dataForAi = {
    hostel: hostelResult.data,
    intent,
    tenants: tenantsResult.data?.map((tenant: any) => ({
      name: tenant.full_name,
      joining_date: tenant.joining_date,
      vacate_date: tenant.vacate_date,
      monthly_rent: tenant.monthly_rent,
      rent_due_day: tenant.rent_due_day,
      status: tenant.status,
      rent_status: tenant.rent_status,
      bed: tenant.beds?.bed_number,
      room: tenant.beds?.rooms?.room_number,
      floor: tenant.beds?.rooms?.floor,
    })),
    rooms: roomsResult.data,
    expenses: expensesResult.data,
    rent_payments: rentResult.data,
  };

  if (!geminiApiKey) {
    return jsonResponse({
      type: intent,
      answer: 'Gemini is not configured yet. Add GEMINI_API_KEY as a Supabase Edge Function secret to enable AI-formatted answers.',
      data: dataForAi,
    });
  }

  const prompt = `
You are PGCopilot AI for hostel/PG owners.
Answer only using the JSON data below.
Do not expose Aadhaar, documents, passwords, API keys, or data from another hostel.
Do not modify or delete data.
Keep the answer short, practical, and owner-friendly.

Question: ${question}
Filtered hostel data:
${JSON.stringify(dataForAi)}

Return JSON only:
{
  "type": "${intent}",
  "answer": "short answer",
  "bullets": ["important detail 1", "important detail 2"],
  "actions": ["recommended action 1", "recommended action 2"]
}
`;

  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    return jsonResponse({ error: `Gemini request failed: ${errorText}` }, 502);
  }

  const geminiJson = await geminiResponse.json();
  const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return jsonResponse({ error: 'Gemini returned an empty response.' }, 502);

  try {
    return jsonResponse(JSON.parse(text));
  } catch {
    return jsonResponse({ type: intent, answer: text, bullets: [], actions: [] });
  }
});
