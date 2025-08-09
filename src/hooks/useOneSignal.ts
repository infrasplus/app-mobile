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
  if (document.querySelector('script[data-onesignal]')) return new Promise<void>((resolve) => {
    (document.querySelector('script[data-onesignal]') as HTMLScriptElement).addEventListener('load', () => resolve());
  });
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.setAttribute('data-onesignal', 'true');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
    document.head.appendChild(s);
  });
  // Ensure Deferred queue exists for v16
  window.OneSignalDeferred = window.OneSignalDeferred || [];
}

export function useOneSignal() {
  const initializedRef = useRef(false);

const init = useCallback(async () => {
  if (initializedRef.current) return;

  // Fetch public app config from Edge Function (uses Supabase secret)
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

  // Use OneSignalDeferred (v16)
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        // Keep explicit paths for clarity.
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      });

      // Attempt to link user identity (optional but recommended)
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

  const waitUntilReady = useCallback(async (timeoutMs = 8000) => {
    const start = Date.now();
    while (!initializedRef.current && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return initializedRef.current;
  }, []);

const requestPushPermission = useCallback(async () => {
  // Ensure SDK is initialized BEFORE asking permission (important for iOS user-gesture requirements)
  await init();
  const ready = await waitUntilReady();
  if (!ready) throw new Error('OneSignal não ficou pronto a tempo.');

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) throw new Error('Usuário não autenticado.');

  // Ask permission directly (no queue) within the click call stack
  let permission: 'granted' | 'denied' | 'default' = (typeof Notification !== 'undefined' ? (Notification.permission as any) : 'default');
  if (permission !== 'granted') {
    permission = await (window.OneSignal?.Notifications?.requestPermission?.() ?? Promise.resolve('default'));
  }
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação não concedida.');
  }

  // Ensure user is subscribed
  try {
    const isSubscribed = await (window.OneSignal?.Notifications?.isSubscribed?.() ?? Promise.resolve(false));
    if (!isSubscribed) {
      await window.OneSignal?.Notifications?.subscribe?.();
    }
  } catch (e) {
    console.warn('Subscribe call failed or unavailable:', e);
  }

  // Get OneSignal ID (userId / legacy playerId)
  let playerId: string | null = null;
  try {
    if (window.OneSignal?.User?.getId) {
      playerId = await window.OneSignal.User.getId();
    }
  } catch {}
  if (!playerId && window.OneSignal?.getUserId) {
    try { playerId = await window.OneSignal.getUserId(); } catch {}
  }

  // Short polling (up to 4s) to allow ID to become available
  if (!playerId) {
    const start = Date.now();
    while (!playerId && Date.now() - start < 4000) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        if (window.OneSignal?.User?.getId) {
          playerId = await window.OneSignal.User.getId();
        } else if (window.OneSignal?.getUserId) {
          playerId = await window.OneSignal.getUserId();
        }
      } catch {}
    }
  }

  if (!playerId) throw new Error('Não foi possível obter o ID do dispositivo.');

  const platform = /Mobile|Android|iP(ad|hone|od)/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const device_os = (navigator as any)?.platform ?? null;
  const browser = navigator.userAgent;

  const { error } = await supabase
    .from('user_push_subscriptions')
    .upsert(
      {
        onesignal_player_id: playerId,
        user_id: user.id,
        platform,
        device_os,
        browser,
        subscribed: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'onesignal_player_id' }
    );

  if (error) throw error;

  return playerId;
}, [init, waitUntilReady]);

  return { requestPushPermission, isReady: () => initializedRef.current };
}