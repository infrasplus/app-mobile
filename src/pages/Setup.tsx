
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { persistAuthBackup } from '@/lib/auth-persist';

/**
 * Fluxo:
 * - Safari abre /setup?email=...&name=...&wh_id=...&inst=...
 *   -> chama generate-link (flow=create-install) -> recebe { code }
 *   -> salva {code,ts} no CacheStorage ('install-bridge' => '/__install_code')
 *   -> troca URL pra /setup?code=...
 *   -> usuário adiciona à tela inicial
 * - PWA abre /setup (sem ?code) -> busca no CacheStorage -> se achar {code}
 *   -> chama generate-link (flow=exchange-install) -> recebe { email, email_otp }
 *   -> supabase.auth.verifyOtp(...) -> sucesso -> limpa cache/cookie/LS -> navega '/'
 */

const FUNCTION_NAME = 'generate-link';
const STORAGE_KEY = 'install_code'; // fallback leve
const COOKIE_KEY = 'install_code';  // fallback leve
const CACHE_NAME = 'install-bridge';
const CACHE_REQ = '/__install_code';

/** Helpers básicos de cookie (fallback) */
function setCookie(name: string, value: string, minutes = 30) {
  const expires = new Date(Date.now() + minutes * 60_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
}
function getCookie(name: string): string | null {
  try {
    const parts = (document.cookie || '').split('; ');
    for (const part of parts) {
      const [k, ...rest] = part.split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return null;
  } catch {
    return null;
  }
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; SameSite=Lax`;
}

/** Ponte via Cache Storage */
async function writeInstallCodeToCache(code: string) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const payload = { code, ts: Date.now() };
    await cache.put(CACHE_REQ, new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    }));
  } catch {}
}
async function readAndConsumeInstallCodeFromCache(maxAgeMs = 10 * 60 * 1000): Promise<string | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(CACHE_REQ);
    if (!res) return null;
    const { code, ts } = await res.json();
    await cache.delete(CACHE_REQ);
    if (!code) return null;
    if (typeof ts === 'number' && Date.now() - ts > maxAgeMs) return null;
    return String(code);
  } catch {
    return null;
  }
}

/** Detectar se está em standalone (PWA) */
function useIsInstalled() {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const check = () =>
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      // iOS fallback:
      (typeof (navigator as any).standalone !== 'undefined' && (navigator as any).standalone === true);
    setInstalled(check());
    const handler = () => setInstalled(check());
    window.addEventListener('visibilitychange', handler);
    return () => window.removeEventListener('visibilitychange', handler);
  }, []);
  return installed;
}

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const installed = useIsInstalled();
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [code, setCode] = useState<string | null>(null);
  const exchangingRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const existingCode = params.get('code');

  const { isReady } = useOneSignal();
  const extendUntilPushReady = async (timeoutMs = 10000) => {
    const phrases = [
      'Configurando seu Aplicativo.',
      'Puxando seus dados',
      'Só um minutinho...',
      'Quase lá'
    ];
    let i = 0;
    setStatus(phrases[0]);
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setStatus(phrases[i]);
    }, 2000);
    const start = Date.now();
    try {
      while (!isReady() && Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      clearInterval(interval);
    }
  };

  // Troca code -> OTP -> login
  const exchangeInstall = async (theCode: string) => {
    // Chama edge function para gerar email + email_otp (flow=exchange-install)
    const search = new URLSearchParams({
      flow: 'exchange-install',
      code: theCode,
    }).toString();

    const { data, error } = await supabase.functions.invoke(`${FUNCTION_NAME}?${search}`, { body: {} });
    if (error || !data?.ok || !(data as any)?.email || !(data as any)?.email_otp) {
      throw new Error((error as any)?.message || (data as any)?.error || 'Falha ao trocar code por OTP');
    }

    const email = (data as any).email as string;
    const token = (data as any).email_otp as string;

    // Conclui o login no Supabase
    const { error: vErr } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' });
    if (vErr) throw vErr;

    // Aguarda a sessão persistir localmente antes de seguir
    try {
      for (let i = 0; i < 40; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {}

    // Backup dos tokens para resiliência em iOS PWA
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await persistAuthBackup(session);
    } catch {}

  };

  useEffect(() => {
    (async () => {
      setError('');
      // Caso 1: Já instalado E já veio com ?code=...
      if (installed && existingCode && !exchangingRef.current) {
        try {
          exchangingRef.current = true;
          setStatus('Ativando seu acesso...');
          await exchangeInstall(existingCode);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          try { deleteCookie(COOKIE_KEY); } catch {}
          await extendUntilPushReady(10000);
          navigate('/');
          return;
        } catch (e: any) {
          console.error('exchange (installed + existingCode) error', e);
          setError(e?.message || 'Não foi possível ativar seu acesso.');
          setStatus('');
          return;
        }
      }

      // Caso 2: NÃO instalado E sem code -> criar code e fixar URL + gravar na ponte (Cache Storage)
      if (!installed && !existingCode) {
        const email = params.get('email');
        const name = params.get('name') || undefined;
        const wh_id = params.get('wh_id') || undefined;
        const inst = params.get('inst') || undefined;

        if (!email) {
          setError('Parâmetro "email" é obrigatório para preparar a instalação.');
          return;
        }

        try {
          setStatus('Preparando instalação...');
          const s = new URLSearchParams({ flow: 'create-install', email });
          if (name) s.set('name', name);
          if (wh_id) s.set('wh_id', String(wh_id));
          if (inst) s.set('inst', String(inst));
          s.set('redirect_to', `${window.location.origin}/`);

          const { data, error } = await supabase.functions.invoke(`${FUNCTION_NAME}?${s.toString()}`, { body: {} });
          if (error || !data?.ok || !(data as any)?.code) {
            throw new Error((error as any)?.message || (data as any)?.error || 'Falha ao gerar code');
          }

          const newCode = (data as any).code as string;
          setCode(newCode);

          // PONTE: grava no Cache Storage (principal)
          await writeInstallCodeToCache(newCode);

          // Fallbacks leves
          try { setCookie(COOKIE_KEY, newCode, 30); } catch {}
          try { localStorage.setItem(STORAGE_KEY, newCode); } catch {}

          // Fixa URL com code para facilitar reabertura no Safari também
          const newUrl = `${window.location.origin}/setup?code=${encodeURIComponent(newCode)}`;
          window.location.replace(newUrl);
          return;
        } catch (e: any) {
          console.error('create-install error', e);
          setError(e?.message || 'Não foi possível preparar a instalação.');
          setStatus('');
          return;
        }
      }

      // Caso 3: Instalado, mas sem ?code=... -> buscar na PONTE (CacheStorage) primeiro
      if (installed && !existingCode && !exchangingRef.current) {
        try {
          setStatus('Verificando dados de ativação…');
          // Ordem: CacheStorage (principal) -> cookie -> localStorage
          const fromCache = await readAndConsumeInstallCodeFromCache();
          const candidate =
            fromCache ||
            (() => { try { return getCookie(COOKIE_KEY); } catch { return null; } })() ||
            (() => { try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; } })();

          if (candidate) {
            exchangingRef.current = true;
            setStatus('Ativando seu acesso...');
            await exchangeInstall(candidate);
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            try { deleteCookie(COOKIE_KEY); } catch {}
            await extendUntilPushReady(10000);
            navigate('/');
            return;
          }

          // Nada encontrado
          setStatus('');
          setError('Instalado, mas sem código de ativação. Abra novamente o link de configuração para concluir.');
          return;
        } catch (e: any) {
          console.error('exchange (installed no code) error', e);
          setError(e?.message || 'Não foi possível ativar seu acesso.');
          setStatus('');
          return;
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
        {!error ? (
          <>
            <div className="flex items-start gap-3">
              {installed ? (
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div className="flex-1">
                <h1 className="text-lg font-semibold">
                  {installed ? 'Ativando acesso…' : 'Instalar SecretáriaPlus'}
                </h1>
                {!installed ? (
                  <p className="text-sm text-muted-foreground">
                    Toque em <b>Compartilhar</b> no Safari e depois <b>Adicionar à Tela de Início</b>. Ao abrir pelo atalho, o acesso será ativado automaticamente.
                  </p>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{status || 'Aguardando…'}</span>
                    </div>
                  </div>
                )}
                {code && !installed && (
                  <p className="mt-2 break-all text-xs">
                    Código de ativação preparado.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">Ops</h2>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
              <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setup;
