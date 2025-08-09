
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const FUNCTION_URL = "https://yattgeryizsliduybfxn.supabase.co/functions/v1/generate-link";
const STORAGE_KEY = "install_code";

function isStandalone() {
  const iosStandalone = (window as any).navigator?.standalone === true;
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  return iosStandalone || mqStandalone;
}

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const exchangingRef = useRef(false);

  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const ios = isIOS();

  // Mantém o estado de instalação atualizado (iOS/Android)
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const update = () => setInstalled(isStandalone());
    update();
    mq?.addEventListener?.('change', update);
    window.addEventListener('focus', update);
    return () => {
      mq?.removeEventListener?.('change', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const existingCode = params.get('code');
    const email = params.get('email');
    const name = params.get('name') || undefined;
    const wh_id = params.get('wh_id') || undefined;
    const inst = params.get('inst') || undefined;

    // 1) Se já está instalado e há um code, fazemos a troca por OTP e logamos
    if (installed && existingCode && !exchangingRef.current) {
      exchangingRef.current = true;
      setStatus('Ativando seu acesso...');
      const url = new URL(FUNCTION_URL);
      url.searchParams.set('flow', 'exchange-install');
      url.searchParams.set('code', existingCode);

       supabase.functions
        .invoke('generate-link?' + new URLSearchParams({
          flow: 'exchange-install',
          code: existingCode,
        }).toString(), { body: {} })
        .then(({ data, error }) => {
          if (error || !data?.ok || !(data as any)?.email || !(data as any)?.email_otp) {
            throw new Error((error as any)?.message || (data as any)?.error || 'Falha ao obter OTP');
          }
          return supabase.auth.verifyOtp({
            email: (data as any).email as string,
            token: (data as any).email_otp as string,
            type: 'magiclink',
          });
        })
        .then(({ error }) => {
          if (error) throw error;
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          setStatus('Acesso ativado! Redirecionando...');
          setTimeout(() => navigate('/'), 500);
        })
        .catch((e: any) => {
          console.error('exchange-install error', e);
          setError(e?.message || 'Não foi possível ativar seu acesso.');
          setStatus('');
        });

      return;
    }

    // 2) Se NÃO está instalado e ainda não temos code: cria o code e fixa na URL
    if (!installed && !existingCode) {
      if (!email) {
        setError('Parâmetro "email" é obrigatório para preparar a instalação.');
        return;
      }

      setStatus('Preparando instalação...');
      const url = new URL(FUNCTION_URL);
      url.searchParams.set('flow', 'create-install');
      url.searchParams.set('email', email);
      if (name) url.searchParams.set('name', name);
      if (wh_id) url.searchParams.set('wh_id', String(wh_id));
      if (inst) url.searchParams.set('inst', String(inst));
      // Garantir um redirect_to coerente (usado internamente caso necessário)
      url.searchParams.set('redirect_to', `${window.location.origin}/`);

       supabase.functions
        .invoke('generate-link?' + url.searchParams.toString(), { body: {} })
        .then(({ data, error }) => {
          if (error || !data?.ok || !(data as any)?.code) throw new Error((error as any)?.message || (data as any)?.error || 'Falha ao gerar code');
          return (data as any).code as string;
        })
        .then((newCode) => {
          setCode(newCode);
          // Fixa /setup?code=... na URL — assim o atalho abrirá exatamente aqui
          const newUrl = `${window.location.origin}/setup?code=${encodeURIComponent(newCode)}`;
          window.location.replace(newUrl);
          try { localStorage.setItem(STORAGE_KEY, newCode); } catch {}
          setStatus('Quase lá! Adicione o app à Tela Inicial.');
        })
        .catch((e: any) => {
          console.error('create-install error', e);
          setError(e?.message || 'Falha ao preparar instalação.');
          setStatus('');
        });

      return;
    }

    // 3) Se não está instalado e já existe code na URL, apenas instrui o usuário a instalar
    if (!installed && existingCode) {
      setCode(existingCode);
      try { localStorage.setItem(STORAGE_KEY, existingCode); } catch {}
      setStatus('Quase lá! Adicione o app à Tela Inicial.');
      return;
    }

    // 4) Se está instalado mas não há code: tenta usar o salvo no localStorage como fallback
    if (installed && !existingCode) {
      const stored = (() => {
        try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
      })();
      if (stored && !exchangingRef.current) {
        exchangingRef.current = true;
        setStatus('Ativando seu acesso...');
        const url = new URL(FUNCTION_URL);
        url.searchParams.set('flow', 'exchange-install');
        url.searchParams.set('code', stored);

         supabase.functions
          .invoke('generate-link?' + new URLSearchParams({
            flow: 'exchange-install',
            code: stored,
          }).toString(), { body: {} })
          .then(({ data, error }) => {
            if (error || !data?.ok || !(data as any)?.email || !(data as any)?.email_otp) {
              throw new Error((error as any)?.message || (data as any)?.error || 'Falha ao obter OTP');
            }
            return supabase.auth.verifyOtp({
              email: (data as any).email as string,
              token: (data as any).email_otp as string,
              type: 'magiclink',
            });
          })
          .then(({ error }) => {
            if (error) throw error;
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            setStatus('Acesso ativado! Redirecionando...');
            setTimeout(() => navigate('/'), 500);
          })
          .catch((e: any) => {
            console.error('exchange-install (stored) error', e);
            setError(e?.message || 'Não foi possível ativar seu acesso.');
            setStatus('');
          });

        return;
      }

      setStatus('');
      setError('Instalado, mas sem código de ativação. Abra novamente o link de configuração para concluir.');
      return;
    }
  }, [installed, navigate]);

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
                <p className="text-sm text-muted-foreground mt-1">
                  {installed
                    ? 'Estamos validando seu dispositivo para habilitar o acesso.'
                    : 'Para receber notificações e ter uma experiência completa, adicione o app à Tela Inicial.'}
                </p>

                {!installed && (
                  <div className="mt-3">
                    {ios ? (
                      <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Toque em Compartilhar no Safari.</li>
                        <li>Escolha "Adicionar à Tela de Início".</li>
                        <li>Abra o app pelo atalho criado.</li>
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No Chrome, abra o menu ⋮ e toque em "Adicionar à tela inicial". Depois, abra pelo atalho.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{status || 'Aguardando…'}</span>
              </div>
              {code && !installed && (
                <p className="mt-2 break-all">
                  Código de ativação preparado.
                </p>
              )}
            </div>

            {!installed && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Verificar instalação
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h2 className="text-base font-semibold">Não foi possível continuar</h2>
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
