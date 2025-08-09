import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
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
}

export function useOneSignal() {
  const initializedRef = useRef(false);

  const init = useCallback(async () => {
    if (initializedRef.current) return;

    // Fetch public app config from Edge Function (uses Supabase secret)
    const { data, error } = await supabase.functions.invoke('onesignal-config');
    if (error) return;
    const appId = (data as any)?.appId as string | undefined;
    if (!appId) return;

    await loadOneSignalSDK();

    // Ensure OneSignal global queue exists
    window.OneSignal = window.OneSignal || [];

    window.OneSignal.push(async () => {
      await window.OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        // If you keep the default filenames at the app root, the SDK will find them automatically.
        // Keeping explicit paths for clarity.
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      });
    });

    initializedRef.current = true;
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const requestPushPermission = useCallback(async () => {
    await init();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error('Usuário não autenticado.');

    return new Promise<string>((resolve, reject) => {
      try {
        window.OneSignal.push(async () => {
          try {
            // Ask permission via OneSignal API (v16 compatible)
            const permission: 'granted' | 'denied' | 'default' = await (window.OneSignal?.Notifications?.requestPermission?.() ?? Promise.resolve('default'));
            if (permission !== 'granted') {
              return reject(new Error('Permissão de notificação não concedida.'));
            }

            // Get OneSignal Player ID across SDK versions
            let playerId: string | null = null;
            if (window.OneSignal?.User?.getId) {
              playerId = await window.OneSignal.User.getId();
            } else if (window.OneSignal?.getUserId) {
              playerId = await window.OneSignal.getUserId();
            }

            if (!playerId) return reject(new Error('Não foi possível obter o ID do dispositivo.'));

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

            resolve(playerId);
          } catch (err) {
            reject(err as Error);
          }
        });
      } catch (err) {
        reject(err as Error);
      }
    });
  }, [init]);

  return { requestPushPermission };
}
