import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  clinicName: string;
  whatsappConnected: boolean;
  showNotificationBanner: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  dismissNotificationBanner: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // UI Preview Mode: evita uso de hooks para não conflitar com o ambiente do Lovable
  const IS_UI_PREVIEW = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/ui-preview') ||
    new URLSearchParams(window.location.search).has('uiPreview')
  );

  if (IS_UI_PREVIEW) {
    const previewValue: AuthContextType = {
      isAuthenticated: true,
      clinicName: 'Clínica (Preview)',
      whatsappConnected: false,
      showNotificationBanner: true,
      login: () => false,
      logout: () => {},
      dismissNotificationBanner: () => {},
    };

    return (
      <AuthContext.Provider value={previewValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [clinicName, setClinicName] = useState<string>('');
  const whatsappConnected = Math.random() > 0.5; // Simula conexão aleatória

  useEffect(() => {
    // Banner persisted setting
    const savedBanner = localStorage.getItem('secretaria-plus-banner');
    if (savedBanner === 'dismissed') {
      setShowNotificationBanner(false);
    }

    // IMPORTANT: Set listener first, then get initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      const user = session?.user as any;
      if (user) {
        const raw = user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário';
        const formatted = String(raw).replace(/[._-]/g, ' ').trim();
        setClinicName(formatted);
      } else {
        setClinicName('');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      const user = session?.user as any;
      if (user) {
        const raw = user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário';
        const formatted = String(raw).replace(/[._-]/g, ' ').trim();
        setClinicName(formatted);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Legacy no-op login to keep type compatibility (not used anymore)
  const login = (_email: string, _password: string) => {
    console.warn('Login via tela foi desativado. Use o magic link.');
    return false;
  };

  const logout = () => {
    supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const dismissNotificationBanner = () => {
    setShowNotificationBanner(false);
    localStorage.setItem('secretaria-plus-banner', 'dismissed');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        clinicName,
        whatsappConnected,
        showNotificationBanner,
        login,
        logout,
        dismissNotificationBanner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};