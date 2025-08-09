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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const clinicName = 'Clínica Exemplo';
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
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
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