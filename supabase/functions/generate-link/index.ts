import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const name = url.searchParams.get('name') || undefined;
    const wh_id = url.searchParams.get('wh_id') || undefined;
    const inst = url.searchParams.get('inst') || undefined;
    const redirectTo = url.searchParams.get('redirect_to') || undefined;
    const mode = url.searchParams.get('mode') || 'redirect'; // 'redirect' | 'json'

    if (!email) {
      return new Response(JSON.stringify({ error: 'email é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Servidor sem configuração do Supabase' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Generate a magic link (creates user if it doesn't exist)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    });

    const actionLink = linkData?.properties?.action_link as string | undefined;
    if (linkError || !linkData?.user || !actionLink) {
      console.error('generateLink error', linkError);
      return new Response(JSON.stringify({ error: linkError?.message || 'Falha ao gerar magic link' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const user = linkData.user;

    // Upsert into public.users with provided metadata
    const upsertPayload = {
      id: user.id,
      email,
      name: name ?? (user.user_metadata?.name as string | undefined) ?? null,
      wh_id: wh_id ?? null,
      inst: inst ?? null,
    } as const;

    const { error: upsertError } = await admin.from('users').upsert(upsertPayload, { onConflict: 'id' });
    if (upsertError) {
      console.error('users upsert error', upsertError);
      // Do not fail the whole flow if profile upsert fails; still provide the link
    }

    if (mode === 'json') {
      return new Response(
        JSON.stringify({
          ok: true,
          email,
          user_id: user.id,
          action_link: actionLink,
          created: !!user?.created_at,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Default: redirect straight to the magic link so the user just pastes and goes
    return new Response(null, {
      status: 302,
      headers: { Location: actionLink, ...corsHeaders },
    });
  } catch (e) {
    console.error('Unhandled error', e);
    return new Response(JSON.stringify({ error: 'Erro inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
