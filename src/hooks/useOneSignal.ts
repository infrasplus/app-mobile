import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

// AppId CORRETO do OneSignal
const ONESIGNAL_APP_ID = 'd8e46df0-d54d-459f-b79d-6e0a36bffdb8';

export function useOneSignal() {
  const initializedRef = useRef(false);
  const subscriptionIdRef = useRef<string | null>(null);

  const init = useCallback(async () => {
    if (initializedRef.current) return;

    try {
      // Garante que o array existe
      window.OneSignalDeferred = window.OneSignalDeferred || [];

      // Carrega o SDK se necessário
      if (!window.OneSignal && !document.querySelector('script[data-onesignal]')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          script.setAttribute('data-onesignal', 'true');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
          document.head.appendChild(script);
        });
      }

      // Inicializa o OneSignal
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          console.log('[OneSignal] Iniciando com appId:', ONESIGNAL_APP_ID);
          
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            // IMPORTANTE: Usar nosso próprio Service Worker
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/' },
            notifyButton: {
              enable: false // Desativa o botão padrão
            }
          });

          // Listener para mudanças na subscription
          OneSignal.User.PushSubscription.addEventListener("change", async (event: any) => {
            console.log('[OneSignal] Push subscription mudou:', event);
            
            if (event.current?.id && event.current.id !== subscriptionIdRef.current) {
              subscriptionIdRef.current = event.current.id;
              console.log('[OneSignal] Novo subscriptionId:', event.current.id);
              
              // Salva no banco automaticamente quando mudar
              await saveSubscriptionToSupabase(event.current.id);
            }
          });

          // Tenta fazer login do usuário se estiver autenticado
          try {
            const { data: userRes } = await supabase.auth.getUser();
            if (userRes?.user) {
              console.log('[OneSignal] Fazendo login do usuário:', userRes.user.id);
              await OneSignal.login(userRes.user.id);
            }
          } catch (e) {
            console.warn('[OneSignal] Login opcional falhou:', e);
          }

          initializedRef.current = true;
          console.log('[OneSignal] Inicialização completa');
        } catch (e) {
          console.error('[OneSignal] Erro na inicialização:', e);
        }
      });
    } catch (e) {
      console.error('[OneSignal] Erro ao carregar SDK:', e);
    }
  }, []);

  // Salva a subscription no Supabase
  const saveSubscriptionToSupabase = async (subscriptionId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        console.warn('[OneSignal] Usuário não autenticado, não salvando subscription');
        return;
      }

      const platform = /Mobile|Android|iP(ad|hone|od)/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      const device_os = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS' : 
                        /Android/.test(navigator.userAgent) ? 'Android' : 
                        'Desktop';
      const browser = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? 'Safari' :
                      /Chrome/.test(navigator.userAgent) ? 'Chrome' :
                      'Other';

      console.log('[OneSignal] Salvando subscription no Supabase:', {
        subscriptionId,
        userId: session.session.user.id,
        platform,
        device_os,
        browser
      });

      const { data, error } = await supabase
        .from('user_push_subscriptions')
        .upsert(
          {
            onesignal_player_id: subscriptionId,
            user_id: session.session.user.id,
            platform,
            device_os,
            browser,
            subscribed: true,
            last_seen_at: new Date().toISOString(),
          },
          { 
            onConflict: 'onesignal_player_id',
            ignoreDuplicates: false 
          }
        )
        .select();

      if (error) {
        console.error('[OneSignal] Erro ao salvar subscription:', error);
        throw error;
      }

      console.log('[OneSignal] Subscription salva com sucesso:', data);
    } catch (e) {
      console.error('[OneSignal] Erro ao salvar no Supabase:', e);
    }
  };

  // Solicita permissão e aguarda o subscriptionId
  const requestPushPermission = useCallback(async () => {
    console.log('[OneSignal] Solicitando permissão de push...');
    
    // Inicializa se necessário
    if (!initializedRef.current) {
      await init();
      // Aguarda um pouco para garantir que está pronto
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!window.OneSignal) {
      throw new Error('OneSignal SDK não carregado');
    }

    try {
      // Verifica sessão do usuário
      const { data: sessRes } = await supabase.auth.getSession();
      if (!sessRes?.session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Solicita permissão nativa primeiro
      let permission = Notification.permission;
      console.log('[OneSignal] Permissão atual:', permission);

      if (permission === 'default') {
        // No iOS Safari PWA, isso vai pedir permissão
        permission = await Notification.requestPermission();
        console.log('[OneSignal] Nova permissão:', permission);
      }

      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada');
      }

      // Agora garante que o OneSignal está inscrito
      const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
      console.log('[OneSignal] Já inscrito?', isSubscribed);

      if (!isSubscribed) {
        console.log('[OneSignal] Inscrevendo no OneSignal...');
        await window.OneSignal.User.PushSubscription.optIn();
      }

      // Aguarda o subscriptionId ficar disponível (com timeout de 15 segundos)
      console.log('[OneSignal] Aguardando subscriptionId...');
      const startTime = Date.now();
      const timeout = 15000; // 15 segundos
      
      while (Date.now() - startTime < timeout) {
        // Tenta várias formas de obter o ID
        let id = null;
        
        // Método 1: Direto do User.PushSubscription
        try {
          id = window.OneSignal.User.PushSubscription.id;
          if (id) {
            console.log('[OneSignal] ID obtido via User.PushSubscription.id:', id);
          }
        } catch (e) {
          console.warn('[OneSignal] Erro ao obter ID via User.PushSubscription:', e);
        }
        
        // Método 2: Via getIdAsync (novo no v16)
        if (!id && window.OneSignal.User?.PushSubscription?.getIdAsync) {
          try {
            id = await window.OneSignal.User.PushSubscription.getIdAsync();
            if (id) {
              console.log('[OneSignal] ID obtido via getIdAsync:', id);
            }
          } catch (e) {
            console.warn('[OneSignal] Erro ao obter ID via getIdAsync:', e);
          }
        }
        
        // Método 3: Via User.onesignalId
        if (!id && window.OneSignal.User?.onesignalId) {
          try {
            id = window.OneSignal.User.onesignalId;
            if (id) {
              console.log('[OneSignal] ID obtido via User.onesignalId:', id);
            }
          } catch (e) {
            console.warn('[OneSignal] Erro ao obter ID via onesignalId:', e);
          }
        }

        if (id) {
          subscriptionIdRef.current = id;
          console.log('[OneSignal] SubscriptionId obtido com sucesso:', id);
          
          // Salva no Supabase
          await saveSubscriptionToSupabase(id);
          
          return id;
        }

        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Se chegou aqui, timeout
      console.error('[OneSignal] Timeout ao aguardar subscriptionId');
      
      // Tenta uma última vez de forma síncrona
      const finalId = window.OneSignal.User?.PushSubscription?.id || 
                     window.OneSignal.User?.onesignalId;
      
      if (finalId) {
        subscriptionIdRef.current = finalId;
        await saveSubscriptionToSupabase(finalId);
        return finalId;
      }

      throw new Error('Não foi possível obter o ID de inscrição após 15 segundos');
    } catch (e) {
      console.error('[OneSignal] Erro ao solicitar permissão:', e);
      throw e;
    }
  }, [init]);

  // Inicializa automaticamente quando o hook é usado
  useEffect(() => {
    init();
  }, [init]);

  return { 
    requestPushPermission, 
    isReady: () => initializedRef.current,
    getSubscriptionId: () => subscriptionIdRef.current
  };
}