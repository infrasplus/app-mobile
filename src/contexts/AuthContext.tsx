import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const clinicName = "Dra. Aline Bianchi";
  const whatsappConnected = Math.random() > 0.5; // Simula conexão aleatória

  useEffect(() => {
    const savedAuth = localStorage.getItem('secretaria-plus-auth');
    const savedBanner = localStorage.getItem('secretaria-plus-banner');
    
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    if (savedBanner === 'dismissed') {
      setShowNotificationBanner(false);
    }
  }, []);

  const login = (email: string, password: string) => {
    // Dados fake para teste
    if (email === 'admin@clinica.com' && password === '123456') {
      setIsAuthenticated(true);
      localStorage.setItem('secretaria-plus-auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('secretaria-plus-auth');
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