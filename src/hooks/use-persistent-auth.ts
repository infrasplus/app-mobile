// src/hooks/use-persistent-auth.ts
// Hook para autenticação ETERNA e MULTI-DEVICE

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { persistentStorage, DeviceInfo } from '@/lib/persistent-auth';
import { toast } from 'sonner';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  code: string | null;
  error: string | null;
}

export function usePersistentAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    code: null,
    error: null,
  });
  
  const initRef = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  
  // Inicializar
  const initPersistence = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    
    try {
      await persistentStorage.init();
      console.log('✅ Sistema de persistência pronto');
    } catch (error) {
      console.error('❌ Erro ao iniciar:', error);
    }
  }, []);
  
  // Recuperar sessão
  const recoverSession = useCallback(async () => {
    try {
      // 1. Verificar sessão ativa no Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        console.log('✅ Sessão ativa encontrada');
        await persistentStorage.saveSession(currentSession);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: currentSession.user,
          code: await persistentStorage.getAuthCode(),
          error: null,
        });
        return true;
      }
      
      // 2. Recuperar sessão salva
      const savedSession = await persistentStorage.getSession();
      const savedCode = await persistentStorage.getAuthCode();
      
      if (savedSession?.access_token && savedSession?.refresh_token) {
        console.log('🔄 Restaurando sessão...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: savedSession.access_token,
            refresh_token: savedSession.refresh_token,
          });
          
          if (data?.session) {
            console.log('✅ Sessão restaurada');
            await persistentStorage.saveSession(data.session);
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              user: data.session.user,
              code: savedCode,
              error: null,
            });
            return true;
          }
        } catch (e) {
          console.warn('⚠️ Sessão expirada');
        }
      }
      
      // 3. Se tem código, re-autenticar
      if (savedCode) {
        console.log('🔑 Usando código eterno...');
        const success = await silentReauth(savedCode);
        if (success) return true;
      }
      
      // 4. Verificar URL para nova instalação
      const urlParams = new URLSearchParams(window.location.search);
      const urlCode = urlParams.get('code');
      
      if (urlCode) {
        console.log('🆕 Processando instalação...');
        const success = await handleInstallCode(urlCode);
        if (success) {
          window.history.replaceState({}, '', window.location.pathname);
          return true;
        }
      }
      
      // Não autenticado
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        code: null,
        error: null,
      });
      return false;
      
    } catch (error) {
      console.error('❌ Erro:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        code: null,
        error: 'Erro ao recuperar sessão',
      });
      return false;
    }
  }, []);
  
  // Re-autenticação silenciosa
  const silentReauth = useCallback(async (code: string): Promise<boolean> => {
    try {
      const deviceInfo = DeviceInfo.get();
      
      // Trocar código por OTP
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-link?` + 
        new URLSearchParams({
          flow: 'exchange-install',
          code: code,
          device_info: JSON.stringify(deviceInfo),
        }),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      
      if (!data.ok || !data.email_otp) {
        console.error('❌ Código inválido:', data.error);
        
        if (retryCount.current >= MAX_RETRIES) {
          await persistentStorage.saveAuthCode('');
          toast.error('Código expirado. Por favor, reinstale o app.');
        }
        
        return false;
      }
      
      // Login com OTP
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.email_otp,
        type: 'email',
      });
      
      if (authError || !authData.session) {
        console.error('❌ Erro no login:', authError);
        return false;
      }
      
      // Salvar tudo
      await persistentStorage.saveSession(authData.session);
      await persistentStorage.saveAuthCode(code);
      await persistentStorage.saveUserData(authData.user);
      
      console.log('✅ Re-autenticado com sucesso!');
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: authData.user,
        code: code,
        error: null,
      });
      
      retryCount.current = 0;
      return true;
      
    } catch (error) {
      console.error('❌ Erro na re-autenticação:', error);
      retryCount.current++;
      return false;
    }
  }, []);
  
  // Processar instalação
  const handleInstallCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const deviceInfo = DeviceInfo.get();
      
      // Trocar código por OTP
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-link?` + 
        new URLSearchParams({
          flow: 'exchange-install',
          code: code,
          device_info: JSON.stringify(deviceInfo),
        }),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      
      if (!data.ok || !data.email_otp) {
        toast.error(data.error || 'Código inválido');
        return false;
      }
      
      // Login
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.email_otp,
        type: 'email',
      });
      
      if (authError || !authData.session) {
        toast.error('Erro ao autenticar');
        return false;
      }
      
      // Salvar TUDO
      await persistentStorage.saveSession(authData.session);
      await persistentStorage.saveAuthCode(code);
      await persistentStorage.saveUserData(authData.user);
      
      toast.success('✅ App instalado com sucesso!');
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: authData.user,
        code: code,
        error: null,
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao instalar');
      return false;
    }
  }, []);
  
  // Logout
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await persistentStorage.clearAll();
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        code: null,
        error: null,
      });
      
      toast.success('Logout realizado');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  }, []);
  
  // Verificar auth periodicamente
  const checkAuth = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('🔄 Sessão expirada, recuperando...');
      const recovered = await recoverSession();
      if (!recovered) {
        console.log('⚠️ Não foi possível recuperar');
      }
    }
  }, [authState.isAuthenticated, recoverSession]);
  
  // Setup
  useEffect(() => {
    const setup = async () => {
      await initPersistence();
      await recoverSession();
    };
    
    setup();
    
    // Listener de auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await persistentStorage.saveSession(session);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: session.user,
          }));
        } else if (event === 'SIGNED_OUT') {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            user: null,
          }));
        } else if (event === 'TOKEN_REFRESHED' && session) {
          await persistentStorage.saveSession(session);
        }
      }
    );
    
    // Verificar a cada 5 minutos
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    
    // Quando app volta do background
    const handleVisibilityChange = () => {
      if (!document.hidden && authState.isAuthenticated) {
        checkAuth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Sincronizar quando volta o foco
    const handleFocus = () => {
      persistentStorage.syncStorages();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Mensagem do Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CHECK_AUTH') {
        checkAuth();
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      authListener?.subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);
  
  return {
    ...authState,
    logout,
    recoverSession,
    checkAuth,
  };
}