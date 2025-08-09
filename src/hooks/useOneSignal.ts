import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

async function loadOneSignalSDK() {
  if (window.OneSignal) return;
  if (document.querySelector('script[data-onesignal]')) {
    return new Promise<void>((resolve) => {
      (document.querySelector('script[data-onesignal]') as HTMLScriptElement)
        .addEventListener('load', () => resolve());
    });
  }
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.setAttribute('data-onesignal', 'true');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
    document.head.appendChild(s);
  });
  window.OneSignalDeferred = window.OneSignalDeferred || [];
}

export function useOneSignal() {
  const initializedRef = useRef(false);

  const init = useCallback(async () => {
    if (initializedRef.current) return;

    // Busca appId em Edge Function (usa secret do Supabase)
    const { data, error } = await supabase.functions.invoke('onesignal-config');
    if (error) {
      console.error('OneSignal config error:', error);
      return;
    }
    const appId = (data as any)?.appId as string | undefined;
    if (!appId) {
      console.error('OneSignal appId missing from config');
      return;
    }

    await loadOneSignalSDK();

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          // usa nosso SW raiz, já registrado
          serviceWorkerPath: '/sw.js',
          serviceWorkerParam: { scope: '/' },
        });

        // Vincula a identidade (opcional, útil no futuro)
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const user = userRes?.user;
          if (user && OneSignal?.login) {
            await OneSignal.login(user.id);
          }
        } catch (e) {
          console.warn('OneSignal login skipped:', e);
        }

        initializedRef.current = true;
      } catch (e) {
        console.error('OneSignal init failed:', e);
      }
    });
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const waitUntilReady = useCallback(async (timeoutMs = 5000) => {
    const start = Date.now();
    while (!initializedRef.current && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return initializedRef.current;
  }, []);

  // Chamar dentro do onClick do botão "Ativar Agora"
  const requestPushPermission = useCallback(async () => {
    await init();
    const ready = await waitUntilReady();
    if (!ready) throw new Error('OneSignal não ficou pronto a tempo.');

    // Garante sessão válida (evita RLS bloquear)
    const { data: sessRes } = await supabase.auth.getSession();
    const session = sessRes?.session;
    if (!session?.user) throw new Error('Usuário não autenticado.');

    // Pede permissão (dentro do gesto do usuário)
    let permission: NotificationPermission =
      typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (permission !== 'granted') {
      permission = await (window.OneSignal?.Notifications?.requestPermission?.() ?? Promise.resolve('default'));
    }
    if (permission !== 'granted') {
      throw new Error('Permissão de notificação não concedida.');
    }

    // Garante inscrição ativa
    try {
      const isSubscribed = await (window.OneSignal?.Notifications?.isSubscribed?.() ?? Promise.resolve(false));
      if (!isSubscribed) {
        await window.OneSignal?.Notifications?.subscribe?.();
      }
    } catch (e) {
      console.warn('Subscribe call failed or unavailable:', e);
    }

    // ===== Captura do subscriptionId (ID real usado no push) =====
    let subscriptionId: string | null =
      window.OneSignal?.User?.pushSubscription?.id ?? null;

    // Fallbacks (SDKs/legado)
    if (!subscriptionId && window.OneSignal?.getSubscriptionId) {
      try { subscriptionId = await window.OneSignal.getSubscriptionId(); } catch {}
    }
    if (!subscriptionId && window.OneSignal?.getPlayerId) {
      try { subscriptionId = await window.OneSignal.getPlayerId(); } catch {}
    }

    // Poll curto (até 8s) porque o ID pode demorar a ficar disponível
    if (!subscriptionId) {
      const deadline = Date.now() + 8000;
      while (!subscriptionId && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          subscriptionId =
            window.OneSignal?.User?.pushSubscription?.id ??
            (window.OneSignal?.getSubscriptionId ? await window.OneSignal.getSubscriptionId() : null) ??
            (window.OneSignal?.getPlayerId ? await window.OneSignal.getPlayerId() : null);
        } catch {}
      }
    }

    if (!subscriptionId) {
      throw new Error('Não foi possível obter o ID de inscrição (subscriptionId).');
    }

    // Metadados simples do dispositivo
    const platform = /Mobile|Android|iP(ad|hone|od)/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const device_os = (navigator as any)?.platform ?? null;
    const browser = navigator.userAgent;

    // Upsert no Supabase (RLS: auth.uid() = user_id)
    const { error } = await supabase
      .from('user_push_subscriptions')
      .upsert(
        {
          onesignal_player_id: subscriptionId,
          user_id: session.user.id,
          platform,
          device_os,
          browser,
          subscribed: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'onesignal_player_id' }
      );

    if (error) {
      console.error('[push] upsert error:', error);
      throw error;
    }

    return subscriptionId;
  }, [init, waitUntilReady]);

  return { requestPushPermission, isReady: () => initializedRef.current };
}
