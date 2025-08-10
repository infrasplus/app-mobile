
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  // Ajustamos os headers para incluir x-install-token
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-install-token',
};

// Utilitário simples
function jsonResponse(body: any, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers || corsHeaders) },
  });
}

Deno.serve(async (req) => {
  // CORS dinâmico com base na origem
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = new Set<string>([
    'https://savvy-clinic-connect.lovable.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ]);
  const dynCorsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-install-token',
    'Vary': 'Origin',
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: dynCorsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Parâmetros existentes (mantidos para compatibilidade)
    const email = url.searchParams.get('email');
    const name = url.searchParams.get('name') || undefined;
    const wh_id = url.searchParams.get('wh_id') || undefined;
    const inst = url.searchParams.get('inst') || undefined;

    // redirect_to validado por whitelist
    const rawRedirectTo = url.searchParams.get('redirect_to');
    let redirectTo: string | undefined = undefined;
    if (rawRedirectTo) {
      try {
        const rt = new URL(rawRedirectTo);
        if (allowedOrigins.has(rt.origin)) {
          redirectTo = rt.toString();
        }
      } catch {}
    }

    const mode = url.searchParams.get('mode') || 'redirect'; // 'redirect' | 'json'
    // Novos parâmetros para o fluxo de instalação
    const flow = url.searchParams.get('flow'); // 'create-install' | 'exchange-install'
    const code = url.searchParams.get('code') || undefined;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return jsonResponse({ error: 'Servidor sem configuração do Supabase' }, 500, dynCorsHeaders);
    }

    // Exigir token para create-install quando a origem não for whitelist
    if (flow === 'create-install' && !allowedOrigins.has(origin)) {
      const REQUIRED_TOKEN = Deno.env.get('INSTALL_API_TOKEN') || '';
      const providedToken =
        req.headers.get('x-install-token') ||
        req.headers.get('X-Install-Token') ||
        ''; // compatibilidade

      if (!REQUIRED_TOKEN || providedToken !== REQUIRED_TOKEN) {
        return jsonResponse({ error: 'Unauthorized' }, 401, dynCorsHeaders);
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Fluxo para criar o código de instalação
    if (flow === 'create-install') {
      if (!email) {
        return jsonResponse({ error: 'email é obrigatório' }, 400, dynCorsHeaders);
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });

      if (linkError || !linkData?.user) {
        console.error('generateLink error (create-install)'); // evitando logar dados sensíveis
        return jsonResponse({ error: linkError?.message || 'Falha ao preparar usuário' }, 500, dynCorsHeaders);
      }

      const user = linkData.user;
      const codeToUse = crypto.randomUUID();

      // Upsert perfil público (tabela users) — opcional, mas mantém os metadados sincronizados
      const upsertPayload = {
        id: user.id,
        email,
        name: name ?? (user.user_metadata?.name as string | undefined) ?? null,
        wh_id: wh_id ?? null,
        inst: inst ?? null,
      } as const;

      const { error: upsertError } = await admin.from('users').upsert(upsertPayload, { onConflict: 'id' });
      if (upsertError) {
        console.error('users upsert error (create-install)'); // sem dados sensíveis
      }

      // Cria registro do código de instalação (one-time)
      const metadata: Record<string, unknown> = {};
      if (name) metadata.name = name;
      if (wh_id) metadata.wh_id = wh_id;
      if (inst) metadata.inst = inst;

      // Define TTL curto e uso único
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { error: insertError } = await admin
        .from('auth_install_codes')
        .insert({
          code: codeToUse,
          user_id: user.id,
          email,
          metadata: Object.keys(metadata).length ? metadata : null,
          expires_at: expiresAt,
          max_uses: 1,
        });

      if (insertError) {
        console.error('auth_install_codes insert error'); // sem dados sensíveis
        return jsonResponse({ error: 'Falha ao gerar código de instalação' }, 500, dynCorsHeaders);
      }

      // Retorna o code para o cliente fixar na URL antes de instalar
      return jsonResponse({ ok: true, code: codeToUse, email }, 200, dynCorsHeaders);
    }

    // 2) Fluxo para trocar o código por um email_otp (para login direto no PWA)
    if (flow === 'exchange-install') {
      if (!code) {
        return jsonResponse({ error: 'code é obrigatório' }, 400, dynCorsHeaders);
      }

      // Busca o registro do código
      const { data: rows, error: codeErr } = await admin
        .from('auth_install_codes')
        .select('code, email, user_id, created_at, expires_at, used_at')
        .eq('code', code)
        .limit(1);

      if (codeErr) {
        console.error('select auth_install_codes error');
        return jsonResponse({ error: 'Erro ao validar código' }, 500, dynCorsHeaders);
      }

      const row = rows?.[0];
      if (!row) {
        return jsonResponse({ error: 'Código inválido' }, 400, dynCorsHeaders);
      }
      if (row.used_at) {
        return jsonResponse({ error: 'Código já utilizado' }, 400, dynCorsHeaders);
      }
      if (row.expires_at && new Date(row.expires_at) <= new Date()) {
        return jsonResponse({ error: 'Código expirado' }, 400, dynCorsHeaders);
      }

      // Gera um novo magic link e usa o email_otp retornado para login direto
      const { data: linkData2, error: linkError2 } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: row.email,
        options: { redirectTo },
      });

      const emailOtp = (linkData2?.properties as any)?.email_otp as string | undefined;
      if (linkError2 || !linkData2?.user || !emailOtp) {
        console.error('generateLink error (exchange-install)'); // sem dados sensíveis
        return jsonResponse({ error: linkError2?.message || 'Falha ao gerar OTP' }, 500, dynCorsHeaders);
      }

      // Marca o código como utilizado
      const { error: usedErr } = await admin
        .from('auth_install_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('code', code);

      if (usedErr) {
        console.error('auth_install_codes update used_at error'); // sem dados sensíveis
        // Ainda retornamos o OTP, mas logamos o erro
      }

      return jsonResponse({
        ok: true,
        email: row.email,
        email_otp: emailOtp,
      }, 200, dynCorsHeaders);
    }

    // 3) Comportamento original (mantido): gerar link e redirecionar ou retornar JSON
    if (!email) {
      return jsonResponse({ error: 'email é obrigatório' }, 400, dynCorsHeaders);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });

    const actionLink = linkData?.properties?.action_link as string | undefined;
    if (linkError || !linkData?.user || !actionLink) {
      console.error('generateLink error'); // sem dados sensíveis
      return jsonResponse({ error: linkError?.message || 'Falha ao gerar magic link' }, 500, dynCorsHeaders);
    }

    const user = linkData.user;

    const upsertPayload = {
      id: user.id,
      email,
      name: name ?? (user.user_metadata?.name as string | undefined) ?? null,
      wh_id: wh_id ?? null,
      inst: inst ?? null,
    } as const;

    const { error: upsertError } = await admin.from('users').upsert(upsertPayload, { onConflict: 'id' });
    if (upsertError) {
      console.error('users upsert error'); // sem dados sensíveis
    }

    if (mode === 'json') {
      return jsonResponse({
        ok: true,
        email,
        user_id: user.id,
        action_link: actionLink,
        created: !!user?.created_at,
      }, 200, dynCorsHeaders);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: actionLink, ...dynCorsHeaders },
    });
  } catch (e) {
    console.error('Unhandled error'); // sem dados sensíveis
    return jsonResponse({ error: 'Erro inesperado' }, 500, dynCorsHeaders);
  }
});
