import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
  }
}

export function useOneSignal() {
  const initializedRef = useRef(false);

  const init = useCallback(async () => {
    if (initializedRef.current) return;

    // Fetch public app config from Edge Function (reads Supabase secret)
    const res = await fetch('/functions/v1/onesignal-config');
    if (!res.ok) return;
    const { appId } = await res.json();
    if (!appId) return;

    // Ensure OneSignal SDK global exists
    window.OneSignal = window.OneSignal || [];

    window.OneSignal.push(async () => {
      await window.OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        // Use root-scoped service workers created under /public
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

    const { data: { user } } = await supabase.auth.getUser();
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
