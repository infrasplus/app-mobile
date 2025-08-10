import React, { createContext, useContext } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  authInitialized: boolean;
  clinicName: string;
  whatsappConnected: boolean;
  showNotificationBanner: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  dismissNotificationBanner: () => void;
}

const MockAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useMockAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
};

export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockValue: AuthContextType = {
    isAuthenticated: true,
    authInitialized: true,
    clinicName: 'Clínica Demo',
    whatsappConnected: true,
    showNotificationBanner: true,
    login: () => false,
    logout: () => {},
    dismissNotificationBanner: () => {},
  };

  return (
    <MockAuthContext.Provider value={mockValue}>
      {children}
    </MockAuthContext.Provider>
  );
};