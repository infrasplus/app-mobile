const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const appId = Deno.env.get('ONESIGNAL_APP_ID') ?? '';

  return new Response(
    JSON.stringify({ appId }),
    { headers: { 'content-type': 'application/json', ...corsHeaders } }
  );
});
